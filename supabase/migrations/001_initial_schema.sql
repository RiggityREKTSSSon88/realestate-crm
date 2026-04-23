-- ============================================================
-- Real Estate CRM — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- AGENCIES
-- ============================================================
create table public.agencies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  subscription_plan text not null default 'trial' check (subscription_plan in ('trial', 'starter', 'professional', 'enterprise')),
  subscription_status text not null default 'active' check (subscription_status in ('active', 'past_due', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.agencies enable row level security;

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'agent' check (role in ('super_admin', 'admin', 'agent')),
  agency_id uuid references public.agencies(id) on delete cascade,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- ============================================================
-- CONTACTS
-- ============================================================
create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  type text not null default 'buyer' check (type in ('buyer', 'vendor', 'tenant', 'landlord')),
  status text not null default 'cold' check (status in ('cold', 'warm', 'hot')),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Duplicate prevention: unique email per agency (nullable)
  constraint contacts_email_agency_unique unique nulls not distinct (agency_id, email),
  -- Duplicate prevention: unique phone per agency (nullable)
  constraint contacts_phone_agency_unique unique nulls not distinct (agency_id, phone)
);

alter table public.contacts enable row level security;

create index contacts_agency_id_idx on public.contacts(agency_id);
create index contacts_created_by_idx on public.contacts(created_by);
create index contacts_status_idx on public.contacts(status);
create index contacts_type_idx on public.contacts(type);

-- ============================================================
-- PROPERTIES
-- ============================================================
create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  address text not null,
  suburb text not null,
  state text not null,
  postcode text not null,
  bedrooms integer,
  bathrooms integer,
  parking integer,
  land_size numeric,
  property_type text not null default 'house' check (property_type in ('house', 'unit', 'townhouse', 'land', 'commercial', 'rural')),
  status text not null default 'appraisal' check (status in ('appraisal', 'listed', 'under_offer', 'sold', 'leased', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.properties enable row level security;

create index properties_agency_id_idx on public.properties(agency_id);
create index properties_suburb_idx on public.properties(suburb);
create index properties_status_idx on public.properties(status);

-- ============================================================
-- APPRAISALS
-- ============================================================
create table public.appraisals (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  appraised_by uuid references public.users(id) on delete set null,
  appraisal_date date not null default current_date,
  estimated_value_low numeric,
  estimated_value_high numeric,
  status text not null default 'warm' check (status in ('hot', 'warm', 'cold')),
  notes text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appraisals enable row level security;

create index appraisals_agency_id_idx on public.appraisals(agency_id);
create index appraisals_contact_id_idx on public.appraisals(contact_id);
create index appraisals_property_id_idx on public.appraisals(property_id);
create index appraisals_appraised_by_idx on public.appraisals(appraised_by);

-- ============================================================
-- LISTINGS
-- ============================================================
create table public.listings (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  listed_by uuid references public.users(id) on delete set null,
  list_price numeric,
  list_date date not null default current_date,
  days_on_market integer,
  status text not null default 'active' check (status in ('active', 'under_offer', 'sold', 'withdrawn', 'leased')),
  marketing_budget numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings enable row level security;

create index listings_agency_id_idx on public.listings(agency_id);
create index listings_property_id_idx on public.listings(property_id);
create index listings_status_idx on public.listings(status);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  assigned_to uuid references public.users(id) on delete set null,
  related_contact_id uuid references public.contacts(id) on delete set null,
  related_property_id uuid references public.properties(id) on delete set null,
  title text not null,
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create index tasks_agency_id_idx on public.tasks(agency_id);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_completed_idx on public.tasks(completed);

-- ============================================================
-- COMMUNICATIONS
-- ============================================================
create table public.communications (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  type text not null check (type in ('email', 'sms', 'call', 'note')),
  subject text,
  body text,
  sent_by uuid references public.users(id) on delete set null,
  sent_at timestamptz not null default now()
);

alter table public.communications enable row level security;

create index communications_agency_id_idx on public.communications(agency_id);
create index communications_contact_id_idx on public.communications(contact_id);
create index communications_sent_at_idx on public.communications(sent_at desc);

-- ============================================================
-- OPEN HOMES
-- ============================================================
create table public.open_homes (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  scheduled_at timestamptz not null,
  attendees jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.open_homes enable row level security;

create index open_homes_agency_id_idx on public.open_homes(agency_id);
create index open_homes_listing_id_idx on public.open_homes(listing_id);
create index open_homes_scheduled_at_idx on public.open_homes(scheduled_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.handle_updated_at();

create trigger properties_updated_at before update on public.properties
  for each row execute function public.handle_updated_at();

create trigger appraisals_updated_at before update on public.appraisals
  for each row execute function public.handle_updated_at();

create trigger listings_updated_at before update on public.listings
  for each row execute function public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- AUTO-GENERATE FOLLOW-UP TASK 3 DAYS AFTER APPRAISAL
-- ============================================================
create or replace function public.handle_new_appraisal()
returns trigger as $$
begin
  insert into public.tasks (agency_id, assigned_to, related_contact_id, related_property_id, title, due_date)
  values (
    new.agency_id,
    new.appraised_by,
    new.contact_id,
    new.property_id,
    'Follow up appraisal',
    current_date + interval '3 days'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_appraisal_created
  after insert on public.appraisals
  for each row execute function public.handle_new_appraisal();

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function: get current user's agency_id
create or replace function public.get_my_agency_id()
returns uuid as $$
  select agency_id from public.users where id = auth.uid();
$$ language sql security definer stable;

-- Helper function: get current user's role
create or replace function public.get_my_role()
returns text as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer stable;

-- AGENCIES: users can only see their own agency
create policy "agencies_select" on public.agencies
  for select using (
    id = public.get_my_agency_id()
    or public.get_my_role() = 'super_admin'
  );

create policy "agencies_update" on public.agencies
  for update using (
    id = public.get_my_agency_id()
    and public.get_my_role() in ('admin', 'super_admin')
  );

-- USERS: users can see others in same agency
create policy "users_select" on public.users
  for select using (
    agency_id = public.get_my_agency_id()
    or public.get_my_role() = 'super_admin'
  );

create policy "users_update_own" on public.users
  for update using (id = auth.uid());

-- CONTACTS: agents see only their own, admins see all in agency
create policy "contacts_select" on public.contacts
  for select using (
    agency_id = public.get_my_agency_id()
    and (
      public.get_my_role() in ('admin', 'super_admin')
      or created_by = auth.uid()
    )
  );

create policy "contacts_insert" on public.contacts
  for insert with check (
    agency_id = public.get_my_agency_id()
  );

create policy "contacts_update" on public.contacts
  for update using (
    agency_id = public.get_my_agency_id()
    and (
      public.get_my_role() in ('admin', 'super_admin')
      or created_by = auth.uid()
    )
  );

create policy "contacts_delete" on public.contacts
  for delete using (
    agency_id = public.get_my_agency_id()
    and public.get_my_role() in ('admin', 'super_admin')
  );

-- PROPERTIES
create policy "properties_select" on public.properties
  for select using (agency_id = public.get_my_agency_id());

create policy "properties_insert" on public.properties
  for insert with check (agency_id = public.get_my_agency_id());

create policy "properties_update" on public.properties
  for update using (
    agency_id = public.get_my_agency_id()
    and public.get_my_role() in ('admin', 'super_admin', 'agent')
  );

create policy "properties_delete" on public.properties
  for delete using (
    agency_id = public.get_my_agency_id()
    and public.get_my_role() in ('admin', 'super_admin')
  );

-- APPRAISALS
create policy "appraisals_select" on public.appraisals
  for select using (agency_id = public.get_my_agency_id());

create policy "appraisals_insert" on public.appraisals
  for insert with check (agency_id = public.get_my_agency_id());

create policy "appraisals_update" on public.appraisals
  for update using (agency_id = public.get_my_agency_id());

create policy "appraisals_delete" on public.appraisals
  for delete using (
    agency_id = public.get_my_agency_id()
    and public.get_my_role() in ('admin', 'super_admin')
  );

-- LISTINGS
create policy "listings_select" on public.listings
  for select using (agency_id = public.get_my_agency_id());

create policy "listings_insert" on public.listings
  for insert with check (agency_id = public.get_my_agency_id());

create policy "listings_update" on public.listings
  for update using (agency_id = public.get_my_agency_id());

create policy "listings_delete" on public.listings
  for delete using (
    agency_id = public.get_my_agency_id()
    and public.get_my_role() in ('admin', 'super_admin')
  );

-- TASKS
create policy "tasks_select" on public.tasks
  for select using (
    agency_id = public.get_my_agency_id()
    and (
      public.get_my_role() in ('admin', 'super_admin')
      or assigned_to = auth.uid()
    )
  );

create policy "tasks_insert" on public.tasks
  for insert with check (agency_id = public.get_my_agency_id());

create policy "tasks_update" on public.tasks
  for update using (
    agency_id = public.get_my_agency_id()
    and (
      public.get_my_role() in ('admin', 'super_admin')
      or assigned_to = auth.uid()
    )
  );

create policy "tasks_delete" on public.tasks
  for delete using (
    agency_id = public.get_my_agency_id()
    and public.get_my_role() in ('admin', 'super_admin')
  );

-- COMMUNICATIONS
create policy "communications_select" on public.communications
  for select using (agency_id = public.get_my_agency_id());

create policy "communications_insert" on public.communications
  for insert with check (agency_id = public.get_my_agency_id());

-- OPEN HOMES
create policy "open_homes_select" on public.open_homes
  for select using (agency_id = public.get_my_agency_id());

create policy "open_homes_insert" on public.open_homes
  for insert with check (agency_id = public.get_my_agency_id());

create policy "open_homes_update" on public.open_homes
  for update using (agency_id = public.get_my_agency_id());

create policy "open_homes_delete" on public.open_homes
  for delete using (
    agency_id = public.get_my_agency_id()
    and public.get_my_role() in ('admin', 'super_admin')
  );

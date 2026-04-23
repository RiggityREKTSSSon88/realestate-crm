-- Phase 8: Mobile & SaaS

-- ─── Agencies: Stripe + onboarding fields ─────────────────────────────────
alter table public.agencies
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists trial_ends_at timestamptz;

-- ─── Invitations table (onboarding + invite agent) ────────────────────────
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  email text not null,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  token text not null unique default gen_random_uuid()::text,
  invited_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists invitations_token_idx on public.invitations(token);
create index if not exists invitations_agency_id_idx on public.invitations(agency_id);
create index if not exists invitations_email_idx on public.invitations(email);

alter table public.invitations enable row level security;
create policy "invitations_agency" on public.invitations
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "invitations_insert" on public.invitations for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "invitations_update" on public.invitations for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- ─── Full RLS Audit — ensure every table is locked to agency_id ───────────

-- agencies: users can only see their own agency
alter table public.agencies enable row level security;
drop policy if exists "agencies_select_own" on public.agencies;
create policy "agencies_select_own" on public.agencies for select
  using (id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "agencies_update_own" on public.agencies;
create policy "agencies_update_own" on public.agencies for update
  using (id = (select agency_id from public.users where id = auth.uid()));

-- users: visible within same agency
alter table public.users enable row level security;
drop policy if exists "users_agency_isolation" on public.users;
create policy "users_agency_isolation" on public.users for select
  using (agency_id = (select agency_id from public.users u2 where u2.id = auth.uid()));
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update
  using (id = auth.uid());

-- tasks
alter table public.tasks enable row level security;
drop policy if exists "tasks_agency_isolation" on public.tasks;
create policy "tasks_agency_isolation" on public.tasks
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- communications
alter table public.communications enable row level security;
drop policy if exists "communications_agency_isolation" on public.communications;
create policy "communications_agency_isolation" on public.communications
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "communications_insert" on public.communications;
create policy "communications_insert" on public.communications for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "communications_update" on public.communications;
create policy "communications_update" on public.communications for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "communications_delete" on public.communications;
create policy "communications_delete" on public.communications for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- open_homes
alter table public.open_homes enable row level security;
drop policy if exists "open_homes_agency_isolation" on public.open_homes;
create policy "open_homes_agency_isolation" on public.open_homes
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "open_homes_insert" on public.open_homes;
create policy "open_homes_insert" on public.open_homes for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "open_homes_update" on public.open_homes;
create policy "open_homes_update" on public.open_homes for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "open_homes_delete" on public.open_homes;
create policy "open_homes_delete" on public.open_homes for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- contacts (refresh)
drop policy if exists "contacts_agency_isolation" on public.contacts;
create policy "contacts_agency_isolation" on public.contacts
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "contacts_insert" on public.contacts;
create policy "contacts_insert" on public.contacts for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "contacts_update" on public.contacts;
create policy "contacts_update" on public.contacts for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "contacts_delete" on public.contacts;
create policy "contacts_delete" on public.contacts for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- properties (refresh)
drop policy if exists "properties_agency_isolation" on public.properties;
create policy "properties_agency_isolation" on public.properties
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "properties_insert" on public.properties;
create policy "properties_insert" on public.properties for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "properties_update" on public.properties;
create policy "properties_update" on public.properties for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "properties_delete" on public.properties;
create policy "properties_delete" on public.properties for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- appraisals (refresh)
drop policy if exists "appraisals_agency_isolation" on public.appraisals;
create policy "appraisals_agency_isolation" on public.appraisals
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "appraisals_insert" on public.appraisals;
create policy "appraisals_insert" on public.appraisals for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "appraisals_update" on public.appraisals;
create policy "appraisals_update" on public.appraisals for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "appraisals_delete" on public.appraisals;
create policy "appraisals_delete" on public.appraisals for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- listings (refresh)
drop policy if exists "listings_agency_isolation" on public.listings;
create policy "listings_agency_isolation" on public.listings
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "listings_insert" on public.listings;
create policy "listings_insert" on public.listings for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "listings_update" on public.listings;
create policy "listings_update" on public.listings for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
drop policy if exists "listings_delete" on public.listings;
create policy "listings_delete" on public.listings for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

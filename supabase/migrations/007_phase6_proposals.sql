-- Phase 6: Digital Proposals & Documents

-- Proposal templates (reusable section blueprints)
create table if not exists public.proposal_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  sections jsonb not null default '[]',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.proposal_templates enable row level security;
create policy "proposal_templates_agency" on public.proposal_templates
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "proposal_templates_insert" on public.proposal_templates for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "proposal_templates_update" on public.proposal_templates for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "proposal_templates_delete" on public.proposal_templates for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- Proposals (individual documents sent to contacts)
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'opened', 'signed', 'declined')),
  sections jsonb not null default '[]',
  docuseal_submission_id text,
  docuseal_signing_url text,
  sent_at timestamptz,
  first_opened_at timestamptz,
  signed_at timestamptz,
  total_view_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_agency_id_idx on public.proposals(agency_id);
create index if not exists proposals_contact_id_idx on public.proposals(contact_id);
create index if not exists proposals_status_idx on public.proposals(status);

alter table public.proposals enable row level security;
create policy "proposals_agency" on public.proposals
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "proposals_insert" on public.proposals for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "proposals_update" on public.proposals for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "proposals_delete" on public.proposals for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- Document engagement events
create table if not exists public.document_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  event_type text not null check (event_type in ('opened', 'section_viewed', 'time_spent', 'signed', 'declined', 'booking_clicked')),
  section_id text,
  duration_seconds integer,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists document_events_proposal_id_idx on public.document_events(proposal_id);

-- Public insert allowed for engagement tracking (no auth on preview page)
alter table public.document_events enable row level security;
create policy "document_events_select" on public.document_events for select
  using (proposal_id in (select id from public.proposals where agency_id = (select agency_id from public.users where id = auth.uid())));
create policy "document_events_insert_public" on public.document_events for insert
  with check (true);

-- Agent reviews (for social proof in proposals)
create table if not exists public.agent_reviews (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  agent_id uuid not null references public.users(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  review_date date not null,
  source text not null default 'ratemyagent' check (source in ('ratemyagent', 'google', 'other')),
  created_at timestamptz not null default now()
);

create index if not exists agent_reviews_agent_id_idx on public.agent_reviews(agent_id);

alter table public.agent_reviews enable row level security;
create policy "agent_reviews_agency" on public.agent_reviews
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "agent_reviews_insert" on public.agent_reviews for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "agent_reviews_update" on public.agent_reviews for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "agent_reviews_delete" on public.agent_reviews for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- Booking availability slots per agent
create table if not exists public.booking_availability (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  agent_id uuid not null references public.users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.booking_availability enable row level security;
create policy "booking_availability_agency" on public.booking_availability
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "booking_availability_insert" on public.booking_availability for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "booking_availability_update" on public.booking_availability for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "booking_availability_delete" on public.booking_availability for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- Booked appointments
create table if not exists public.booking_appointments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  agent_id uuid not null references public.users(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete set null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  scheduled_at timestamptz not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists booking_appointments_agent_id_idx on public.booking_appointments(agent_id);
create index if not exists booking_appointments_proposal_id_idx on public.booking_appointments(proposal_id);

-- Public insert for booking (unauthenticated clients book)
alter table public.booking_appointments enable row level security;
create policy "booking_appointments_select" on public.booking_appointments for select
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "booking_appointments_insert_public" on public.booking_appointments for insert
  with check (true);
create policy "booking_appointments_update" on public.booking_appointments for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

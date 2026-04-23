-- Phase 5: Reporting & Analytics

-- Commission tracking per listing
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  agent_id uuid references public.users(id) on delete set null,
  expected_amount numeric,
  actual_amount numeric,
  status text not null default 'pending' check (status in ('pending', 'invoiced', 'paid')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commissions_agency_id_idx on public.commissions(agency_id);
create index if not exists commissions_listing_id_idx on public.commissions(listing_id);
create index if not exists commissions_agent_id_idx on public.commissions(agent_id);

alter table public.commissions enable row level security;

create policy "commissions_agency_isolation" on public.commissions
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "commissions_insert" on public.commissions for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "commissions_update" on public.commissions for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "commissions_delete" on public.commissions for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- Scheduled report delivery
create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  report_type text not null check (report_type in ('agent_performance', 'kpi', 'stocklist', 'geo_breakdown', 'staff_comparison')),
  frequency text not null check (frequency in ('weekly', 'monthly')),
  recipients jsonb not null default '[]',
  active boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists scheduled_reports_agency_id_idx on public.scheduled_reports(agency_id);
create index if not exists scheduled_reports_next_run_idx on public.scheduled_reports(next_run_at) where active = true;

alter table public.scheduled_reports enable row level security;

create policy "scheduled_reports_agency_isolation" on public.scheduled_reports
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "scheduled_reports_insert" on public.scheduled_reports for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "scheduled_reports_update" on public.scheduled_reports for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "scheduled_reports_delete" on public.scheduled_reports for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

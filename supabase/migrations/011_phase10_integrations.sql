-- Phase 10: Integrations

-- Integration API key storage per agency
create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  integration_name text not null,
  api_key text,
  api_secret text,
  config jsonb not null default '{}',
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agency_id, integration_name)
);

create index if not exists integration_settings_agency_idx on public.integration_settings(agency_id);

-- Zapier webhook registrations
create table if not exists public.zapier_webhooks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  url text not null,
  events text[] not null default '{}',
  active boolean not null default true,
  secret text,
  created_at timestamptz not null default now()
);

create index if not exists zapier_webhooks_agency_idx on public.zapier_webhooks(agency_id);

-- RLS
alter table public.integration_settings enable row level security;
alter table public.zapier_webhooks enable row level security;

create policy "integration_settings_agency" on public.integration_settings
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "integration_settings_agency_insert" on public.integration_settings
  for insert with check (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "integration_settings_agency_update" on public.integration_settings
  for update using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "zapier_webhooks_agency" on public.zapier_webhooks
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "zapier_webhooks_agency_insert" on public.zapier_webhooks
  for insert with check (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "zapier_webhooks_agency_delete" on public.zapier_webhooks
  for delete using (agency_id = (select agency_id from public.users where id = auth.uid()));

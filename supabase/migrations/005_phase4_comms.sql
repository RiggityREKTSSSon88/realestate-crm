-- Phase 4: Communications enhancements

-- Add sentiment to communications
alter table public.communications
  add column if not exists sentiment text check (sentiment in ('positive', 'neutral', 'negative', 'urgent')) default 'neutral';

-- Add last_contacted_at and seller_likelihood to contacts
alter table public.contacts
  add column if not exists last_contacted_at timestamptz,
  add column if not exists seller_likelihood text check (seller_likelihood in ('low', 'medium', 'high'));

-- Backfill last_contacted_at from existing communications
update public.contacts c
set last_contacted_at = (
  select max(sent_at) from public.communications comm where comm.contact_id = c.id
)
where exists (
  select 1 from public.communications comm where comm.contact_id = c.id
);

-- Templates table
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  type text not null check (type in ('email', 'sms')),
  subject text,
  body text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_agency_id_idx on public.templates(agency_id);

-- RLS for templates
alter table public.templates enable row level security;

create policy "templates_agency_isolation" on public.templates
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "templates_insert" on public.templates for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "templates_update" on public.templates for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

create policy "templates_delete" on public.templates for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- Function to update last_contacted_at on new communication
create or replace function public.update_last_contacted_at()
returns trigger language plpgsql security definer as $$
begin
  update public.contacts
  set last_contacted_at = NEW.sent_at
  where id = NEW.contact_id
    and (last_contacted_at is null or last_contacted_at < NEW.sent_at);
  return NEW;
end;
$$;

drop trigger if exists on_communication_insert on public.communications;
create trigger on_communication_insert
  after insert on public.communications
  for each row execute function public.update_last_contacted_at();

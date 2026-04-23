-- Phase 9: AI Features

-- Add lead_score to contacts
alter table public.contacts
  add column if not exists lead_score integer check (lead_score >= 0 and lead_score <= 100);

create index if not exists contacts_lead_score_idx on public.contacts(lead_score desc);

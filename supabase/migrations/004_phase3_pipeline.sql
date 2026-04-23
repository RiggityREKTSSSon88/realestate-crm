-- Phase 3: Vendor & Pipeline Management

-- Add vendor/activity fields to listings
alter table public.listings
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists enquiries_count integer not null default 0,
  add column if not exists open_home_count integer not null default 0,
  add column if not exists price_feedback text,
  add column if not exists offers_received integer not null default 0,
  add column if not exists contracts_out integer not null default 0,
  add column if not exists vendor_notes text,
  add column if not exists sold_price numeric;

create index if not exists listings_contact_id_idx on public.listings(contact_id);

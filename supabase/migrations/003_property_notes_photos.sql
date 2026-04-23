-- Add notes and photo storage to properties
alter table public.properties
  add column if not exists notes text,
  add column if not exists photo_urls jsonb not null default '[]';

-- Create property photos storage bucket
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

-- Storage policies
create policy "property_photos_select" on storage.objects
  for select using (bucket_id = 'property-photos');

create policy "property_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'property-photos'
    and auth.role() = 'authenticated'
  );

create policy "property_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'property-photos'
    and auth.role() = 'authenticated'
  );

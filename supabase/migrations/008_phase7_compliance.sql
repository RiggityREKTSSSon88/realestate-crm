-- Phase 7: Compliance (AML/KYC)

-- Add KYC/AML fields to contacts
alter table public.contacts
  add column if not exists kyc_status text not null default 'unverified'
    check (kyc_status in ('unverified', 'pending', 'verified')),
  add column if not exists kyc_verified_at timestamptz,
  add column if not exists aml_risk_level text
    check (aml_risk_level in ('low', 'medium', 'high')),
  add column if not exists aml_notes text,
  add column if not exists aml_assessed_at timestamptz,
  add column if not exists aml_assessed_by uuid references public.users(id) on delete set null;

create index if not exists contacts_kyc_status_idx on public.contacts(kyc_status);
create index if not exists contacts_aml_risk_idx on public.contacts(aml_risk_level);

-- KYC documents
create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  document_type text not null check (document_type in (
    'passport', 'drivers_licence', 'birth_certificate', 'proof_of_address', 'other'
  )),
  file_name text not null,
  file_path text not null,
  uploaded_by uuid references public.users(id) on delete set null,
  expiry_date date,
  status text not null default 'active' check (status in ('active', 'expired', 'superseded')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists kyc_documents_contact_id_idx on public.kyc_documents(contact_id);
create index if not exists kyc_documents_agency_id_idx on public.kyc_documents(agency_id);
create index if not exists kyc_documents_expiry_idx on public.kyc_documents(expiry_date) where status = 'active';

alter table public.kyc_documents enable row level security;

create policy "kyc_documents_agency" on public.kyc_documents
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "kyc_documents_insert" on public.kyc_documents for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "kyc_documents_update" on public.kyc_documents for update
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "kyc_documents_delete" on public.kyc_documents for delete
  using (agency_id = (select agency_id from public.users where id = auth.uid()));

-- Compliance audit log
create table if not exists public.compliance_audit_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  performed_by uuid references public.users(id) on delete set null,
  action_type text not null check (action_type in (
    'kyc_document_uploaded', 'kyc_document_deleted',
    'kyc_status_changed', 'aml_risk_updated'
  )),
  previous_value jsonb,
  new_value jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_agency_id_idx on public.compliance_audit_log(agency_id);
create index if not exists audit_log_contact_id_idx on public.compliance_audit_log(contact_id);
create index if not exists audit_log_created_at_idx on public.compliance_audit_log(created_at desc);

alter table public.compliance_audit_log enable row level security;

create policy "audit_log_agency" on public.compliance_audit_log
  using (agency_id = (select agency_id from public.users where id = auth.uid()));
create policy "audit_log_insert" on public.compliance_audit_log for insert
  with check (agency_id = (select agency_id from public.users where id = auth.uid()));

-- KYC documents storage bucket (private)
insert into storage.buckets (id, name, public)
  values ('kyc-documents', 'kyc-documents', false)
  on conflict (id) do nothing;

create policy "kyc_docs_select" on storage.objects for select
  using (bucket_id = 'kyc-documents' and auth.role() = 'authenticated');
create policy "kyc_docs_insert" on storage.objects for insert
  with check (bucket_id = 'kyc-documents' and auth.role() = 'authenticated');
create policy "kyc_docs_delete" on storage.objects for delete
  using (bucket_id = 'kyc-documents' and auth.role() = 'authenticated');

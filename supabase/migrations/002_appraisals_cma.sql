-- Add comparable sales CMA fields to appraisals
alter table public.appraisals
  add column if not exists comparable_sales jsonb not null default '[]';

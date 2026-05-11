-- South African ID number validation metadata (Check ID API results).
-- Sensitive columns: restrict anon SELECT so marketplace/public anon clients cannot read ID numbers or API payloads.

alter table public.resources add column if not exists id_number text;
alter table public.resources add column if not exists id_validation_status text default 'not_started';
alter table public.resources add column if not exists id_validated_at timestamptz;
alter table public.resources add column if not exists id_validation_response jsonb;
alter table public.resources add column if not exists id_dob date;
alter table public.resources add column if not exists id_age int;
alter table public.resources add column if not exists id_gender text;
alter table public.resources add column if not exists id_citizenship text;
alter table public.resources add column if not exists id_validation_error text;

comment on column public.resources.id_validation_status is 'not_started | pending | verified | failed';

-- Default for existing rows
update public.resources
set id_validation_status = coalesce(nullif(trim(id_validation_status), ''), 'not_started')
where id_validation_status is null;

alter table public.resources alter column id_validation_status set default 'not_started';

-- Do not expose ID number / API payload to anonymous clients (lib/supabase anon reads).
revoke select (
  id_number,
  id_validated_at,
  id_validation_response,
  id_dob,
  id_age,
  id_gender,
  id_citizenship,
  id_validation_error
) on public.resources from anon;

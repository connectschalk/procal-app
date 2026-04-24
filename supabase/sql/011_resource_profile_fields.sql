-- 011_resource_profile_fields.sql — ensure MVP profile columns + comments (Supabase SQL Editor)
-- Re-run safe: add column if not exists; comments apply to existing columns too.

alter table public.resources add column if not exists headline text;
alter table public.resources add column if not exists bio text;
alter table public.resources add column if not exists hourly_rate numeric;
alter table public.resources add column if not exists location text;

comment on column public.resources.headline is 'MVP profile fields, editable by claimed consultants';
comment on column public.resources.bio is 'MVP profile fields, editable by claimed consultants';
comment on column public.resources.hourly_rate is 'MVP profile fields, editable by claimed consultants';
comment on column public.resources.location is 'MVP profile fields, editable by claimed consultants';

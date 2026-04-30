alter table public.company_profiles
add column if not exists talent_industry text,
add column if not exists talent_resource_type text;

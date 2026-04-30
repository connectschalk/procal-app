create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  company_name text,
  logo_path text,
  contact_person text,
  contact_email text,
  contact_number text,
  website text,
  location text,
  description text,
  talent_interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_profiles enable row level security;

create policy if not exists company_profiles_select_own
on public.company_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy if not exists company_profiles_insert_own
on public.company_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy if not exists company_profiles_update_own
on public.company_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

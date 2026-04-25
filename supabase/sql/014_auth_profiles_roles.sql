-- 014_auth_profiles_roles.sql — Auth-linked profiles and roles (Supabase SQL Editor)
-- MVP foundation before tightening RLS on business tables.
-- Admin role is not self-signup; assign in SQL when needed.

-- ---------------------------------------------------------------------------
-- user_profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'company' check (role in ('company', 'consultant', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.user_profiles is
  'App role and email mirror for auth.users. Filled on signup via trigger; admin set manually.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
drop policy if exists "user_profiles_insert_own" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;

create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- TODO: add admin-wide policies (e.g. service role or role = admin) when locking down dashboards.

grant select, insert, update on table public.user_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- New auth user → profile row (role from raw_user_meta_data, signup form)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'company');
  if r not in ('company', 'consultant') then
    r := 'company';
  end if;

  insert into public.user_profiles (id, email, role)
  values (new.id, new.email, r)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Creates user_profiles from auth.users; role from raw_user_meta_data.role (company|consultant only).';

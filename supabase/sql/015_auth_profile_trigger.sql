-- 015_auth_profile_trigger.sql — Idempotent (re)apply auth → user_profiles trigger
-- Core table + policies: 014_auth_profiles_roles.sql. Run this if the trigger was skipped.

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
  'Creates user_profiles from auth.users; role from raw_user_meta_data.role (company|consultant); idempotent via ON CONFLICT DO NOTHING.';

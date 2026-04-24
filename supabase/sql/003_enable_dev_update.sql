-- 003_enable_dev_update.sql — DEVELOPMENT ONLY
-- Run in Supabase SQL Editor for the project in .env.local.
--
-- This adds permissive RLS for UPDATE and a dev read-all SELECT so /admin/resources
-- can list drafts. The UPDATE RLS policy and dev read-all SELECT must be restricted
-- or removed before production.
--
-- Only profile_status may change on UPDATE (enforced by trigger below).

-- ---------------------------------------------------------------------------
-- Dev: allow listing all rows (drafts + approved) for admin UI
-- Combines permissively with existing SELECT policies (OR semantics).
-- ---------------------------------------------------------------------------
drop policy if exists "Dev public read all resources" on public.resources;

create policy "Dev public read all resources"
on public.resources
for select
using (true);

-- ---------------------------------------------------------------------------
-- Dev: public UPDATE (RLS permissive; column guard is the trigger)
-- ---------------------------------------------------------------------------
drop policy if exists "Dev public update resources" on public.resources;

create policy "Dev public update resources"
on public.resources
for update
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- Guard: only profile_status may change (all other columns must match OLD)
-- ---------------------------------------------------------------------------
create or replace function public.resources_dev_only_profile_status_update()
returns trigger
language plpgsql
as $$
begin
  if (
    old.id is distinct from new.id
    or old.name is distinct from new.name
    or old.headline is distinct from new.headline
    or old.location is distinct from new.location
    or old.hourly_rate is distinct from new.hourly_rate
    or old.years_experience is distinct from new.years_experience
    or old.bio is distinct from new.bio
    or old.created_at is distinct from new.created_at
  ) then
    raise exception 'Only profile_status may be updated (development guard)';
  end if;
  return new;
end;
$$;

drop trigger if exists resources_dev_only_profile_status_update on public.resources;

create trigger resources_dev_only_profile_status_update
before update on public.resources
for each row
execute function public.resources_dev_only_profile_status_update();

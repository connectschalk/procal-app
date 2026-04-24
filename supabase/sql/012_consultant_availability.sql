-- 012_consultant_availability.sql — weekly availability windows (Supabase SQL Editor, project from .env.local)
--
-- ⚠️ DEV ONLY — anon SELECT/INSERT/UPDATE/DELETE on resource_availability. Replace with
-- authenticated consultant + scoped policies (or service role) before production.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.resource_availability (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint resource_availability_time_order check (start_time < end_time)
);

comment on table public.resource_availability is
  'MVP weekly availability; DEV RLS allows anon full access — must be restricted before production.';
comment on column public.resource_availability.day_of_week is
  '0 = Monday … 6 = Sunday (display order Monday–Sunday).';

-- ---------------------------------------------------------------------------
-- RLS (development)
-- ---------------------------------------------------------------------------
alter table public.resource_availability enable row level security;

drop policy if exists "Dev public read all resource_availability" on public.resource_availability;
drop policy if exists "Dev public insert resource_availability" on public.resource_availability;
drop policy if exists "Dev public update resource_availability" on public.resource_availability;
drop policy if exists "Dev public delete resource_availability" on public.resource_availability;

create policy "Dev public read all resource_availability"
on public.resource_availability
for select
using (true);

create policy "Dev public insert resource_availability"
on public.resource_availability
for insert
with check (true);

create policy "Dev public update resource_availability"
on public.resource_availability
for update
using (true)
with check (true);

create policy "Dev public delete resource_availability"
on public.resource_availability
for delete
using (true);

-- Superseded for app behaviour by 013_day_based_availability_mvp.sql (resources.available_from +
-- public.resource_blocked_dates). Table retained; do not drop until a later migration.

-- 013_day_based_availability_mvp.sql — available_from + blocked full days (Supabase SQL Editor)
--
-- Supersedes weekly time-window MVP in public.resource_availability (012) for app behaviour.
-- Do not drop resource_availability yet; it remains unused until a later migration.
-- Future model may support capacity hours per day/week/month.

-- ---------------------------------------------------------------------------
-- resources.available_from
-- ---------------------------------------------------------------------------
alter table public.resources add column if not exists available_from date;

comment on column public.resources.available_from is
  'MVP: consultant available from this calendar date onward. Paired with resource_blocked_dates.';

-- ---------------------------------------------------------------------------
-- Blocked full days
-- ---------------------------------------------------------------------------
create table if not exists public.resource_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  blocked_date date not null,
  reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists resource_blocked_dates_resource_id_blocked_date_key
  on public.resource_blocked_dates (resource_id, blocked_date);

comment on table public.resource_blocked_dates is
  'MVP: full-day blocks for a consultant. DEV RLS — restrict before production. Future: hourly capacity.';

comment on column public.resource_blocked_dates.blocked_date is
  'Calendar date with no availability (whole day).';

-- ---------------------------------------------------------------------------
-- RLS (development)
-- ---------------------------------------------------------------------------
alter table public.resource_blocked_dates enable row level security;

drop policy if exists "Dev public read all resource_blocked_dates" on public.resource_blocked_dates;
drop policy if exists "Dev public insert resource_blocked_dates" on public.resource_blocked_dates;
drop policy if exists "Dev public delete resource_blocked_dates" on public.resource_blocked_dates;

create policy "Dev public read all resource_blocked_dates"
on public.resource_blocked_dates
for select
using (true);

create policy "Dev public insert resource_blocked_dates"
on public.resource_blocked_dates
for insert
with check (true);

create policy "Dev public delete resource_blocked_dates"
on public.resource_blocked_dates
for delete
using (true);

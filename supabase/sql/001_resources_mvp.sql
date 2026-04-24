-- Procal MVP: resources table + RLS (run in Supabase SQL Editor for the project in .env.local)
-- Idempotent: safe to re-run after adjusting policies.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  name text,
  headline text,
  location text,
  hourly_rate numeric,
  years_experience int,
  bio text,
  profile_status text default 'draft',
  created_at timestamptz default now()
);

-- Ensure columns exist on older installs
alter table public.resources add column if not exists name text;
alter table public.resources add column if not exists headline text;
alter table public.resources add column if not exists location text;
alter table public.resources add column if not exists hourly_rate numeric;
alter table public.resources add column if not exists years_experience int;
alter table public.resources add column if not exists bio text;
alter table public.resources add column if not exists profile_status text default 'draft';
alter table public.resources add column if not exists created_at timestamptz default now();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.resources enable row level security;

-- Remove legacy / dev policies from earlier iterations (names may vary)
drop policy if exists "Public read resources" on public.resources;
drop policy if exists "Public read approved resources" on public.resources;
drop policy if exists "Public insert draft resources" on public.resources;

-- Public read: approved only
create policy "Public read approved resources"
on public.resources
for select
using (profile_status = 'approved');

-- Public insert: drafts only
create policy "Public insert draft resources"
on public.resources
for insert
with check (profile_status = 'draft');

-- ---------------------------------------------------------------------------
-- Sample approved consultants (fixed ids; re-run safe)
-- ---------------------------------------------------------------------------
insert into public.resources (
  id,
  name,
  headline,
  location,
  hourly_rate,
  years_experience,
  bio,
  profile_status
)
values
  (
    '11111111-1111-4111-8111-111111111101'::uuid,
    'Alex Rivers',
    'Operating model & change lead',
    'Cape Town',
    1850,
    12,
    'Helps leadership teams align strategy with delivery and adoption.',
    'approved'
  ),
  (
    '11111111-1111-4111-8111-111111111102'::uuid,
    'Nomsa Dlamini',
    'Product strategy & discovery',
    'Johannesburg',
    1650,
    9,
    'Runs discovery sprints, defines roadmaps, and coaches product squads.',
    'approved'
  )
on conflict (id) do nothing;

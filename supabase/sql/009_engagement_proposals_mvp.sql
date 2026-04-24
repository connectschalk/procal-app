-- 009_engagement_proposals_mvp.sql — engagement proposals (Supabase SQL Editor, project from .env.local)
-- Idempotent where possible. Dev SELECT/UPDATE policies are NOT production-safe.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.engagement_proposals (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  company_name text not null,
  requester_name text not null,
  requester_email text not null,
  proposed_start_date date,
  proposed_end_date date,
  scope text,
  proposed_rate numeric,
  status text not null default 'proposed',
  created_at timestamptz not null default now()
);

comment on table public.engagement_proposals is
  'MVP: company engagement offers to consultants. Replace dev policies with auth + service role before production.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.engagement_proposals enable row level security;

drop policy if exists "Public insert engagement proposals" on public.engagement_proposals;

create policy "Public insert engagement proposals"
on public.engagement_proposals
for insert
with check (true);

-- ---------------------------------------------------------------------------
-- DEVELOPMENT ONLY — anon can read all proposals (admin UI)
-- ---------------------------------------------------------------------------
drop policy if exists "Dev public read all engagement proposals" on public.engagement_proposals;

create policy "Dev public read all engagement proposals"
on public.engagement_proposals
for select
using (true);

-- ---------------------------------------------------------------------------
-- DEVELOPMENT ONLY — anon can update; trigger restricts to status only
-- ---------------------------------------------------------------------------
drop policy if exists "Dev public update engagement proposals" on public.engagement_proposals;

create policy "Dev public update engagement proposals"
on public.engagement_proposals
for update
using (true)
with check (true);

create or replace function public.engagement_proposals_dev_only_status_update()
returns trigger
language plpgsql
as $$
begin
  if (
    old.id is distinct from new.id
    or old.resource_id is distinct from new.resource_id
    or old.company_name is distinct from new.company_name
    or old.requester_name is distinct from new.requester_name
    or old.requester_email is distinct from new.requester_email
    or old.proposed_start_date is distinct from new.proposed_start_date
    or old.proposed_end_date is distinct from new.proposed_end_date
    or old.scope is distinct from new.scope
    or old.proposed_rate is distinct from new.proposed_rate
    or old.created_at is distinct from new.created_at
  ) then
    raise exception 'Only status may be updated (development guard)';
  end if;
  return new;
end;
$$;

drop trigger if exists engagement_proposals_dev_only_status_update on public.engagement_proposals;

create trigger engagement_proposals_dev_only_status_update
before update on public.engagement_proposals
for each row
execute function public.engagement_proposals_dev_only_status_update();

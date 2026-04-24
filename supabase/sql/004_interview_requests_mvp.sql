-- 004_interview_requests_mvp.sql — interview requests (Supabase SQL Editor, project from .env.local)
-- Re-run safe: policies use drop if exists; table uses create if not exists.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.interview_requests (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  company_name text not null,
  requester_name text not null,
  requester_email text not null,
  message text,
  proposed_slot_1 timestamptz,
  proposed_slot_2 timestamptz,
  proposed_slot_3 timestamptz,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: public can insert; no SELECT policy (anon cannot read rows)
-- ---------------------------------------------------------------------------
alter table public.interview_requests enable row level security;

drop policy if exists "Public insert interview requests" on public.interview_requests;

create policy "Public insert interview requests"
on public.interview_requests
for insert
with check (true);

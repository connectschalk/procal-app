-- 005_dev_read_interview_requests.sql — DEVELOPMENT ONLY
-- Run in Supabase SQL Editor for the project in .env.local.
--
-- ⚠️ REMOVE OR REPLACE BEFORE PRODUCTION ⚠️
-- This grants anonymous (anon) clients full SELECT on interview_requests so the
-- admin-lite UI at /admin/interviews can list requests without authentication.
-- In production, replace with authenticated admin roles, service role on the server,
-- or row-level rules that scope access appropriately.
--
-- interview_requests already has RLS enabled (004). This file only adds a dev read policy.

alter table public.interview_requests enable row level security;

drop policy if exists "Dev public read all interview requests" on public.interview_requests;

create policy "Dev public read all interview requests"
on public.interview_requests
for select
using (true);

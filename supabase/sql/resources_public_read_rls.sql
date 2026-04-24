-- Run this in the Supabase SQL Editor for the project matching .env.local (NEXT_PUBLIC_SUPABASE_URL).
-- If you already created the policy, drop it first or skip the create policy line:
--   drop policy if exists "Public read resources" on public.resources;

-- Enable RLS (safe to re-run)
alter table resources enable row level security;

-- Allow public read access
create policy "Public read resources"
on resources
for select
using (true);

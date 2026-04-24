-- Dev / ops helpers: list drafts and approve (run in Supabase SQL Editor)
-- Use the project matching .env.local. No app authentication assumed.

-- ---------------------------------------------------------------------------
-- List draft resources
-- ---------------------------------------------------------------------------
select id, name, headline, location, profile_status, created_at
from public.resources
where coalesce(profile_status, '') = 'draft'
order by created_at desc;

-- ---------------------------------------------------------------------------
-- Approve a single resource by id — replace the UUID, then run this block only
-- ---------------------------------------------------------------------------
-- update public.resources
-- set profile_status = 'approved'
-- where id = '00000000-0000-0000-0000-000000000000'::uuid;

-- ---------------------------------------------------------------------------
-- Approve all drafts — development only; review before running
-- ---------------------------------------------------------------------------
-- update public.resources
-- set profile_status = 'approved'
-- where coalesce(profile_status, '') = 'draft';

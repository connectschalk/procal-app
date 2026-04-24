-- 010_resource_claimed.sql — profile claim flags (Supabase SQL Editor, project from .env.local)
-- Re-run safe: add column if not exists.

alter table public.resources add column if not exists claimed boolean not null default false;
alter table public.resources add column if not exists claim_code text;

comment on column public.resources.claimed is 'MVP claim mechanism, replace with auth later';
comment on column public.resources.claim_code is 'MVP claim mechanism, replace with auth later';

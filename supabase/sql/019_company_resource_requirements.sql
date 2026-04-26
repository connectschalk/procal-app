create table if not exists public.company_resource_requirements (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  role_type text,
  job_spec text,
  rate_min numeric,
  rate_max numeric,
  start_date date,
  location text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

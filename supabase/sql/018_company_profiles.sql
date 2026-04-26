create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  company_name text,
  logo_path text,
  contact_person text,
  contact_email text,
  contact_number text,
  website text,
  location text,
  description text,
  talent_interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

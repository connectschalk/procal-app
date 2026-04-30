alter table public.resources
add column if not exists industry text,
add column if not exists resource_type text,
add column if not exists other_resource_type text;

-- MVP: optional consultant email for transactional notifications (interview requests).
-- Replace with authenticated profile / verified email when auth ships.

alter table public.resources add column if not exists contact_email text;

comment on column public.resources.contact_email is
  'MVP-only: where to send interview-request alerts; not shown on public profile; migrate to auth-backed contact later.';

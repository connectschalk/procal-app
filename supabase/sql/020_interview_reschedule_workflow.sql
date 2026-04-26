-- 020_interview_reschedule_workflow.sql
-- Adds decline/reschedule workflow fields for interview_requests.

alter table public.interview_requests
add column if not exists decline_message text null,
add column if not exists alternative_slots timestamptz[] null,
add column if not exists reschedule_message text null,
add column if not exists reschedule_slots timestamptz[] null,
add column if not exists updated_at timestamptz not null default now();

create or replace function public.interview_requests_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists interview_requests_set_updated_at on public.interview_requests;
create trigger interview_requests_set_updated_at
before update on public.interview_requests
for each row
execute function public.interview_requests_set_updated_at();

-- DEV guard from 007: still blocks changing immutable columns, but now allows
-- workflow fields in addition to status/selected_slot.
create or replace function public.interview_requests_dev_only_status_update()
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
    or old.message is distinct from new.message
    or old.proposed_slot_1 is distinct from new.proposed_slot_1
    or old.proposed_slot_2 is distinct from new.proposed_slot_2
    or old.proposed_slot_3 is distinct from new.proposed_slot_3
    or old.created_at is distinct from new.created_at
  ) then
    raise exception 'Only interview workflow fields may be updated (development guard)';
  end if;
  return new;
end;
$$;

-- 007_selected_interview_slot.sql — selected interview time (run in Supabase SQL Editor, .env.local project)
-- Idempotent: add column if missing; replaces dev UPDATE guard function only.
-- RLS policies are unchanged (still use 004 insert + 005 select + 006 update as applied).

-- ---------------------------------------------------------------------------
-- Column: consultant-chosen slot when a request is accepted
-- ---------------------------------------------------------------------------
alter table public.interview_requests
add column if not exists selected_slot timestamptz null;

-- ---------------------------------------------------------------------------
-- DEV ONLY: broaden UPDATE trigger so status and selected_slot may change together
-- (Replaces the function from 006_dev_update_interview_status.sql.)
-- Remove or tighten before production.
-- ---------------------------------------------------------------------------
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
    raise exception 'Only status and selected_slot may be updated (development guard)';
  end if;
  return new;
end;
$$;

-- Trigger already exists after 006; body points at this function name.
drop trigger if exists interview_requests_dev_only_status_update on public.interview_requests;

create trigger interview_requests_dev_only_status_update
before update on public.interview_requests
for each row
execute function public.interview_requests_dev_only_status_update();

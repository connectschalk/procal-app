-- 006_dev_update_interview_status.sql — DEVELOPMENT ONLY
-- Run in Supabase SQL Editor for the project in .env.local.
--
-- ⚠️ REMOVE UPDATE POLICY AND TRIGGER BEFORE PRODUCTION ⚠️
-- Anonymous clients can UPDATE interview_requests. The trigger limits changes to
-- the status column only. Replace with authenticated admin flows or service role
-- server routes before going live.

alter table public.interview_requests enable row level security;

drop policy if exists "Dev public update interview requests" on public.interview_requests;

create policy "Dev public update interview requests"
on public.interview_requests
for update
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- Guard: only status may change on UPDATE
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
    raise exception 'Only status may be updated (development guard)';
  end if;
  return new;
end;
$$;

drop trigger if exists interview_requests_dev_only_status_update on public.interview_requests;

create trigger interview_requests_dev_only_status_update
before update on public.interview_requests
for each row
execute function public.interview_requests_dev_only_status_update();

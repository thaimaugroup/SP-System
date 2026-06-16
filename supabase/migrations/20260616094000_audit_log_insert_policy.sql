-- Allow authenticated entity operators to write audit events for their own mutations.

drop policy if exists audit_logs_entity_insert on public.audit_logs;

create policy audit_logs_entity_insert
on public.audit_logs
for insert
to authenticated
with check (
  entity_id is not null
  and actor_user_id = public.current_profile_id()
  and public.user_can_mutate_entity(entity_id)
);

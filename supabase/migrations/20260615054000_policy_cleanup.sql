-- Cleanup low-risk advisor findings after the broad hardening pass.

drop index if exists public.idx_ws12_memory_embeddings_entity_id;

drop policy if exists entity_select on public.user_entity_roles;
drop policy if exists entity_insert on public.user_entity_roles;
drop policy if exists entity_update on public.user_entity_roles;
drop policy if exists entity_delete on public.user_entity_roles;

drop policy if exists user_entity_roles_self_select on public.user_entity_roles;
create policy user_entity_roles_self_select on public.user_entity_roles
for select using (
  user_id = public.current_profile_id()
  or public.user_has_entity_role(entity_id, array['owner', 'admin'])
);

create policy user_entity_roles_owner_admin_insert on public.user_entity_roles
for insert with check (public.user_has_entity_role(entity_id, array['owner', 'admin']));

create policy user_entity_roles_owner_admin_update on public.user_entity_roles
for update using (public.user_has_entity_role(entity_id, array['owner', 'admin']))
with check (public.user_has_entity_role(entity_id, array['owner', 'admin']));

create policy user_entity_roles_owner_admin_delete on public.user_entity_roles
for delete using (public.user_has_entity_role(entity_id, array['owner', 'admin']));

drop policy if exists workspace_registry_read_authenticated on public.workspace_registry;
create policy workspace_registry_read_authenticated on public.workspace_registry
for select using ((select auth.role()) = 'authenticated');

drop policy if exists import_validation_rules_read_authenticated on public.import_validation_rules;
create policy import_validation_rules_read_authenticated on public.import_validation_rules
for select using ((select auth.role()) = 'authenticated');


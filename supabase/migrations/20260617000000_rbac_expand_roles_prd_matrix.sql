-- PRD §10.2 RBAC: expand the RLS write-gate to recognize the full 11-role model.
-- Writing roles (create/edit/approve/reject/import/rollback) can mutate; read-only
-- roles (viewer, executive, auditor) cannot. Fine-grained per-action gating
-- (create vs approve vs import vs rollback) is enforced at the API layer via roleCan()
-- in lib/permissions/roles.ts — RLS is the coarse tenant + read-only backstop.
create or replace function private.user_can_mutate_entity(target_entity_id uuid)
  returns boolean language sql stable security definer
  set search_path to 'private', 'public' set row_security to 'off'
as $$
  select private.user_has_entity_role(
    target_entity_id,
    array[
      -- PRD roles that may write
      'system_admin','group_admin','entity_admin','workspace_owner',
      'contributor','reviewer','approver','ai_operator','import_manager',
      -- legacy aliases that may write
      'owner','admin','strategist','analyst','department_head'
    ]
  );
$$;

-- Note: private.user_can_view_record is unchanged. Only role 'viewer' is restricted
-- to approved records; reviewer / approver / auditor see drafts (they fall through to
-- the entity-access branch), matching PRD §10.2 "view draft records".

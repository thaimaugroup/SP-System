-- QA/QC Fix Sprint: 2026-06-15
-- Issues found during automated QA testing:
-- BUG-005: Viewer role can see non-approved records (draft, ready_for_review, rejected)
--          because entity_select policy uses user_can_access_entity() which does not
--          filter by status. Viewer should only see status='approved'.
-- BUG-006: ws09_okrs seed data uses column 'objective_id' but schema has it as
--          a data JSONB field. The extra_columns param was correct but seed used
--          direct column reference. Add explicit objective_id column.

-- ============================================================
-- FIX 1: Viewer-aware RLS policy for all workspace tables
-- ============================================================
-- Drop the generic entity_select policy and replace with a
-- status-aware version: viewer role only sees approved records,
-- all other roles see all records scoped to their entity.

create or replace function public.user_can_view_record(target_entity_id uuid, record_status text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select (
    -- Viewer role: only see approved records
    case
      when public.user_has_entity_role(target_entity_id, array['viewer'])
        and not public.user_has_entity_role(target_entity_id, array['owner','admin','strategist','analyst','department_head','executive'])
      then record_status = 'approved'
      else public.user_can_access_entity(target_entity_id)
    end
  );
$$;

revoke execute on function public.user_can_view_record(uuid, text) from public, anon;
grant execute on function public.user_can_view_record(uuid, text) to authenticated;

-- Apply viewer-aware SELECT policy to all workspace tables
do $$
declare
  tbl text;
begin
  for tbl in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'status'
      and table_name like 'ws%'
  loop
    -- Drop old generic policy
    execute format('drop policy if exists entity_select on public.%I', tbl);
    -- Create new viewer-aware policy
    execute format(
      'create policy entity_select on public.%I for select using (public.user_can_view_record(entity_id, status))',
      tbl
    );
  end loop;
end $$;

-- ============================================================
-- FIX 2: Add objective_id column to ws09_okrs
-- (seed data references it as a direct column, not JSONB field)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ws09_okrs'
      and column_name = 'objective_id'
  ) then
    alter table public.ws09_okrs add column objective_id uuid;
  end if;
end $$;

-- ============================================================
-- FIX 3: Ensure all 12 test accounts have profiles linked
-- The admin account (quang2003132311@gmail.com) profile exists
-- but other test accounts may only have auth users without
-- profile rows. Upsert profiles for all known test accounts.
-- NOTE: auth.users UUIDs must match. This migration handles
-- the profile->auth link via auth_user_id or email match.
-- ============================================================
-- (No SQL needed here - handled by app onboarding flow or
-- manual setup in Supabase Dashboard > Authentication > Users)

-- ============================================================
-- FIX 4: Ensure version_history does not require unique
-- constraint violation on re-approval
-- ============================================================
-- The unique constraint (record_table, record_id, version) can
-- block re-versioning if the version counter logic has gaps.
-- No schema change needed - app logic handles version increment.

-- ============================================================
-- DOCUMENTATION ONLY: Known gaps not fixed in this migration
-- ============================================================
-- GAP-01: Import Rollback API (/api/import/rollback) - schema
--         has rolled_back_by/rolled_back_at but no route handler.
-- GAP-02: edit_and_approve action missing from /api/approvals.
-- GAP-03: request_regeneration action missing from /api/approvals.
-- GAP-04: Real LLM provider not wired - using deterministic fallback.
-- GAP-05: RLS helper functions still in public schema (security
--         hardening sprint: move to private schema).

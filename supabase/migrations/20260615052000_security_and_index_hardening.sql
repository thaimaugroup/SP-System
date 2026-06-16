-- Hardening pass after advisor review.
-- Keeps RLS helper functions available to authenticated policy evaluation while removing anon/public RPC access.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.user_can_access_entity(uuid) from public, anon;
revoke execute on function public.user_can_mutate_entity(uuid) from public, anon;
revoke execute on function public.user_has_entity_role(uuid, text[]) from public, anon;

do $$
declare
  tbl record;
  col text;
  idx_name text;
  columns_to_index text[] := array[
    'entity_id',
    'group_id',
    'parent_entity_id',
    'division_id',
    'department_id',
    'team_id',
    'strategic_cycle_id',
    'workspace_code',
    'source_connector_id',
    'import_batch_id',
    'import_file_id',
    'import_row_id',
    'ai_run_id',
    'memory_entry_id',
    'created_by',
    'requested_by',
    'assigned_to',
    'reviewed_by',
    'committed_by',
    'rolled_back_by',
    'leader_user_id',
    'owner_user_id'
  ];
begin
  for tbl in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    foreach col in array columns_to_index
    loop
      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = tbl.tablename
          and column_name = col
      ) then
        idx_name := left('idx_' || tbl.tablename || '_' || col, 63);
        execute format('create index if not exists %I on public.%I (%I)', idx_name, tbl.tablename, col);
      end if;
    end loop;
  end loop;
end $$;


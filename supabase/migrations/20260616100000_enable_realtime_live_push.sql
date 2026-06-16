-- Enable Supabase Realtime live push for SIOS strategic data surfaces.
-- RLS is still enforced per authenticated session on postgres_changes, so this
-- does not widen data access; it only streams changes the user can already read.
do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and (
        tablename like 'ws%'
        or tablename in ('workspace_status', 'approval_requests', 'ai_runs')
      )
  loop
    -- REPLICA IDENTITY FULL so UPDATE/DELETE payloads carry the full row
    -- (needed for RLS evaluation and complete client-side reconciliation).
    execute format('alter table public.%I replica identity full;', t.tablename);

    -- Add to the supabase_realtime publication if not already a member.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t.tablename
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t.tablename);
    end if;
  end loop;
end $$;

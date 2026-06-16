-- GAP-05: Move internal RLS helper functions out of the API-exposed `public`
-- schema into a `private` schema so they are no longer callable via PostgREST RPC
-- by signed-in users. RLS keeps working because:
--   * SET SCHEMA preserves each function OID, so policies that reference them by
--     OID remain intact (no DROP, no CASCADE).
--   * `authenticated`/`anon` retain USAGE on `private` + EXECUTE on the helpers,
--     which RLS evaluation needs; PostgREST only exposes `public`, so they are
--     no longer reachable as RPC endpoints.
-- The two intentional app-facing RPCs (get_current_app_context, list_entity_user_roles)
-- stay in `public`; their bodies are repointed to the relocated helpers.

create schema if not exists private;
grant usage on schema private to authenticated, anon, service_role;

-- 1. Relocate helpers (OID preserved -> dependent policies unaffected).
alter function public.current_profile_id() set schema private;
alter function public.user_has_entity_role(uuid, text[]) set schema private;
alter function public.user_can_access_entity(uuid) set schema private;
alter function public.user_can_mutate_entity(uuid) set schema private;
alter function public.user_can_view_record(uuid, text) set schema private;

-- 2. Repoint inter-helper calls to the `private` schema (leaf-first order).
create or replace function private.current_profile_id()
  returns uuid language sql stable security definer
  set search_path to 'private', 'public' set row_security to 'off'
as $$
  select coalesce(
    (select p.id from public.profiles p
      where p.id = auth.uid() or p.auth_user_id = auth.uid() limit 1),
    auth.uid()
  );
$$;

create or replace function private.user_has_entity_role(target_entity_id uuid, allowed_roles text[])
  returns boolean language sql stable security definer
  set search_path to 'private', 'public' set row_security to 'off'
as $$
  select exists (
    select 1 from public.user_entity_roles uer
    where uer.entity_id = target_entity_id
      and uer.user_id = private.current_profile_id()
      and uer.role = any(allowed_roles)
  );
$$;

create or replace function private.user_can_access_entity(target_entity_id uuid)
  returns boolean language sql stable security definer
  set search_path to 'private', 'public' set row_security to 'off'
as $$
  select exists (
    select 1 from public.user_entity_roles uer
    where uer.entity_id = target_entity_id
      and uer.user_id = private.current_profile_id()
  );
$$;

create or replace function private.user_can_mutate_entity(target_entity_id uuid)
  returns boolean language sql stable security definer
  set search_path to 'private', 'public' set row_security to 'off'
as $$
  select private.user_has_entity_role(
    target_entity_id,
    array['owner', 'admin', 'strategist', 'analyst', 'department_head']
  );
$$;

create or replace function private.user_can_view_record(target_entity_id uuid, record_status text)
  returns boolean language sql stable security definer
  set search_path to 'private', 'public' set row_security to 'off'
as $$
  select (
    case
      when private.user_has_entity_role(target_entity_id, array['viewer'])
        and not private.user_has_entity_role(target_entity_id, array['owner','admin','strategist','analyst','department_head','executive'])
      then record_status = 'approved'
      else private.user_can_access_entity(target_entity_id)
    end
  );
$$;

-- 3. Repoint the two public callers to the relocated helpers.
create or replace function public.audit_entity_mutation()
  returns trigger language plpgsql security definer
  set search_path to 'public'
as $$
declare target_entity_id uuid;
begin
  target_entity_id := coalesce(new.entity_id, old.entity_id);
  insert into public.audit_logs(entity_id, actor_user_id, event_type, resource_type, resource_id, before_state, after_state, metadata)
  values(
    target_entity_id,
    private.current_profile_id(),
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    jsonb_build_object('schema', tg_table_schema)
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.list_entity_user_roles(target_entity_id uuid)
  returns table(user_id uuid, full_name text, email text, title text, role text)
  language sql stable security definer
  set search_path to 'public' set row_security to 'off'
as $$
  select uer.user_id, p.full_name, p.email, p.title, uer.role
  from public.user_entity_roles uer
  join public.profiles p on p.id = uer.user_id
  where uer.entity_id = target_entity_id
    and private.user_has_entity_role(target_entity_id, array['owner', 'admin'])
  order by p.full_name nulls last, p.email;
$$;

-- 4. Ensure RLS evaluators retain EXECUTE on the relocated helpers.
grant execute on function private.current_profile_id() to authenticated, anon, service_role;
grant execute on function private.user_has_entity_role(uuid, text[]) to authenticated, anon, service_role;
grant execute on function private.user_can_access_entity(uuid) to authenticated, anon, service_role;
grant execute on function private.user_can_mutate_entity(uuid) to authenticated, anon, service_role;
grant execute on function private.user_can_view_record(uuid, text) to authenticated, anon, service_role;

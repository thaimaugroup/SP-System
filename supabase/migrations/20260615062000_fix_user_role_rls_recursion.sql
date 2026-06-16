-- Fix recursive RLS evaluation on user_entity_roles.
-- The role helpers are used by policies across the strategic data graph, so they
-- must evaluate membership without re-entering user_entity_roles policies.

create or replace function public.user_has_entity_role(target_entity_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_entity_roles uer
    where uer.entity_id = target_entity_id
      and uer.user_id = public.current_profile_id()
      and uer.role = any(allowed_roles)
  );
$$;

create or replace function public.user_can_access_entity(target_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_entity_roles uer
    where uer.entity_id = target_entity_id
      and uer.user_id = public.current_profile_id()
  );
$$;

create or replace function public.user_can_mutate_entity(target_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.user_has_entity_role(
    target_entity_id,
    array['owner', 'admin', 'strategist', 'analyst', 'department_head']
  );
$$;

revoke execute on function public.user_has_entity_role(uuid, text[]) from public, anon;
revoke execute on function public.user_can_access_entity(uuid) from public, anon;
revoke execute on function public.user_can_mutate_entity(uuid) from public, anon;
grant execute on function public.user_has_entity_role(uuid, text[]) to authenticated;
grant execute on function public.user_can_access_entity(uuid) to authenticated;
grant execute on function public.user_can_mutate_entity(uuid) to authenticated;

drop policy if exists user_entity_roles_self_select on public.user_entity_roles;
create policy user_entity_roles_self_select on public.user_entity_roles
for select using (
  user_id = public.current_profile_id()
  or public.user_has_entity_role(entity_id, array['owner', 'admin'])
);

drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_or_entity_admin_select on public.profiles;
create policy profiles_self_or_entity_admin_select on public.profiles
for select using (
  id = public.current_profile_id()
  or auth_user_id = auth.uid()
  or exists (
    select 1
    from public.user_entity_roles target_role
    where target_role.user_id = profiles.id
      and public.user_has_entity_role(target_role.entity_id, array['owner', 'admin'])
  )
);

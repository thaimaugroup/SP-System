-- Keep user_entity_roles policy non-recursive and expose admin role review
-- through a controlled SECURITY DEFINER RPC.

drop policy if exists user_entity_roles_self_select on public.user_entity_roles;
create policy user_entity_roles_self_select on public.user_entity_roles
for select using (
  user_id = public.current_profile_id()
);

create or replace function public.list_entity_user_roles(target_entity_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  title text,
  role text
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    uer.user_id,
    p.full_name,
    p.email,
    p.title,
    uer.role
  from public.user_entity_roles uer
  join public.profiles p on p.id = uer.user_id
  where uer.entity_id = target_entity_id
    and public.user_has_entity_role(target_entity_id, array['owner', 'admin'])
  order by p.full_name nulls last, p.email;
$$;

revoke execute on function public.list_entity_user_roles(uuid) from public, anon;
grant execute on function public.list_entity_user_roles(uuid) to authenticated;

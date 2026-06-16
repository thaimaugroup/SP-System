-- Consolidate the app shell context into one RLS-safe RPC to reduce repeated
-- profile, role, entity, and cycle round trips on every route load.

create or replace function public.get_current_app_context()
returns table (
  profile_id uuid,
  profile jsonb,
  entity jsonb,
  cycle jsonb,
  role text
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with current_profile as (
    select p.*
    from public.profiles p
    where p.id = auth.uid()
       or p.auth_user_id = auth.uid()
    limit 1
  ),
  current_assignment as (
    select uer.*
    from public.user_entity_roles uer
    join current_profile p on p.id = uer.user_id
    order by uer.created_at asc
    limit 1
  ),
  selected_entity as (
    select e.*
    from public.entities e
    join current_profile p on e.id = coalesce(p.default_entity_id, (select entity_id from current_assignment))
    where exists (
      select 1
      from public.user_entity_roles uer
      where uer.user_id = p.id
        and uer.entity_id = e.id
    )
    limit 1
  ),
  active_cycle as (
    select sc.*
    from public.strategic_cycles sc
    join selected_entity e on e.id = sc.entity_id
    where sc.status = 'active'
    order by sc.start_date desc
    limit 1
  )
  select
    p.id as profile_id,
    jsonb_build_object(
      'email', p.email,
      'full_name', p.full_name,
      'title', p.title
    ) as profile,
    to_jsonb(e.*) as entity,
    to_jsonb(sc.*) as cycle,
    (
      select uer.role
      from public.user_entity_roles uer
      where uer.user_id = p.id
        and uer.entity_id = e.id
      order by uer.created_at asc
      limit 1
    ) as role
  from current_profile p
  left join selected_entity e on true
  left join active_cycle sc on true;
$$;

revoke execute on function public.get_current_app_context() from public, anon;
grant execute on function public.get_current_app_context() to authenticated;

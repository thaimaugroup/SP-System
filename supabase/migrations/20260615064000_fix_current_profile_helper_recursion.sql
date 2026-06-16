-- Avoid recursive profile policy evaluation when role helpers resolve the
-- current SIOS profile for the authenticated Supabase user.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select p.id
      from public.profiles p
      where p.id = auth.uid()
         or p.auth_user_id = auth.uid()
      limit 1
    ),
    auth.uid()
  );
$$;

revoke execute on function public.current_profile_id() from public, anon;
grant execute on function public.current_profile_id() to authenticated;

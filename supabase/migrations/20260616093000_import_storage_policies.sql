-- SIOS import storage policies
-- Imports are stored under imports/{entity_id}/... and scoped by user_entity_roles.

create or replace function public.import_storage_entity_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = public, storage
as $$
declare
  first_folder text;
begin
  first_folder := (storage.foldername(object_name))[1];

  if first_folder is null then
    return null;
  end if;

  if first_folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return first_folder::uuid;
  end if;

  return null;
end;
$$;

grant execute on function public.import_storage_entity_id(text) to authenticated;

drop policy if exists imports_select_by_entity_role on storage.objects;
drop policy if exists imports_insert_by_entity_role on storage.objects;
drop policy if exists imports_update_by_entity_role on storage.objects;
drop policy if exists imports_delete_by_entity_role on storage.objects;

create policy imports_select_by_entity_role
on storage.objects
for select
to authenticated
using (
  bucket_id = 'imports'
  and public.user_can_access_entity(public.import_storage_entity_id(name))
);

create policy imports_insert_by_entity_role
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'imports'
  and public.user_can_mutate_entity(public.import_storage_entity_id(name))
);

create policy imports_update_by_entity_role
on storage.objects
for update
to authenticated
using (
  bucket_id = 'imports'
  and public.user_can_mutate_entity(public.import_storage_entity_id(name))
)
with check (
  bucket_id = 'imports'
  and public.user_can_mutate_entity(public.import_storage_entity_id(name))
);

create policy imports_delete_by_entity_role
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'imports'
  and public.user_can_mutate_entity(public.import_storage_entity_id(name))
);

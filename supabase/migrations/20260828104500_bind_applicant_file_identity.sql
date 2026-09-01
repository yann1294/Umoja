-- Bind the database row to the same opaque UUID used by the AES-GCM file context.
drop function public.register_intake_file(text, uuid, text, text, text, text, integer, integer, text);

create function public.register_intake_file(
  p_file_id uuid,
  p_kind text,
  p_intake_id uuid,
  p_object_path text,
  p_encryption_key_version text,
  p_encrypted_metadata text,
  p_media_type text,
  p_original_size integer,
  p_encrypted_size integer,
  p_content_digest text
)
returns public.intake_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  created public.intake_files;
begin
  if p_kind = 'project' then
    select applicant_id into owner_id from public.project_intakes where id = p_intake_id and archived_at is null for update;
  elsif p_kind = 'talent' then
    select applicant_id into owner_id from public.talent_intakes where id = p_intake_id and archived_at is null for update;
  else
    raise exception 'invalid intake kind' using errcode = '22023';
  end if;
  if not found then raise exception 'intake unavailable' using errcode = '42501'; end if;
  insert into public.intake_files (
    id, project_intake_id, talent_intake_id, applicant_id, object_path,
    encryption_key_version, encrypted_metadata, media_type, original_size,
    encrypted_size, content_digest
  ) values (
    p_file_id,
    case when p_kind = 'project' then p_intake_id end,
    case when p_kind = 'talent' then p_intake_id end,
    owner_id, p_object_path, p_encryption_key_version, p_encrypted_metadata,
    p_media_type, p_original_size, p_encrypted_size, p_content_digest
  ) returning * into created;
  if p_kind = 'project' then
    update public.project_intakes set attachment_count = attachment_count + 1, updated_at = now()
    where id = p_intake_id;
  else
    update public.talent_intakes set attachment_count = attachment_count + 1, updated_at = now()
    where id = p_intake_id;
  end if;
  insert into public.audit_logs(action, target_type, target_id, after_digest)
  values ('intake.file.created', 'intake_file', created.id, p_content_digest);
  return created;
end
$$;

revoke all on function public.register_intake_file(uuid, text, uuid, text, text, text, text, integer, integer, text) from public;
grant execute on function public.register_intake_file(uuid, text, uuid, text, text, text, text, integer, integer, text) to service_role;

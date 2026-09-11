-- Keep applicant file metadata, attachment counts, and digest-only audits consistent.

create or replace function public.register_intake_file(
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
    project_intake_id, talent_intake_id, applicant_id, object_path,
    encryption_key_version, encrypted_metadata, media_type, original_size,
    encrypted_size, content_digest
  ) values (
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

create function public.archive_intake_file(p_file_id uuid, p_after_digest text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  file public.intake_files;
  kind text;
  intake_id uuid;
begin
  if p_after_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid digest' using errcode = '22023';
  end if;
  select * into file from public.intake_files where id = p_file_id and archived_at is null for update;
  if not found then raise exception 'file unavailable' using errcode = '42501'; end if;
  kind := case when file.project_intake_id is not null then 'project' else 'talent' end;
  intake_id := coalesce(file.project_intake_id, file.talent_intake_id);
  update public.intake_files set archived_at = now() where id = p_file_id;
  if kind = 'project' then
    update public.project_intakes
    set attachment_count = greatest(attachment_count - 1, 0), updated_at = now()
    where id = intake_id;
  else
    update public.talent_intakes
    set attachment_count = greatest(attachment_count - 1, 0), updated_at = now()
    where id = intake_id;
  end if;
  insert into public.audit_logs(action, target_type, target_id, before_digest, after_digest)
  values ('intake.file.archived', 'intake_file', p_file_id, file.content_digest, p_after_digest);
  return file.object_path;
end
$$;

revoke all on function public.register_intake_file(text, uuid, text, text, text, text, integer, integer, text) from public;
revoke all on function public.archive_intake_file(uuid, text) from public;
grant execute on function public.register_intake_file(text, uuid, text, text, text, text, integer, integer, text) to service_role;
grant execute on function public.archive_intake_file(uuid, text) to service_role;

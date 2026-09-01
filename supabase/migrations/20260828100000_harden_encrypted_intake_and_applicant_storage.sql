-- Harden the existing intake foundation without changing the active Appwrite runtime.
-- Public submissions and private-file operations enter through validated server boundaries only.

alter table public.project_intakes
  add column assigned_at timestamptz,
  add column assigned_by uuid references auth.users(id) on delete set null;
alter table public.talent_intakes
  add column assigned_at timestamptz,
  add column assigned_by uuid references auth.users(id) on delete set null;

alter table public.project_intakes
  add constraint project_intakes_assignment_consistency check (
    (assigned_reviewer_id is null and assigned_at is null and assigned_by is null)
    or (assigned_reviewer_id is not null and assigned_at is not null and assigned_by is not null)
  );
alter table public.talent_intakes
  add constraint talent_intakes_assignment_consistency check (
    (assigned_reviewer_id is null and assigned_at is null and assigned_by is null)
    or (assigned_reviewer_id is not null and assigned_at is not null and assigned_by is not null)
  );

create index project_intakes_reviewer_queue
  on public.project_intakes(assigned_reviewer_id, status, created_at desc)
  where archived_at is null;
create index talent_intakes_reviewer_queue
  on public.talent_intakes(assigned_reviewer_id, status, created_at desc)
  where archived_at is null;

create table public.intake_files (
  id uuid primary key default gen_random_uuid(),
  project_intake_id uuid references public.project_intakes(id) on delete restrict,
  talent_intake_id uuid references public.talent_intakes(id) on delete restrict,
  applicant_id uuid references auth.users(id) on delete set null,
  object_path text not null unique check (
    object_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.umojaenc$'
  ),
  encryption_key_version text not null check (encryption_key_version ~ '^v[1-9][0-9]*$'),
  encrypted_metadata text not null,
  media_type text not null check (media_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  )),
  original_size integer not null check (original_size between 1 and 10000000),
  encrypted_size integer not null check (encrypted_size between 1 and 10485760),
  content_digest text not null check (content_digest ~ '^[a-f0-9]{64}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint intake_files_one_parent check (
    (project_intake_id is not null)::integer + (talent_intake_id is not null)::integer = 1
  )
);
create index intake_files_project on public.intake_files(project_intake_id, created_at desc)
  where archived_at is null;
create index intake_files_talent on public.intake_files(talent_intake_id, created_at desc)
  where archived_at is null;
create index intake_files_owner on public.intake_files(applicant_id, created_at desc)
  where archived_at is null;

alter table public.intake_files enable row level security;
revoke all on public.intake_files from public, anon, authenticated;

create function private.account_active(subject uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as account
    where account.id = subject
      and account.deleted_at is null
      and (account.banned_until is null or account.banned_until <= now())
  )
$$;
revoke all on function private.account_active(uuid) from public;
grant execute on function private.account_active(uuid) to authenticated;

drop policy if exists intake_project_owner_read on public.project_intakes;
drop policy if exists intake_project_reviewer on public.project_intakes;
drop policy if exists intake_project_reviewer_update on public.project_intakes;
drop policy if exists intake_talent_owner_read on public.talent_intakes;
drop policy if exists intake_talent_reviewer on public.talent_intakes;
drop policy if exists intake_talent_reviewer_update on public.talent_intakes;

revoke update on public.project_intakes, public.talent_intakes from authenticated;

create policy intake_project_owner_read on public.project_intakes for select to authenticated
  using (applicant_id = auth.uid() and archived_at is null and private.account_active(auth.uid()));
create policy intake_project_reviewer_read on public.project_intakes for select to authenticated
  using (
    archived_at is null
    and private.account_active(auth.uid())
    and private.active_membership(auth.uid())
    and private.has_any_role(array['reviewer','admin']::public.umoja_role[])
  );
create policy intake_talent_owner_read on public.talent_intakes for select to authenticated
  using (applicant_id = auth.uid() and archived_at is null and private.account_active(auth.uid()));
create policy intake_talent_reviewer_read on public.talent_intakes for select to authenticated
  using (
    archived_at is null
    and private.account_active(auth.uid())
    and private.active_membership(auth.uid())
    and private.has_any_role(array['reviewer','admin']::public.umoja_role[])
  );

create function public.create_encrypted_project_intake(
  p_submission_id uuid,
  p_applicant_id uuid,
  p_email_lookup text,
  p_idempotency_key_hash text,
  p_encryption_key_version text,
  p_encrypted_payload text,
  p_service_areas text[],
  p_attachment_count integer,
  p_consent_at timestamptz,
  p_policy_version text,
  p_locale text,
  p_after_digest text
)
returns public.project_intakes
language plpgsql
security definer
set search_path = ''
as $$
declare created public.project_intakes;
begin
  if p_email_lookup !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_idempotency_key_hash !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_encryption_key_version !~ '^v[1-9][0-9]*$'
    or p_encrypted_payload !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or p_after_digest !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid encrypted intake envelope' using errcode = '22023';
  end if;
  insert into public.project_intakes (
    applicant_id, submission_id, email_lookup, idempotency_key_hash,
    encryption_key_version, encrypted_payload, service_areas, attachment_count,
    consent_at, policy_version, locale
  ) values (
    p_applicant_id, p_submission_id, p_email_lookup, p_idempotency_key_hash,
    p_encryption_key_version, p_encrypted_payload, p_service_areas, p_attachment_count,
    p_consent_at, p_policy_version, p_locale
  ) returning * into created;
  insert into public.audit_logs(action, target_type, target_id, after_digest)
  values ('intake.project.created', 'project_intake', created.id, p_after_digest);
  return created;
end
$$;

create function public.create_encrypted_talent_intake(
  p_submission_id uuid,
  p_applicant_id uuid,
  p_email_lookup text,
  p_idempotency_key_hash text,
  p_encryption_key_version text,
  p_encrypted_payload text,
  p_skill_areas text[],
  p_experience_band text,
  p_attachment_count integer,
  p_public_profile_consent boolean,
  p_application_consent_at timestamptz,
  p_data_processing_consent_at timestamptz,
  p_policy_version text,
  p_locale text,
  p_after_digest text
)
returns public.talent_intakes
language plpgsql
security definer
set search_path = ''
as $$
declare created public.talent_intakes;
begin
  if p_email_lookup !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_idempotency_key_hash !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_encryption_key_version !~ '^v[1-9][0-9]*$'
    or p_encrypted_payload !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or p_after_digest !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid encrypted intake envelope' using errcode = '22023';
  end if;
  insert into public.talent_intakes (
    applicant_id, submission_id, email_lookup, idempotency_key_hash,
    encryption_key_version, encrypted_payload, skill_areas, experience_band,
    attachment_count, public_profile_consent, application_consent_at,
    data_processing_consent_at, policy_version, locale
  ) values (
    p_applicant_id, p_submission_id, p_email_lookup, p_idempotency_key_hash,
    p_encryption_key_version, p_encrypted_payload, p_skill_areas, p_experience_band,
    p_attachment_count, p_public_profile_consent, p_application_consent_at,
    p_data_processing_consent_at, p_policy_version, p_locale
  ) returning * into created;
  insert into public.audit_logs(action, target_type, target_id, after_digest)
  values ('intake.talent.created', 'talent_intake', created.id, p_after_digest);
  return created;
end
$$;

create function public.update_intake_review(
  p_kind text,
  p_intake_id uuid,
  p_status public.intake_status,
  p_assigned_reviewer_id uuid,
  p_encrypted_internal_notes text,
  p_after_digest text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  previous_status public.intake_status;
  previous_reviewer uuid;
  is_admin boolean;
begin
  if actor is null
    or not private.account_active(actor)
    or not private.active_membership(actor)
    or not private.has_any_role(array['reviewer','admin']::public.umoja_role[])
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  is_admin := private.has_role('admin');
  if p_after_digest !~ '^[a-f0-9]{64}$'
    or (p_encrypted_internal_notes is not null and p_encrypted_internal_notes !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')
  then
    raise exception 'invalid review envelope' using errcode = '22023';
  end if;

  if p_kind = 'project' then
    select status, assigned_reviewer_id into previous_status, previous_reviewer
    from public.project_intakes where id = p_intake_id and archived_at is null for update;
  elsif p_kind = 'talent' then
    select status, assigned_reviewer_id into previous_status, previous_reviewer
    from public.talent_intakes where id = p_intake_id and archived_at is null for update;
  else
    raise exception 'invalid intake kind' using errcode = '22023';
  end if;
  if not found then raise exception 'intake unavailable' using errcode = '42501'; end if;
  if not is_admin and previous_reviewer is not null and previous_reviewer <> actor then
    raise exception 'not assigned' using errcode = '42501';
  end if;
  if not is_admin and p_assigned_reviewer_id is distinct from actor then
    raise exception 'reviewer may only self-assign' using errcode = '42501';
  end if;
  if p_assigned_reviewer_id is not null and not exists (
    select 1 from public.user_roles roles
    where roles.user_id = p_assigned_reviewer_id
      and roles.revoked_at is null
      and roles.role in ('reviewer', 'admin')
  ) then
    raise exception 'invalid reviewer assignment' using errcode = '42501';
  end if;
  if not (
    (previous_status = 'new' and p_status in ('triage','duplicate','closed'))
    or (previous_status = 'triage' and p_status in ('in_review','contacted','duplicate','closed'))
    or (previous_status = 'in_review' and p_status in ('triage','contacted','accepted','closed'))
    or (previous_status = 'contacted' and p_status in ('in_review','accepted','closed'))
    or (previous_status = 'accepted' and p_status = 'closed')
    or (previous_status = 'duplicate' and p_status = 'closed')
    or previous_status = p_status
  ) then
    raise exception 'invalid review transition' using errcode = '22023';
  end if;

  if p_kind = 'project' then
    update public.project_intakes set
      status = p_status,
      assigned_reviewer_id = p_assigned_reviewer_id,
      assigned_at = case when p_assigned_reviewer_id is null then null else now() end,
      assigned_by = case when p_assigned_reviewer_id is null then null else actor end,
      encrypted_internal_notes = p_encrypted_internal_notes,
      updated_at = now()
    where id = p_intake_id;
  else
    update public.talent_intakes set
      status = p_status,
      assigned_reviewer_id = p_assigned_reviewer_id,
      assigned_at = case when p_assigned_reviewer_id is null then null else now() end,
      assigned_by = case when p_assigned_reviewer_id is null then null else actor end,
      encrypted_internal_notes = p_encrypted_internal_notes,
      updated_at = now()
    where id = p_intake_id;
  end if;
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest, after_digest)
  values (
    actor,
    'intake.review.updated',
    p_kind || '_intake',
    p_intake_id,
    encode(extensions.digest(convert_to(previous_status::text || ':' || coalesce(previous_reviewer::text, ''), 'utf8'), 'sha256'), 'hex'),
    p_after_digest
  );
  return p_intake_id;
end
$$;

create function public.register_intake_file(
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
    select applicant_id into owner_id from public.project_intakes where id = p_intake_id and archived_at is null;
  elsif p_kind = 'talent' then
    select applicant_id into owner_id from public.talent_intakes where id = p_intake_id and archived_at is null;
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
  insert into public.audit_logs(action, target_type, target_id, after_digest)
  values ('intake.file.created', 'intake_file', created.id, p_content_digest);
  return created;
end
$$;

revoke all on function public.create_encrypted_project_intake(uuid, uuid, text, text, text, text, text[], integer, timestamptz, text, text, text) from public;
revoke all on function public.create_encrypted_talent_intake(uuid, uuid, text, text, text, text, text[], text, integer, boolean, timestamptz, timestamptz, text, text, text) from public;
revoke all on function public.update_intake_review(text, uuid, public.intake_status, uuid, text, text) from public;
revoke all on function public.register_intake_file(text, uuid, text, text, text, text, integer, integer, text) from public;
grant execute on function public.create_encrypted_project_intake(uuid, uuid, text, text, text, text, text[], integer, timestamptz, text, text, text) to service_role;
grant execute on function public.create_encrypted_talent_intake(uuid, uuid, text, text, text, text, text[], text, integer, boolean, timestamptz, timestamptz, text, text, text) to service_role;
grant execute on function public.update_intake_review(text, uuid, public.intake_status, uuid, text, text) to authenticated;
grant execute on function public.register_intake_file(text, uuid, text, text, text, text, integer, integer, text) to service_role;

drop policy if exists applicant_private_review_read on storage.objects;
drop policy if exists applicant_private_review_write on storage.objects;
drop policy if exists applicant_private_review_update on storage.objects;
drop policy if exists applicant_private_admin_delete on storage.objects;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/octet-stream']
where id = 'applicant-private';

drop policy if exists intake_audit_reviewer_read on public.audit_logs;
create policy intake_audit_reviewer_read on public.audit_logs for select to authenticated
  using (
    target_type in ('project_intake','talent_intake','intake_file')
    and private.account_active(auth.uid())
    and private.active_membership(auth.uid())
    and private.has_role('reviewer')
    and (
      (target_type = 'project_intake' and exists (
        select 1 from public.project_intakes intake
        where intake.id = target_id and intake.archived_at is null
      ))
      or (target_type = 'talent_intake' and exists (
        select 1 from public.talent_intakes intake
        where intake.id = target_id and intake.archived_at is null
      ))
      or (target_type = 'intake_file' and exists (
        select 1 from public.intake_files file where file.id = target_id and file.archived_at is null
      ))
    )
  );

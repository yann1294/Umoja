-- Durable public-intake orchestration and quarantine state for the remote-only spike.
create table private.intake_rate_limits (
  key_digest text primary key check (key_digest ~ '^[a-f0-9]{64}$'),
  attempt_count integer not null check (attempt_count > 0),
  window_started_at timestamptz not null,
  window_expires_at timestamptz not null,
  constraint intake_rate_limit_window check (window_expires_at > window_started_at)
);
revoke all on private.intake_rate_limits from public, anon, authenticated;

create table private.intake_idempotency_claims (
  key_hash text primary key check (key_hash ~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'),
  expires_at timestamptz not null,
  submission_id uuid,
  public_reference text,
  completed_at timestamptz
);
revoke all on private.intake_idempotency_claims from public, anon, authenticated;

alter table public.project_intakes
  add column public_reference text unique
    check (public_reference is null or public_reference ~ '^UP-[A-Z0-9]{12}$');
alter table public.talent_intakes
  add column public_reference text unique
    check (public_reference is null or public_reference ~ '^UT-[A-Z0-9]{12}$');

create type public.intake_file_scan_status as enum ('quarantined', 'clean', 'rejected');
alter table public.intake_files
  add column scan_status public.intake_file_scan_status not null default 'quarantined',
  add column scanned_at timestamptz,
  add constraint intake_file_scan_consistency check (
    (scan_status = 'quarantined' and scanned_at is null)
    or (scan_status in ('clean', 'rejected') and scanned_at is not null)
  );

create function public.check_intake_rate_limit(
  p_key_digest text,
  p_limit integer default 8,
  p_window_seconds integer default 600
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare current private.intake_rate_limits; now_utc timestamptz := now();
begin
  if p_key_digest !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit request' using errcode = '22023';
  end if;
  insert into private.intake_rate_limits(key_digest, attempt_count, window_started_at, window_expires_at)
  values (p_key_digest, 1, now_utc, now_utc + make_interval(secs => p_window_seconds))
  on conflict (key_digest) do update set
    attempt_count = case
      when private.intake_rate_limits.window_expires_at <= now_utc then 1
      else private.intake_rate_limits.attempt_count + 1 end,
    window_started_at = case
      when private.intake_rate_limits.window_expires_at <= now_utc then now_utc
      else private.intake_rate_limits.window_started_at end,
    window_expires_at = case
      when private.intake_rate_limits.window_expires_at <= now_utc
        then now_utc + make_interval(secs => p_window_seconds)
      else private.intake_rate_limits.window_expires_at end
  returning * into current;
  return query select current.attempt_count <= p_limit,
    case when current.attempt_count <= p_limit then 0
      else greatest(1, ceil(extract(epoch from current.window_expires_at - now_utc))::integer) end;
end
$$;

create function public.claim_intake_idempotency(p_key_hash text, p_expires_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare inserted_count integer;
begin
  if p_key_hash !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$' or p_expires_at <= now() then
    raise exception 'invalid idempotency claim' using errcode = '22023';
  end if;
  delete from private.intake_idempotency_claims claim
    where claim.key_hash = p_key_hash and claim.expires_at <= now() and claim.completed_at is null;
  insert into private.intake_idempotency_claims(key_hash, expires_at)
  values (p_key_hash, p_expires_at) on conflict do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end
$$;

create function public.complete_intake_idempotency(
  p_key_hash text,
  p_submission_id uuid,
  p_public_reference text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.intake_idempotency_claims set
    submission_id = p_submission_id,
    public_reference = p_public_reference,
    completed_at = now()
  where key_hash = p_key_hash and completed_at is null;
  if not found then raise exception 'idempotency claim unavailable' using errcode = '42501'; end if;
end
$$;

create function public.release_intake_idempotency(p_key_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.intake_idempotency_claims
    where key_hash = p_key_hash and completed_at is null;
end
$$;

revoke all on function public.check_intake_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_intake_idempotency(text, timestamptz) from public, anon, authenticated;
revoke all on function public.complete_intake_idempotency(text, uuid, text) from public, anon, authenticated;
revoke all on function public.release_intake_idempotency(text) from public, anon, authenticated;
grant execute on function public.check_intake_rate_limit(text, integer, integer) to service_role;
grant execute on function public.claim_intake_idempotency(text, timestamptz) to service_role;
grant execute on function public.complete_intake_idempotency(text, uuid, text) to service_role;
grant execute on function public.release_intake_idempotency(text) to service_role;

-- Public creation RPCs receive a separate non-secret reference. Anonymous ownership stays NULL.
drop function public.create_encrypted_project_intake(uuid, uuid, text, text, text, text, text[], integer, timestamptz, text, text, text);
create function public.create_encrypted_project_intake(
  p_submission_id uuid, p_applicant_id uuid, p_public_reference text,
  p_email_lookup text, p_idempotency_key_hash text, p_encryption_key_version text,
  p_encrypted_payload text, p_service_areas text[], p_attachment_count integer,
  p_consent_at timestamptz, p_policy_version text, p_locale text, p_after_digest text
)
returns public.project_intakes language plpgsql security definer set search_path = '' as $$
declare created public.project_intakes;
begin
  if p_applicant_id is not null or p_public_reference !~ '^UP-[A-Z0-9]{12}$'
    or p_email_lookup !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_idempotency_key_hash !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_encryption_key_version !~ '^v[1-9][0-9]*$'
    or p_encrypted_payload !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or p_after_digest !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid encrypted intake envelope' using errcode = '22023'; end if;
  insert into public.project_intakes(
    applicant_id, submission_id, public_reference, email_lookup, idempotency_key_hash,
    encryption_key_version, encrypted_payload, service_areas, attachment_count,
    consent_at, policy_version, locale
  ) values (
    null, p_submission_id, p_public_reference, p_email_lookup, p_idempotency_key_hash,
    p_encryption_key_version, p_encrypted_payload, p_service_areas, p_attachment_count,
    p_consent_at, p_policy_version, p_locale
  ) returning * into created;
  insert into public.audit_logs(action, target_type, target_id, after_digest)
  values ('intake.project.created', 'project_intake', created.id, p_after_digest);
  return created;
end $$;

drop function public.create_encrypted_talent_intake(uuid, uuid, text, text, text, text, text[], text, integer, boolean, timestamptz, timestamptz, text, text, text);
create function public.create_encrypted_talent_intake(
  p_submission_id uuid, p_applicant_id uuid, p_public_reference text,
  p_email_lookup text, p_idempotency_key_hash text, p_encryption_key_version text,
  p_encrypted_payload text, p_skill_areas text[], p_experience_band text,
  p_attachment_count integer, p_public_profile_consent boolean,
  p_application_consent_at timestamptz, p_data_processing_consent_at timestamptz,
  p_policy_version text, p_locale text, p_after_digest text
)
returns public.talent_intakes language plpgsql security definer set search_path = '' as $$
declare created public.talent_intakes;
begin
  if p_applicant_id is not null or p_public_reference !~ '^UT-[A-Z0-9]{12}$'
    or p_email_lookup !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_idempotency_key_hash !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_encryption_key_version !~ '^v[1-9][0-9]*$'
    or p_encrypted_payload !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or p_after_digest !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid encrypted intake envelope' using errcode = '22023'; end if;
  insert into public.talent_intakes(
    applicant_id, submission_id, public_reference, email_lookup, idempotency_key_hash,
    encryption_key_version, encrypted_payload, skill_areas, experience_band, attachment_count,
    public_profile_consent, application_consent_at, data_processing_consent_at, policy_version, locale
  ) values (
    null, p_submission_id, p_public_reference, p_email_lookup, p_idempotency_key_hash,
    p_encryption_key_version, p_encrypted_payload, p_skill_areas, p_experience_band, p_attachment_count,
    p_public_profile_consent, p_application_consent_at, p_data_processing_consent_at, p_policy_version, p_locale
  ) returning * into created;
  insert into public.audit_logs(action, target_type, target_id, after_digest)
  values ('intake.talent.created', 'talent_intake', created.id, p_after_digest);
  return created;
end $$;

revoke all on function public.create_encrypted_project_intake(uuid, uuid, text, text, text, text, text, text[], integer, timestamptz, text, text, text)
  from public, anon, authenticated;
revoke all on function public.create_encrypted_talent_intake(uuid, uuid, text, text, text, text, text, text[], text, integer, boolean, timestamptz, timestamptz, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_encrypted_project_intake(uuid, uuid, text, text, text, text, text, text[], integer, timestamptz, text, text, text)
  to service_role;
grant execute on function public.create_encrypted_talent_intake(uuid, uuid, text, text, text, text, text, text[], text, integer, boolean, timestamptz, timestamptz, text, text, text)
  to service_role;

-- Operations review cannot perform the governance/commercial acceptance transition.
create or replace function private.reject_reserved_intake_acceptance()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    raise exception 'governance approval required' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.reject_reserved_intake_acceptance() from public, anon, authenticated;
create trigger project_intakes_reject_reserved_acceptance
  before update of status on public.project_intakes
  for each row execute function private.reject_reserved_intake_acceptance();
create trigger talent_intakes_reject_reserved_acceptance
  before update of status on public.talent_intakes
  for each row execute function private.reject_reserved_intake_acceptance();

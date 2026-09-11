-- Atomic, actor-bound profile workflows. Every mutation writes its digest-only audit in the same transaction.
create or replace function public.save_profile_with_audit(
  profile_user_id uuid, professional_name text, profile_locale text, profile_country text,
  profile_bio text, profile_slug text, profile_visibility public.profile_visibility,
  requested_state public.profile_publication_state, consent_given boolean,
  expected_updated_at timestamptz default null, private_envelope text default null,
  private_key_version text default null
) returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles; old_digest text; new_digest text;
begin
  if auth.uid() is null or auth.uid() <> profile_user_id then raise exception 'not authorized' using errcode = '42501'; end if;
  if expected_updated_at is not null and exists(select 1 from public.profiles where user_id = profile_user_id and updated_at <> expected_updated_at) then raise exception 'stale profile' using errcode = '40001'; end if;
  if requested_state = 'approved' then raise exception 'owner approval blocked' using errcode = '42501'; end if;
  select encode(extensions.digest(coalesce(row_to_json(p)::text,''), 'sha256'),'hex') into old_digest from public.profiles p where p.user_id = profile_user_id;
  insert into public.profiles(user_id, professional_name, locale, country_code, public_bio, public_slug, visibility, public_consent_at, consent_version, publication_state)
  values(profile_user_id, professional_name, profile_locale, nullif(profile_country,''), nullif(profile_bio,''), nullif(profile_slug,''), profile_visibility,
    case when consent_given then now() else null end, case when consent_given then 'profile-public-v1' else null end, requested_state)
  on conflict (user_id) do update set professional_name=excluded.professional_name, locale=excluded.locale, country_code=excluded.country_code, public_bio=excluded.public_bio, public_slug=excluded.public_slug, visibility=excluded.visibility,
    public_consent_at=case when consent_given then coalesce(public.profiles.public_consent_at, now()) else null end,
    consent_version=case when consent_given then coalesce(public.profiles.consent_version, 'profile-public-v1') else null end,
    publication_state=excluded.publication_state, updated_at=now()
  returning * into result;
  if private_envelope is not null then
    insert into public.private_profile_details(user_id, encryption_key_version, encrypted_payload, consent_at)
    values(profile_user_id, private_key_version, private_envelope, now())
    on conflict (user_id) do update set encryption_key_version=excluded.encryption_key_version, encrypted_payload=excluded.encrypted_payload, consent_at=excluded.consent_at, updated_at=now();
  end if;
  select encode(extensions.digest(row_to_json(result)::text, 'sha256'),'hex') into new_digest;
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest, after_digest) values(auth.uid(), 'profile.save', 'profile', profile_user_id, old_digest, new_digest);
  return result;
end $$;
revoke all on function public.save_profile_with_audit(uuid,text,text,text,text,text,public.profile_visibility,public.profile_publication_state,boolean,timestamptz,text,text) from public;
grant execute on function public.save_profile_with_audit(uuid,text,text,text,text,text,public.profile_visibility,public.profile_publication_state,boolean,timestamptz,text,text) to authenticated;

create or replace function public.moderate_profile(profile_user_id uuid, decision public.profile_publication_state, expected_state public.profile_publication_state)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles; old_digest text; new_digest text;
begin
  if not private.has_role('admin') then raise exception 'not authorized' using errcode = '42501'; end if;
  select p.* into result from public.profiles p where p.user_id=profile_user_id and p.publication_state=expected_state and p.archived_at is null and p.public_consent_at is not null and p.user_id <> auth.uid() for update;
  if not found then raise exception 'stale moderation decision' using errcode = '40001'; end if;
  old_digest := encode(extensions.digest(row_to_json(result)::text,'sha256'),'hex');
  if not ((expected_state='submitted' and decision in ('approved','changes_requested')) or (expected_state='approved' and decision='revoked')) then raise exception 'invalid transition' using errcode = '42501'; end if;
  update public.profiles set publication_state=decision, updated_at=now() where user_id=profile_user_id returning * into result;
  select encode(extensions.digest(row_to_json(result)::text,'sha256'),'hex') into new_digest;
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest, after_digest) values(auth.uid(), 'profile.moderate', 'profile', profile_user_id, old_digest, new_digest);
  return result;
end $$;
revoke all on function public.moderate_profile(uuid,public.profile_publication_state,public.profile_publication_state) from public;
grant execute on function public.moderate_profile(uuid,public.profile_publication_state,public.profile_publication_state) to authenticated;

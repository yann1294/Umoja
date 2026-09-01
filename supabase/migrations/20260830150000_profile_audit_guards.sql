-- Child-resource audit triggers make direct table mutations auditable and atomic.
create or replace function private.profile_mutation_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare subject uuid := coalesce(new.profile_id, old.profile_id, new.user_id, old.user_id);
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest, after_digest)
  values(auth.uid(), lower(tg_op), tg_table_name, subject,
    case when tg_op <> 'INSERT' then encode(extensions.digest(row_to_json(old)::text,'sha256'),'hex') end,
    case when tg_op <> 'DELETE' then encode(extensions.digest(row_to_json(new)::text,'sha256'),'hex') end);
  return coalesce(new, old);
end $$;
revoke all on function private.profile_mutation_audit() from public;
drop trigger if exists profile_skills_audit on public.profile_skills;
create trigger profile_skills_audit after insert or update or delete on public.profile_skills for each row execute function private.profile_mutation_audit();
drop trigger if exists profile_languages_audit on public.profile_languages;
create trigger profile_languages_audit after insert or update or delete on public.profile_languages for each row execute function private.profile_mutation_audit();
drop trigger if exists portfolio_items_audit on public.portfolio_items;
create trigger portfolio_items_audit after insert or update or delete on public.portfolio_items for each row execute function private.profile_mutation_audit();
drop trigger if exists availability_snapshots_audit on public.availability_snapshots;
create trigger availability_snapshots_audit after insert or update or delete on public.availability_snapshots for each row execute function private.profile_mutation_audit();
drop trigger if exists private_profile_details_audit on public.private_profile_details;
create trigger private_profile_details_audit after insert or update or delete on public.private_profile_details for each row execute function private.profile_mutation_audit();

create or replace function private.guard_availability_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.weekly_hours is distinct from old.weekly_hours or new.next_available_on is distinct from old.next_available_on or new.work_mode is distinct from old.work_mode or new.confirmed_at is distinct from old.confirmed_at or new.expires_at is distinct from old.expires_at) then
    raise exception 'availability snapshots are immutable' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.guard_availability_history() from public;
drop trigger if exists availability_immutable on public.availability_snapshots;
create trigger availability_immutable before update on public.availability_snapshots for each row execute function private.guard_availability_history();

-- RPCs independently enforce account status and admin membership.
create or replace function private.active_verified_account(subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id = subject and email_confirmed_at is not null and banned_until is null)
$$;
revoke all on function private.active_verified_account(uuid) from public;

create or replace function public.save_profile_with_audit(
  profile_user_id uuid, professional_name text, profile_locale text, profile_country text,
  profile_bio text, profile_slug text, profile_visibility public.profile_visibility,
  requested_state public.profile_publication_state, consent_given boolean,
  expected_updated_at timestamptz default null, private_envelope text default null,
  private_key_version text default null
) returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles; old_digest text; new_digest text;
begin
  if not private.active_verified_account(auth.uid()) or auth.uid() <> profile_user_id then raise exception 'not authorized' using errcode = '42501'; end if;
  if expected_updated_at is not null and exists(select 1 from public.profiles where user_id = profile_user_id and updated_at <> expected_updated_at) then raise exception 'stale profile' using errcode = '40001'; end if;
  if requested_state = 'approved' then raise exception 'owner approval blocked' using errcode = '42501'; end if;
  select encode(extensions.digest(coalesce(row_to_json(p)::text,''), 'sha256'),'hex') into old_digest from public.profiles p where p.user_id = profile_user_id;
  insert into public.profiles(user_id, professional_name, locale, country_code, public_bio, public_slug, visibility, public_consent_at, consent_version, publication_state)
  values(profile_user_id, professional_name, profile_locale, nullif(profile_country,''), nullif(profile_bio,''), nullif(profile_slug,''), profile_visibility, case when consent_given then now() else null end, case when consent_given then 'profile-public-v1' else null end, requested_state)
  on conflict (user_id) do update set professional_name=excluded.professional_name, locale=excluded.locale, country_code=excluded.country_code, public_bio=excluded.public_bio, public_slug=excluded.public_slug, visibility=excluded.visibility, public_consent_at=case when consent_given then coalesce(public.profiles.public_consent_at, now()) else null end, consent_version=case when consent_given then coalesce(public.profiles.consent_version, 'profile-public-v1') else null end, publication_state=excluded.publication_state, updated_at=now() returning * into result;
  if private_envelope is not null then insert into public.private_profile_details(user_id, encryption_key_version, encrypted_payload, consent_at) values(profile_user_id, private_key_version, private_envelope, now()) on conflict (user_id) do update set encryption_key_version=excluded.encryption_key_version, encrypted_payload=excluded.encrypted_payload, consent_at=excluded.consent_at, updated_at=now(); end if;
  select encode(extensions.digest(row_to_json(result)::text, 'sha256'),'hex') into new_digest;
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest, after_digest) values(auth.uid(), 'profile.save', 'profile', profile_user_id, old_digest, new_digest);
  return result;
end $$;

create or replace function public.moderate_profile(profile_user_id uuid, decision public.profile_publication_state, expected_state public.profile_publication_state)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles; old_digest text; new_digest text;
begin
  if not private.active_verified_account(auth.uid()) or not private.has_role('admin') or not private.active_membership(auth.uid()) then raise exception 'not authorized' using errcode = '42501'; end if;
  select p.* into result from public.profiles p where p.user_id=profile_user_id and p.publication_state=expected_state and p.archived_at is null and p.public_consent_at is not null and p.user_id <> auth.uid() for update;
  if not found then raise exception 'stale moderation decision' using errcode = '40001'; end if;
  if not ((expected_state='submitted' and decision in ('approved','changes_requested')) or (expected_state='approved' and decision='revoked')) then raise exception 'invalid transition' using errcode = '42501'; end if;
  old_digest := encode(extensions.digest(row_to_json(result)::text,'sha256'),'hex');
  update public.profiles set publication_state=decision, updated_at=now() where user_id=profile_user_id returning * into result;
  new_digest := encode(extensions.digest(row_to_json(result)::text,'sha256'),'hex');
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest, after_digest) values(auth.uid(), 'profile.moderate', 'profile', profile_user_id, old_digest, new_digest);
  return result;
end $$;

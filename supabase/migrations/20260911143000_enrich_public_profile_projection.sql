-- Add approved public profile enrichment fields without exposing private details.
alter table public.profiles
  add column if not exists public_headline text check (public_headline is null or char_length(public_headline) <= 180),
  add column if not exists public_avatar_url text check (public_avatar_url is null or public_avatar_url ~ '^https?://'),
  add column if not exists public_website_url text check (public_website_url is null or public_website_url ~ '^https?://'),
  add column if not exists public_professional_links jsonb not null default '[]'::jsonb check (jsonb_typeof(public_professional_links) = 'array');

alter table public.portfolio_items
  add column if not exists technologies text[] not null default '{}'::text[] check (cardinality(technologies) <= 12);

alter table public.availability_snapshots
  add column if not exists public_consent_at timestamptz;

create or replace function public.save_profile_with_audit(
  profile_user_id uuid, professional_name text, profile_locale text, profile_country text,
  profile_bio text, profile_slug text, profile_visibility public.profile_visibility,
  requested_state public.profile_publication_state, consent_given boolean,
  expected_updated_at timestamptz default null, private_envelope text default null,
  private_key_version text default null, profile_headline text default null,
  profile_avatar_url text default null, profile_website_url text default null,
  profile_professional_links jsonb default '[]'::jsonb
) returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles; current_updated_at timestamptz; old_digest text; new_digest text;
begin
  if not private.active_verified_account(auth.uid()) or auth.uid() <> profile_user_id then raise exception 'not authorized' using errcode = '42501'; end if;
  select p.updated_at into current_updated_at from public.profiles p where p.user_id = profile_user_id for update;
  if expected_updated_at is not null and current_updated_at is distinct from expected_updated_at then raise exception 'stale profile' using errcode = 'PT409'; end if;
  if requested_state = 'approved' then raise exception 'owner approval blocked' using errcode = '42501'; end if;
  if profile_avatar_url is not null and profile_avatar_url !~ '^https?://' then raise exception 'invalid public avatar url' using errcode = '22023'; end if;
  if profile_website_url is not null and profile_website_url !~ '^https?://' then raise exception 'invalid public website url' using errcode = '22023'; end if;
  if profile_professional_links is null or jsonb_typeof(profile_professional_links) <> 'array' then raise exception 'invalid public links' using errcode = '22023'; end if;
  select encode(extensions.digest(coalesce(row_to_json(p)::text,''), 'sha256'),'hex') into old_digest from public.profiles p where p.user_id = profile_user_id;
  insert into public.profiles(
    user_id, professional_name, locale, country_code, public_bio, public_slug, visibility,
    public_consent_at, consent_version, publication_state, public_headline, public_avatar_url,
    public_website_url, public_professional_links
  )
  values(
    profile_user_id, professional_name, profile_locale, nullif(profile_country,''), nullif(profile_bio,''),
    nullif(profile_slug,''), profile_visibility, case when consent_given then now() else null end,
    case when consent_given then 'profile-public-v1' else null end, requested_state,
    nullif(profile_headline,''), profile_avatar_url, profile_website_url,
    coalesce(profile_professional_links, '[]'::jsonb)
  )
  on conflict (user_id) do update set
    professional_name=excluded.professional_name,
    locale=excluded.locale,
    country_code=excluded.country_code,
    public_bio=excluded.public_bio,
    public_slug=excluded.public_slug,
    visibility=excluded.visibility,
    public_consent_at=case when consent_given then coalesce(public.profiles.public_consent_at, now()) else null end,
    consent_version=case when consent_given then coalesce(public.profiles.consent_version, 'profile-public-v1') else null end,
    publication_state=excluded.publication_state,
    public_headline=excluded.public_headline,
    public_avatar_url=excluded.public_avatar_url,
    public_website_url=excluded.public_website_url,
    public_professional_links=excluded.public_professional_links,
    updated_at=now()
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

drop view if exists public.public_profile_availability;
create view public.public_profile_availability as
select distinct on (a.profile_id)
  a.profile_id, a.work_mode, a.next_available_on, a.expires_at
from public.availability_snapshots a
join public.profiles p on p.user_id = a.profile_id
where p.publication_state = 'approved'
  and p.visibility = 'public'
  and p.public_consent_at is not null
  and p.archived_at is null
  and a.archived_at is null
  and a.public_consent_at is not null
  and a.expires_at > now()
order by a.profile_id, a.expires_at desc;

revoke all on public.public_profile_availability from public, anon, authenticated;
grant select on public.public_profile_availability to anon, authenticated;

drop view if exists public.public_profiles;
create view public.public_profiles as
select
  user_id, public_slug, professional_name, locale, country_code, public_bio,
  public_headline, public_avatar_url, public_website_url, public_professional_links
from public.profiles
where publication_state = 'approved' and visibility = 'public' and public_consent_at is not null and archived_at is null;
revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

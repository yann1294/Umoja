-- The public projection is deliberately a restricted security-definer view: only its allow-listed
-- columns and approved/consented rows are available to anonymous PostgREST callers.
drop view if exists public.public_profiles;
create view public.public_profiles as
select public_slug, professional_name, locale, country_code, public_bio
from public.profiles
where publication_state = 'approved' and visibility = 'public'
  and public_consent_at is not null and archived_at is null;
revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- Forward correction: close the authorization and direct-publication gaps in the first slice.
alter table public.languages enable row level security;
alter table public.profile_languages enable row level security;

drop policy if exists profiles_owner_write on public.profiles;
create policy profiles_owner_insert on public.profiles for insert to authenticated
  with check (user_id = auth.uid() and publication_state in ('private','draft'));
create policy profiles_owner_write on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and publication_state in ('private','draft','submitted','changes_requested','revoked'));

grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.profile_skills, public.portfolio_items to authenticated;

-- Never expose the base profile row to anonymous PostgREST. The projection is the public contract.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to authenticated
  using (publication_state = 'approved' and visibility = 'public' and public_consent_at is not null and archived_at is null);
drop view if exists public.public_profiles;
create view public.public_profiles with (security_invoker = true) as
select user_id, public_slug, professional_name, locale, country_code, public_bio
from public.profiles
where publication_state = 'approved' and visibility = 'public' and public_consent_at is not null and archived_at is null;
revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- No client may mutate the global catalogue.
revoke insert, update, delete on public.skills, public.languages from anon, authenticated;

insert into public.languages(code, display_label_en, display_label_fr) values
  ('en', 'English', 'Anglais'), ('fr', 'French', 'Français'), ('sw', 'Swahili', 'Swahili'),
  ('ar', 'Arabic', 'Arabe'), ('pt', 'Portuguese', 'Portugais')
on conflict (code) do nothing;
insert into public.skills(canonical_name, category) values
  ('TypeScript', 'Engineering'), ('React', 'Engineering'), ('Next.js', 'Engineering'),
  ('Product design', 'Design'), ('Data analysis', 'Data'), ('Project management', 'Delivery')
on conflict do nothing;

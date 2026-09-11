-- Keep anonymous reads on approved public profile child rows without exposing base profile rows.
-- The base profiles table remains private to anonymous clients; public child policies call a
-- narrow security-definer predicate that checks only the approved/consented profile publication gate.

create or replace function private.public_profile_visible(profile_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = profile_user_id
      and p.publication_state = 'approved'
      and p.visibility = 'public'
      and p.public_consent_at is not null
      and p.archived_at is null
  );
$$;

revoke all on function private.public_profile_visible(uuid) from public;
grant execute on function private.public_profile_visible(uuid) to anon, authenticated;

drop policy if exists profile_skills_public_read on public.profile_skills;
create policy profile_skills_public_read on public.profile_skills
  for select to anon, authenticated
  using (private.public_profile_visible(profile_id));

drop policy if exists profile_languages_public_read on public.profile_languages;
create policy profile_languages_public_read on public.profile_languages
  for select to anon, authenticated
  using (
    public_consent_at is not null
    and verification in ('self_reported','verified')
    and private.public_profile_visible(profile_id)
  );

drop policy if exists portfolio_public_read on public.portfolio_items;
create policy portfolio_public_read on public.portfolio_items
  for select to anon, authenticated
  using (
    publication_state = 'approved'
    and public_consent_at is not null
    and archived_at is null
    and private.public_profile_visible(profile_id)
  );

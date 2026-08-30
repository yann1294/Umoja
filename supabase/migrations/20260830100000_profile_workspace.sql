-- Prompt 12: additive profile workspace model. Existing foundation tables are extended in place.
create type public.profile_publication_state as enum
  ('private', 'draft', 'submitted', 'approved', 'changes_requested', 'revoked');
create type public.language_verification as enum ('self_reported', 'verified');
create type public.portfolio_publication_state as enum
  ('private', 'submitted', 'approved', 'changes_requested', 'revoked');

alter table public.profiles
  add column publication_state public.profile_publication_state not null default 'private';
update public.profiles
set publication_state = (case when visibility = 'public' then 'approved' else 'private' end)::public.profile_publication_state;
alter table public.profiles
  add constraint profiles_approved_requires_consent check (
    publication_state <> 'approved' or (visibility = 'public' and public_consent_at is not null)
  );
create index profiles_publication_queue on public.profiles(publication_state, updated_at desc)
  where archived_at is null;

create table public.languages (
  code text primary key check (code ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  display_label_en text not null check (char_length(display_label_en) between 1 and 120),
  display_label_fr text not null check (char_length(display_label_fr) between 1 and 120),
  created_at timestamptz not null default now()
);
create table public.profile_languages (
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  language_code text not null references public.languages(code) on delete restrict,
  proficiency text not null check (proficiency in ('basic', 'conversational', 'professional', 'fluent', 'native')),
  public_consent_at timestamptz,
  verification public.language_verification not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, language_code)
);
create index profile_languages_public on public.profile_languages(profile_id)
  where public_consent_at is not null;

alter table public.portfolio_items
  add column category text check (category is null or char_length(category) between 1 and 80),
  add column started_on date,
  add column ended_on date,
  add column publication_state public.portfolio_publication_state not null default 'private',
  add column encryption_key_version text,
  add column encrypted_private_notes text,
  add constraint portfolio_dates_valid check (ended_on is null or started_on is null or ended_on >= started_on),
  add constraint portfolio_notes_versioned check (
    (encrypted_private_notes is null and encryption_key_version is null)
    or (encrypted_private_notes is not null and encryption_key_version ~ '^v[1-9][0-9]*$')
  );
create index portfolio_items_moderation on public.portfolio_items(publication_state, updated_at desc)
  where archived_at is null;

alter table public.availability_snapshots
  add column confirmed_at timestamptz;
update public.availability_snapshots set confirmed_at = created_at where confirmed_at is null;
alter table public.availability_snapshots alter column confirmed_at set not null;
create index availability_snapshots_fresh on public.availability_snapshots(profile_id, expires_at desc)
  where archived_at is null;

-- Public output is approved, consented and current only. Withdrawal therefore takes effect immediately.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to anon, authenticated
  using (publication_state = 'approved' and visibility = 'public' and public_consent_at is not null and archived_at is null);
drop policy if exists profiles_owner_write on public.profiles;
create policy profiles_owner_write on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and publication_state in ('private','draft','submitted','changes_requested','revoked'));
create policy profiles_moderation_read on public.profiles for select to authenticated
  using (private.has_any_role(array['reviewer','admin']::public.umoja_role[]) and archived_at is null);
create policy profiles_admin_moderate on public.profiles for update to authenticated
  using (private.has_role('admin'))
  with check (publication_state in ('private','draft','submitted','approved','changes_requested','revoked'));

drop policy if exists profile_skills_public_read on public.profile_skills;
create policy profile_skills_public_read on public.profile_skills for select to anon, authenticated
  using (exists(select 1 from public.profiles p where p.user_id = profile_id and p.publication_state = 'approved' and p.visibility = 'public' and p.public_consent_at is not null and p.archived_at is null));
drop policy if exists portfolio_public_read on public.portfolio_items;
create policy portfolio_public_read on public.portfolio_items for select to anon, authenticated
  using (publication_state = 'approved' and public_consent_at is not null and archived_at is null and exists(select 1 from public.profiles p where p.user_id = profile_id and p.publication_state = 'approved' and p.visibility = 'public' and p.public_consent_at is not null and p.archived_at is null));
create policy portfolio_moderation_read on public.portfolio_items for select to authenticated
  using (private.has_any_role(array['reviewer','admin']::public.umoja_role[]) and archived_at is null);
create policy portfolio_admin_moderate on public.portfolio_items for update to authenticated
  using (private.has_role('admin'))
  with check (publication_state in ('private','submitted','approved','changes_requested','revoked'));

create policy languages_catalogue_read on public.languages for select to anon, authenticated using (true);
create policy profile_languages_owner on public.profile_languages for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and verification = 'self_reported');
create policy profile_languages_public_read on public.profile_languages for select to anon, authenticated
  using (public_consent_at is not null and verification in ('self_reported','verified') and exists(select 1 from public.profiles p where p.user_id = profile_id and p.publication_state = 'approved' and p.visibility = 'public' and p.public_consent_at is not null and p.archived_at is null));

-- Availability is append-only for owners; archival is the only mutable state.
drop policy if exists availability_owner on public.availability_snapshots;
create policy availability_owner_read on public.availability_snapshots for select to authenticated using (profile_id = auth.uid());
create policy availability_owner_insert on public.availability_snapshots for insert to authenticated
  with check (profile_id = auth.uid() and confirmed_at <= now() and expires_at > confirmed_at and expires_at <= confirmed_at + interval '30 days');
create policy availability_owner_archive on public.availability_snapshots for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and archived_at is not null);

grant select on public.languages, public.profile_languages to anon, authenticated;
grant insert, update, delete on public.profile_languages to authenticated;
grant select on public.profiles, public.profile_skills, public.portfolio_items to anon, authenticated;

drop policy if exists profile_skills_owner on public.profile_skills;
create policy profile_skills_owner on public.profile_skills for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and verification = 'self_reported');

create or replace function private.normalize_skill_name(input text)
returns text language sql immutable as $$
  select regexp_replace(lower(trim(input)), '[^[:alnum:]]+', ' ', 'g')
$$;
create unique index skills_canonical_normalized_unique on public.skills(private.normalize_skill_name(canonical_name))
  where archived_at is null;

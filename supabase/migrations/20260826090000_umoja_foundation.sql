-- Umoja Supabase spike: relational foundation only. All timestamps are UTC timestamptz.
-- No project/module tables are created here; a later approved phase will use private.active_membership.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.umoja_role as enum ('admin', 'cms-editor', 'reviewer', 'core', 'extended', 'project-manager');
create type public.cms_state as enum ('draft', 'review', 'published', 'archived');
create type public.intake_status as enum ('new', 'triage', 'in_review', 'contacted', 'accepted', 'closed', 'duplicate');
create type public.membership_tier as enum ('applicant', 'extended', 'core', 'lead');
create type public.profile_visibility as enum ('private', 'public');
create type public.skill_verification as enum ('self_reported', 'verified');

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.umoja_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, role, granted_at),
  constraint user_roles_revocation_after_grant check (revoked_at is null or revoked_at >= granted_at)
);
create unique index user_roles_active_unique on public.user_roles(user_id, role) where revoked_at is null;

create table public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null check (char_length(stable_key) between 1 and 128),
  translation_group_id uuid not null,
  locale text not null check (locale in ('en', 'fr')),
  slug text not null check (char_length(slug) between 1 and 512),
  state public.cms_state not null default 'draft',
  author_id uuid not null references auth.users(id) on delete restrict,
  updated_by_id uuid not null references auth.users(id) on delete restrict,
  current_revision_id uuid,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (translation_group_id, locale),
  unique (stable_key, locale),
  unique (locale, slug),
  constraint cms_pages_publication_consistency check (
    (state = 'published' and current_revision_id is not null and published_at is not null)
    or (state <> 'published')
  )
);

create table public.cms_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  state public.cms_state not null,
  title text not null check (char_length(title) between 1 and 256),
  seo_title text check (char_length(seo_title) <= 256),
  seo_description text check (char_length(seo_description) <= 512),
  blocks jsonb not null,
  author_id uuid not null references auth.users(id) on delete restrict,
  change_summary text not null default '' check (char_length(change_summary) <= 1024),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (page_id, revision_number)
);
alter table public.cms_pages add constraint cms_pages_current_revision_fk foreign key (current_revision_id) references public.cms_revisions(id) on delete restrict;
create index cms_pages_public_lookup on public.cms_pages(locale, slug) where state = 'published' and archived_at is null;
create index cms_revisions_page_created on public.cms_revisions(page_id, created_at desc);

create table public.project_intakes (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) on delete set null,
  submission_id uuid not null unique,
  email_lookup text not null check (email_lookup ~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'),
  idempotency_key_hash text not null unique check (idempotency_key_hash ~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'),
  encryption_key_version text not null check (encryption_key_version ~ '^v[1-9][0-9]*$'),
  encrypted_payload text not null,
  encrypted_internal_notes text,
  service_areas text[] not null check (cardinality(service_areas) > 0),
  attachment_count integer not null default 0 check (attachment_count >= 0),
  consent_at timestamptz not null,
  policy_version text not null check (char_length(policy_version) between 1 and 32),
  locale text not null check (locale in ('en', 'fr')),
  status public.intake_status not null default 'new',
  assigned_reviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index project_intakes_workflow_created on public.project_intakes(status, created_at desc) where archived_at is null;
create index project_intakes_email_lookup on public.project_intakes(email_lookup);

create table public.talent_intakes (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) on delete set null,
  submission_id uuid not null unique,
  email_lookup text not null check (email_lookup ~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'),
  idempotency_key_hash text not null unique check (idempotency_key_hash ~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'),
  encryption_key_version text not null check (encryption_key_version ~ '^v[1-9][0-9]*$'),
  encrypted_payload text not null,
  encrypted_internal_notes text,
  skill_areas text[] not null check (cardinality(skill_areas) > 0),
  experience_band text not null check (char_length(experience_band) between 1 and 128),
  attachment_count integer not null default 0 check (attachment_count >= 0),
  public_profile_consent boolean not null default false,
  application_consent_at timestamptz not null,
  data_processing_consent_at timestamptz not null,
  policy_version text not null check (char_length(policy_version) between 1 and 32),
  locale text not null check (locale in ('en', 'fr')),
  status public.intake_status not null default 'new',
  assigned_reviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index talent_intakes_workflow_created on public.talent_intakes(status, created_at desc) where archived_at is null;
create index talent_intakes_email_lookup on public.talent_intakes(email_lookup);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_slug text unique check (public_slug is null or public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  professional_name text not null check (char_length(professional_name) between 1 and 120),
  locale text not null check (locale in ('en', 'fr')),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  timezone text,
  public_bio text check (char_length(public_bio) <= 2000),
  visibility public.profile_visibility not null default 'private',
  public_consent_at timestamptz,
  consent_version text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_public_consent check ((visibility = 'public' and public_slug is not null and public_consent_at is not null) or visibility = 'private')
);

create table public.private_profile_details (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  encryption_key_version text not null check (encryption_key_version ~ '^v[1-9][0-9]*$'),
  encrypted_payload text not null,
  consent_at timestamptz not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique check (char_length(canonical_name) between 1 and 120),
  category text not null check (char_length(category) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.profile_skills (
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  level smallint not null check (level between 1 and 5),
  years_experience numeric(4,1) check (years_experience between 0 and 60),
  last_used_on date,
  verification public.skill_verification not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);
create index profile_skills_skill on public.profile_skills(skill_id, verification);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  role_summary text not null check (char_length(role_summary) between 1 and 2000),
  external_url text,
  public_consent_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index portfolio_items_public on public.portfolio_items(profile_id) where public_consent_at is not null and archived_at is null;

create table public.availability_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  weekly_hours smallint not null check (weekly_hours between 0 and 80),
  next_available_on date,
  work_mode text check (work_mode in ('remote', 'hybrid', 'onsite', 'flexible')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint availability_expiry check (expires_at > created_at)
);
create index availability_snapshots_current on public.availability_snapshots(profile_id, expires_at desc) where archived_at is null;

create table public.membership_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier public.membership_tier not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  evidence_digest text,
  created_at timestamptz not null default now(),
  constraint membership_range check (effective_to is null or effective_to > effective_from)
);
create unique index membership_history_active on public.membership_history(user_id) where effective_to is null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 128),
  target_type text not null check (char_length(target_type) between 1 and 64),
  target_id uuid,
  request_id uuid,
  before_digest text,
  after_digest text,
  created_at timestamptz not null default now()
);
create index audit_logs_target_created on public.audit_logs(target_type, target_id, created_at desc);
create index audit_logs_actor_created on public.audit_logs(actor_id, created_at desc);

create function private.has_role(required_role public.umoja_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = required_role and r.revoked_at is null)
$$;
create function private.has_any_role(required_roles public.umoja_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = any(required_roles) and r.revoked_at is null)
$$;
create function private.active_membership(subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.membership_history m where m.user_id = subject and m.effective_to is null and m.effective_from <= now())
$$;
revoke all on function private.has_role(public.umoja_role) from public;
revoke all on function private.has_any_role(public.umoja_role[]) from public;
revoke all on function private.active_membership(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.has_role(public.umoja_role), private.has_any_role(public.umoja_role[]), private.active_membership(uuid) to anon, authenticated;

alter table public.user_roles enable row level security;
alter table public.cms_pages enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.project_intakes enable row level security;
alter table public.talent_intakes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.profiles enable row level security;
alter table public.private_profile_details enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.availability_snapshots enable row level security;
alter table public.membership_history enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.cms_pages, public.cms_revisions, public.profiles, public.profile_skills, public.skills, public.portfolio_items to anon, authenticated;
grant select, insert, update on public.private_profile_details, public.availability_snapshots to authenticated;
grant select on public.user_roles, public.membership_history to authenticated;
grant select, insert, update on public.cms_pages, public.cms_revisions to authenticated;
grant select, update on public.project_intakes, public.talent_intakes to authenticated;
grant select on public.audit_logs to authenticated;

create policy cms_pages_public_read on public.cms_pages for select to anon, authenticated using (state = 'published' and archived_at is null and current_revision_id is not null);
create policy cms_pages_editors_read on public.cms_pages for select to authenticated using (private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_pages_editors_insert on public.cms_pages for insert to authenticated with check (private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) and author_id = auth.uid() and updated_by_id = auth.uid() and state = 'draft');
create policy cms_pages_editors_update on public.cms_pages for update to authenticated using (private.has_any_role(array['cms-editor','admin']::public.umoja_role[])) with check (private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_revisions_public_read on public.cms_revisions for select to anon, authenticated using (state = 'published' and exists(select 1 from public.cms_pages p where p.current_revision_id = id and p.state = 'published' and p.archived_at is null));
create policy cms_revisions_editors_read on public.cms_revisions for select to authenticated using (private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_revisions_editors_insert on public.cms_revisions for insert to authenticated with check (private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) and author_id = auth.uid());

create policy profiles_public_read on public.profiles for select to anon, authenticated using (visibility = 'public' and public_consent_at is not null and archived_at is null);
create policy profiles_owner_read on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_owner_write on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy private_profile_owner on public.private_profile_details for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy private_profile_reviewer_read on public.private_profile_details for select to authenticated using (private.has_any_role(array['reviewer','admin']::public.umoja_role[]));
create policy profile_skills_public_read on public.profile_skills for select to anon, authenticated using (exists(select 1 from public.profiles p where p.user_id = profile_id and p.visibility = 'public' and p.public_consent_at is not null and p.archived_at is null));
create policy profile_skills_owner on public.profile_skills for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy skills_catalogue_read on public.skills for select to anon, authenticated using (archived_at is null);
create policy portfolio_public_read on public.portfolio_items for select to anon, authenticated using (public_consent_at is not null and archived_at is null and exists(select 1 from public.profiles p where p.user_id = profile_id and p.visibility = 'public' and p.public_consent_at is not null and p.archived_at is null));
create policy portfolio_owner on public.portfolio_items for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy availability_owner on public.availability_snapshots for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy user_roles_self_read on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy user_roles_admin_read on public.user_roles for select to authenticated using (private.has_role('admin'));
create policy membership_self_read on public.membership_history for select to authenticated using (user_id = auth.uid());
create policy membership_admin_read on public.membership_history for select to authenticated using (private.has_role('admin'));
create policy intake_project_owner_read on public.project_intakes for select to authenticated using (applicant_id = auth.uid());
create policy intake_project_reviewer on public.project_intakes for select to authenticated using (private.has_any_role(array['reviewer','admin']::public.umoja_role[]));
create policy intake_project_reviewer_update on public.project_intakes for update to authenticated using (private.has_any_role(array['reviewer','admin']::public.umoja_role[])) with check (private.has_any_role(array['reviewer','admin']::public.umoja_role[]));
create policy intake_talent_owner_read on public.talent_intakes for select to authenticated using (applicant_id = auth.uid());
create policy intake_talent_reviewer on public.talent_intakes for select to authenticated using (private.has_any_role(array['reviewer','admin']::public.umoja_role[]));
create policy intake_talent_reviewer_update on public.talent_intakes for update to authenticated using (private.has_any_role(array['reviewer','admin']::public.umoja_role[])) with check (private.has_any_role(array['reviewer','admin']::public.umoja_role[]));
create policy audit_admin_read on public.audit_logs for select to authenticated using (private.has_role('admin'));

-- RPC is the only atomic CMS publish transition. It deliberately rejects legal/governance publication.
create function public.publish_cms_page(page_id uuid, change_summary text default 'Published complete revision')
returns public.cms_pages language plpgsql security definer set search_path = '' as $$
declare page public.cms_pages; revision public.cms_revisions; now_utc timestamptz := now();
begin
  if not private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into page from public.cms_pages where id = page_id for update;
  if not found or page.state <> 'review' or page.archived_at is not null or page.stable_key like 'legal/%' or page.stable_key like 'governance/%' then raise exception 'publication blocked' using errcode = '42501'; end if;
  insert into public.cms_revisions(page_id, revision_number, state, title, seo_title, seo_description, blocks, author_id, change_summary, published_at)
  select p.id, coalesce((select max(r.revision_number) + 1 from public.cms_revisions r where r.page_id = p.id), 1), 'published', d.title, d.seo_title, d.seo_description, d.blocks, auth.uid(), change_summary, now_utc
  from public.cms_pages p join lateral (select * from public.cms_revisions r where r.page_id = p.id order by r.revision_number desc limit 1) d on true where p.id = page_id returning * into revision;
  update public.cms_pages set state = 'published', current_revision_id = revision.id, published_at = now_utc, updated_at = now_utc, updated_by_id = auth.uid() where id = page_id returning * into page;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest) values (auth.uid(), 'cms.publish', 'cms_page', page_id, encode(extensions.digest(convert_to(revision.id::text, 'utf8'), 'sha256'), 'hex'));
  return page;
end $$;
revoke all on function public.publish_cms_page(uuid, text) from public;
grant execute on function public.publish_cms_page(uuid, text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('cms-public', 'cms-public', false, 10485760, array['image/jpeg','image/png','image/webp','image/avif']),
  ('cms-private', 'cms-private', false, 10485760, array['image/jpeg','image/png','image/webp','image/avif','application/pdf']),
  ('applicant-private', 'applicant-private', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy cms_public_derivative_read on storage.objects for select to anon, authenticated using (bucket_id = 'cms-public');
create policy cms_public_editor_write on storage.objects for insert to authenticated with check (bucket_id = 'cms-public' and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_public_editor_update on storage.objects for update to authenticated using (bucket_id = 'cms-public' and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_public_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'cms-public' and private.has_role('admin'));
create policy cms_private_editor_read on storage.objects for select to authenticated using (bucket_id = 'cms-private' and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_private_editor_insert on storage.objects for insert to authenticated with check (bucket_id = 'cms-private' and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_private_editor_update on storage.objects for update to authenticated using (bucket_id = 'cms-private' and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_private_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'cms-private' and private.has_role('admin'));
create policy applicant_private_review_read on storage.objects for select to authenticated using (bucket_id = 'applicant-private' and private.has_any_role(array['reviewer','admin']::public.umoja_role[]));
create policy applicant_private_review_write on storage.objects for insert to authenticated with check (bucket_id = 'applicant-private' and private.has_any_role(array['reviewer','admin']::public.umoja_role[]));
create policy applicant_private_review_update on storage.objects for update to authenticated using (bucket_id = 'applicant-private' and private.has_any_role(array['reviewer','admin']::public.umoja_role[]));
create policy applicant_private_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'applicant-private' and private.has_role('admin'));

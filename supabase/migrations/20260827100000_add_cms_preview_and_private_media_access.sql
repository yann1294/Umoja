-- Preview credentials are opaque, short-lived capabilities. The database retains only a SHA-256
-- digest and an immutable page/revision binding; plaintext credentials never enter a table.
alter table public.cms_pages
  add column preview_revision_id uuid references public.cms_revisions(id) on delete set null,
  add column preview_revoked_at timestamptz;

create index cms_pages_preview_active
  on public.cms_pages(preview_expires_at)
  where preview_token_hash is not null and preview_revoked_at is null;

create function public.issue_cms_preview_token(
  p_page_id uuid,
  p_revision_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns public.cms_pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  page public.cms_pages;
  revision public.cms_revisions;
begin
  if not private.active_membership(auth.uid())
    or not private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at <= now() or p_expires_at > now() + interval '24 hours' then
    raise exception 'invalid preview capability' using errcode = '22023';
  end if;
  select * into page from public.cms_pages where id = p_page_id for update;
  select * into revision from public.cms_revisions where id = p_revision_id and page_id = p_page_id;
  if not found or page.archived_at is not null then
    raise exception 'preview unavailable' using errcode = '42501';
  end if;
  update public.cms_pages
    set preview_token_hash = p_token_hash,
        preview_expires_at = p_expires_at,
        preview_revision_id = revision.id,
        preview_revoked_at = null,
        updated_at = now(),
        updated_by_id = auth.uid()
    where id = page.id
    returning * into page;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest)
    values (
      auth.uid(),
      'cms.preview.issue',
      'cms_page',
      page.id,
      encode(extensions.digest(convert_to(revision.id::text || ':' || p_expires_at::text, 'utf8'), 'sha256'), 'hex')
    );
  return page;
end;
$$;

create function public.revoke_cms_preview_token(p_page_id uuid)
returns public.cms_pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  page public.cms_pages;
begin
  if not private.active_membership(auth.uid())
    or not private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.cms_pages
    set preview_token_hash = null,
        preview_expires_at = null,
        preview_revision_id = null,
        preview_revoked_at = now(),
        updated_at = now(),
        updated_by_id = auth.uid()
    where id = p_page_id and archived_at is null
    returning * into page;
  if not found then raise exception 'preview unavailable' using errcode = '42501'; end if;
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest)
    values (auth.uid(), 'cms.preview.revoke', 'cms_page', page.id, encode(extensions.digest(convert_to(page.id::text, 'utf8'), 'sha256'), 'hex'));
  return page;
end;
$$;

-- This function is intentionally not granted to anon/authenticated clients. Server-only routes use
-- the secret client after validating the opaque capability, and then fetch the selected revision.
create function public.validate_cms_preview_token(
  p_page_id uuid,
  p_locale text,
  p_token_hash text
)
returns table (page_id uuid, revision_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.preview_revision_id
  from public.cms_pages p
  join public.cms_revisions r on r.id = p.preview_revision_id and r.page_id = p.id
  where p.id = p_page_id
    and p.locale = p_locale
    and p.archived_at is null
    and p.preview_token_hash = p_token_hash
    and p.preview_revoked_at is null
    and p.preview_expires_at > now()
$$;

revoke all on function public.issue_cms_preview_token(uuid, uuid, text, timestamptz) from public;
revoke all on function public.revoke_cms_preview_token(uuid) from public;
revoke all on function public.validate_cms_preview_token(uuid, text, text) from public;
grant execute on function public.issue_cms_preview_token(uuid, uuid, text, timestamptz) to authenticated;
grant execute on function public.revoke_cms_preview_token(uuid) to authenticated;

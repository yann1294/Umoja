-- Additive CMS parity support. Draft content remains in immutable revisions; public reads use only
-- the published revision pointer on cms_pages.
alter table public.cms_pages add column preview_token_hash text;
alter table public.cms_pages add column preview_expires_at timestamptz;
create index cms_pages_preview_token on public.cms_pages(preview_token_hash) where preview_token_hash is not null;

create function public.rollback_cms_page(p_page_id uuid, p_revision_id uuid)
returns public.cms_pages language plpgsql security definer set search_path = '' as $$
declare page public.cms_pages; revision public.cms_revisions; updated public.cms_pages;
begin
  if not private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into page from public.cms_pages where id = p_page_id for update;
  select * into revision from public.cms_revisions where id = p_revision_id and page_id = p_page_id;
  if not found then raise exception 'revision not found' using errcode = 'P0002'; end if;
  insert into public.cms_revisions(page_id, revision_number, state, title, seo_title, seo_description, blocks, author_id, change_summary)
  values (page.id, (select coalesce(max(r.revision_number), 0) + 1 from public.cms_revisions r where r.page_id = page.id), 'draft', revision.title, revision.seo_title, revision.seo_description, revision.blocks, auth.uid(), 'Restored from revision ' || revision.revision_number);
  update public.cms_pages set state = 'draft', current_revision_id = null, updated_by_id = auth.uid(), updated_at = now() where id = page.id returning * into updated;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest) values (auth.uid(), 'cms.rollback', 'cms_page', page.id, encode(extensions.digest(convert_to(revision.id::text, 'utf8'), 'sha256'), 'hex'));
  return updated;
end $$;
revoke all on function public.rollback_cms_page(uuid, uuid) from public;
grant execute on function public.rollback_cms_page(uuid, uuid) to authenticated;

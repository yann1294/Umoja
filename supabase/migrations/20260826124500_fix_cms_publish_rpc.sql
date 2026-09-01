-- Disambiguate RPC parameters so the atomic publish transaction executes remotely.
drop function public.publish_cms_page(uuid, text);
create or replace function public.publish_cms_page(p_page_id uuid, p_change_summary text default 'Published complete revision')
returns public.cms_pages language plpgsql security definer set search_path = '' as $$
declare page public.cms_pages; revision public.cms_revisions; now_utc timestamptz := now();
begin
  if not private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into page from public.cms_pages p where p.id = p_page_id for update;
  if not found or page.state <> 'review' or page.archived_at is not null or page.stable_key like 'legal/%' or page.stable_key like 'governance/%' then raise exception 'publication blocked' using errcode = '42501'; end if;
  insert into public.cms_revisions(page_id, revision_number, state, title, seo_title, seo_description, blocks, author_id, change_summary, published_at)
  select p.id, coalesce((select max(r.revision_number) + 1 from public.cms_revisions r where r.page_id = p.id), 1), 'published', d.title, d.seo_title, d.seo_description, d.blocks, auth.uid(), p_change_summary, now_utc
  from public.cms_pages p join lateral (select * from public.cms_revisions r where r.page_id = p.id order by r.revision_number desc limit 1) d on true where p.id = p_page_id returning * into revision;
  update public.cms_pages set state = 'published', current_revision_id = revision.id, published_at = now_utc, updated_at = now_utc, updated_by_id = auth.uid() where id = p_page_id returning * into page;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest) values (auth.uid(), 'cms.publish', 'cms_page', p_page_id, encode(extensions.digest(convert_to(revision.id::text, 'utf8'), 'sha256'), 'hex'));
  return page;
end $$;
revoke all on function public.publish_cms_page(uuid, text) from public;
grant execute on function public.publish_cms_page(uuid, text) to authenticated;

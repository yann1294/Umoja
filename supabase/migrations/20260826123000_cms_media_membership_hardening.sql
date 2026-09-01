-- CMS/media routes require both protected role rows and an active relational membership.
-- Published derivatives are delivered only through the server's published-CMS boundary.
drop policy if exists cms_pages_editors_read on public.cms_pages;
drop policy if exists cms_pages_editors_insert on public.cms_pages;
drop policy if exists cms_pages_editors_update on public.cms_pages;
drop policy if exists cms_revisions_editors_read on public.cms_revisions;
drop policy if exists cms_revisions_editors_insert on public.cms_revisions;

create policy cms_pages_editors_read on public.cms_pages for select to authenticated
  using (private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_pages_editors_insert on public.cms_pages for insert to authenticated
  with check (private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) and author_id = auth.uid() and updated_by_id = auth.uid() and state = 'draft');
create policy cms_pages_editors_update on public.cms_pages for update to authenticated
  using (private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]))
  with check (private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_revisions_editors_read on public.cms_revisions for select to authenticated
  using (private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_revisions_editors_insert on public.cms_revisions for insert to authenticated
  with check (private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]) and author_id = auth.uid());

drop policy if exists cms_public_derivative_read on storage.objects;
drop policy if exists cms_public_editor_write on storage.objects;
drop policy if exists cms_public_editor_update on storage.objects;
drop policy if exists cms_public_admin_delete on storage.objects;
drop policy if exists cms_private_editor_read on storage.objects;
drop policy if exists cms_private_editor_insert on storage.objects;
drop policy if exists cms_private_editor_update on storage.objects;
drop policy if exists cms_private_admin_delete on storage.objects;

create policy cms_public_editor_read on storage.objects for select to authenticated
  using (bucket_id = 'cms-public' and private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_public_editor_write on storage.objects for insert to authenticated
  with check (bucket_id = 'cms-public' and private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_public_editor_update on storage.objects for update to authenticated
  using (bucket_id = 'cms-public' and private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]))
  with check (bucket_id = 'cms-public' and private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_public_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cms-public' and private.active_membership(auth.uid()) and private.has_role('admin'));
create policy cms_private_editor_read on storage.objects for select to authenticated
  using (bucket_id = 'cms-private' and private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_private_editor_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cms-private' and private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_private_editor_update on storage.objects for update to authenticated
  using (bucket_id = 'cms-private' and private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]))
  with check (bucket_id = 'cms-private' and private.active_membership(auth.uid()) and private.has_any_role(array['cms-editor','admin']::public.umoja_role[]));
create policy cms_private_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cms-private' and private.active_membership(auth.uid()) and private.has_role('admin'));

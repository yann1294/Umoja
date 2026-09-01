-- The original policy's unqualified `id` resolved to the inner cms_pages row,
-- so an anonymous reader could see a published page pointer but never its
-- pointed-to revision. Bind the comparison explicitly to the protected outer
-- cms_revisions row.
drop policy if exists cms_revisions_public_read on public.cms_revisions;

create policy cms_revisions_public_read on public.cms_revisions
  for select to anon, authenticated
  using (
    state = 'published'
    and exists (
      select 1
      from public.cms_pages p
      where p.current_revision_id = public.cms_revisions.id
        and p.state = 'published'
        and p.archived_at is null
    )
  );

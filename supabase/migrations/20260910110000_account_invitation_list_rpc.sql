-- Use a protected RPC for invitation listing so the application does not depend on
-- broad direct table-read privileges. The function still enforces the same
-- verified admin + active membership boundary before returning encrypted rows
-- to the trusted server path.
create or replace function public.list_account_invitations()
returns setof public.account_invitations
language plpgsql security definer set search_path = '' as $$
begin
  if not private.active_verified_account(auth.uid())
    or not private.has_role('admin')
    or not private.active_membership(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select *
    from public.account_invitations
    order by created_at desc
    limit 100;
end $$;

revoke all on function public.list_account_invitations() from public, anon, authenticated;
grant execute on function public.list_account_invitations() to authenticated;

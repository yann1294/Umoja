-- Prevent assignments and audit access from surviving account or membership disablement.
create function private.validate_intake_reviewer_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_reviewer_id is not null and not (
    private.account_active(new.assigned_reviewer_id)
    and private.active_membership(new.assigned_reviewer_id)
    and exists (
      select 1 from public.user_roles roles
      where roles.user_id = new.assigned_reviewer_id
        and roles.revoked_at is null
        and roles.role in ('reviewer', 'admin')
    )
  ) then
    raise exception 'invalid reviewer assignment' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke all on function private.validate_intake_reviewer_assignment() from public, anon, authenticated;

create trigger project_intakes_validate_reviewer
before insert or update of assigned_reviewer_id on public.project_intakes
for each row execute function private.validate_intake_reviewer_assignment();
create trigger talent_intakes_validate_reviewer
before insert or update of assigned_reviewer_id on public.talent_intakes
for each row execute function private.validate_intake_reviewer_assignment();

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select to authenticated
  using (
    private.account_active(auth.uid())
    and private.active_membership(auth.uid())
    and private.has_role('admin')
  );

-- Let the reviewer audit policy check protected targets without granting intake_files access.
create function private.intake_audit_target_exists(p_target_type text, p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_target_type
    when 'project_intake' then exists (
      select 1 from public.project_intakes intake
      where intake.id = p_target_id and intake.archived_at is null
    )
    when 'talent_intake' then exists (
      select 1 from public.talent_intakes intake
      where intake.id = p_target_id and intake.archived_at is null
    )
    when 'intake_file' then exists (
      select 1 from public.intake_files file
      where file.id = p_target_id and file.archived_at is null
    )
    else false
  end
$$;
revoke all on function private.intake_audit_target_exists(text, uuid) from public;
grant execute on function private.intake_audit_target_exists(text, uuid) to authenticated;

drop policy if exists intake_audit_reviewer_read on public.audit_logs;
create policy intake_audit_reviewer_read on public.audit_logs for select to authenticated
  using (
    private.account_active(auth.uid())
    and private.active_membership(auth.uid())
    and private.has_role('reviewer')
    and private.intake_audit_target_exists(target_type, target_id)
  );

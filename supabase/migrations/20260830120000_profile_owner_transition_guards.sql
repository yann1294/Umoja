-- Forward-only correction: prevent owner tampering with privileged profile and portfolio state.
create or replace function private.guard_profile_owner_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() = old.user_id and (new.user_id <> old.user_id or new.archived_at is distinct from old.archived_at or new.publication_state = 'approved') then
    raise exception 'profile transition not permitted' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.guard_profile_owner_fields() from public;
create trigger profiles_owner_field_guard before update on public.profiles for each row execute function private.guard_profile_owner_fields();

drop policy if exists portfolio_owner on public.portfolio_items;
create policy portfolio_owner on public.portfolio_items for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and publication_state in ('private','submitted','changes_requested','revoked'));

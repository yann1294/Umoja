create table public.profile_moderation_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision public.profile_publication_state not null check (decision in ('changes_requested','approved','revoked')),
  feedback text not null default '' check (char_length(feedback) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.profile_moderation_feedback enable row level security;
revoke all on public.profile_moderation_feedback from anon, authenticated;
grant select on public.profile_moderation_feedback to authenticated;
create policy profile_feedback_owner_read on public.profile_moderation_feedback for select to authenticated using (profile_id = auth.uid());
create policy profile_feedback_admin_read on public.profile_moderation_feedback for select to authenticated using (private.has_role('admin') and private.active_membership(auth.uid()));

create or replace function public.moderate_profile(profile_user_id uuid, decision public.profile_publication_state, expected_state public.profile_publication_state, feedback text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles; old_digest text; new_digest text;
begin
  if not private.active_verified_account(auth.uid()) or not private.has_role('admin') or not private.active_membership(auth.uid()) then raise exception 'not authorized' using errcode = '42501'; end if;
  select p.* into result from public.profiles p where p.user_id=profile_user_id and p.publication_state=expected_state and p.archived_at is null and p.public_consent_at is not null and p.user_id <> auth.uid() for update;
  if not found then raise exception 'stale moderation decision' using errcode = '40001'; end if;
  if not ((expected_state='submitted' and decision in ('approved','changes_requested')) or (expected_state='approved' and decision='revoked')) then raise exception 'invalid transition' using errcode = '42501'; end if;
  old_digest := encode(extensions.digest(row_to_json(result)::text,'sha256'),'hex');
  update public.profiles set publication_state=decision, updated_at=now() where user_id=profile_user_id returning * into result;
  insert into public.profile_moderation_feedback(profile_id, reviewer_id, decision, feedback) values(profile_user_id, auth.uid(), decision, left(coalesce(feedback,''),2000));
  new_digest := encode(extensions.digest(row_to_json(result)::text,'sha256'),'hex');
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest, after_digest) values(auth.uid(), 'profile.moderate', 'profile', profile_user_id, old_digest, new_digest);
  return result;
end $$;
revoke all on function public.moderate_profile(uuid,public.profile_publication_state,public.profile_publication_state,text) from public;
grant execute on function public.moderate_profile(uuid,public.profile_publication_state,public.profile_publication_state,text) to authenticated;

-- Umoja-owned account invitations. Private email values remain application-encrypted;
-- only a context-bound lookup and a digest of the random invite token are stored.
create type public.invitation_delivery_state as enum ('pending', 'sent', 'failed', 'suppressed');
create type public.invitation_membership_status as enum ('pending', 'active');

create table public.account_invitations (
  id uuid primary key default gen_random_uuid(),
  email_lookup text not null check (email_lookup ~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'),
  encrypted_email text not null check (encrypted_email ~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  encryption_key_version text not null check (encryption_key_version ~ '^v[1-9][0-9]*$'),
  locale text not null check (locale in ('en', 'fr')),
  intended_role public.umoja_role,
  intended_membership_tier public.membership_tier not null default 'applicant',
  intended_membership_status public.invitation_membership_status not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete restrict,
  token_digest text not null unique check (token_digest ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  last_sent_at timestamptz,
  resend_count integer not null default 0 check (resend_count between 0 and 5),
  delivery_state public.invitation_delivery_state not null default 'pending',
  delivery_provider text check (delivery_provider is null or delivery_provider in ('log', 'brevo')),
  audit_metadata jsonb not null default '{"schema_version":1,"source":"umoja-admin"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_invitation_expiry check (expires_at > created_at),
  constraint account_invitation_terminal_state check (
    not (accepted_at is not null and revoked_at is not null)
    and ((accepted_at is null and accepted_user_id is null) or (accepted_at is not null and accepted_user_id is not null))
  ),
  constraint account_invitation_governance_boundary check (
    intended_membership_tier not in ('core', 'lead')
    and (intended_role is null or intended_role not in ('admin', 'core'))
  ),
  constraint account_invitation_audit_metadata check (
    jsonb_typeof(audit_metadata) = 'object'
    and audit_metadata <@ '{"schema_version":1,"source":"umoja-admin"}'::jsonb
  )
);

create unique index account_invitations_one_pending_email
  on public.account_invitations(email_lookup)
  where accepted_at is null and revoked_at is null;
create index account_invitations_status_created
  on public.account_invitations(created_at desc);

alter table public.account_invitations enable row level security;
revoke all on public.account_invitations from public, anon, authenticated;
grant select on public.account_invitations to authenticated;
create policy account_invitations_operations_read
  on public.account_invitations for select to authenticated
  using (
    private.active_verified_account(auth.uid())
    and private.has_role('admin')
    and private.active_membership(auth.uid())
  );

create function public.create_account_invitation(
  p_email_lookup text,
  p_encrypted_email text,
  p_encryption_key_version text,
  p_locale text,
  p_intended_role public.umoja_role,
  p_intended_membership_tier public.membership_tier,
  p_intended_membership_status public.invitation_membership_status,
  p_token_digest text,
  p_expires_at timestamptz,
  p_after_digest text
)
returns public.account_invitations
language plpgsql security definer set search_path = '' as $$
declare created public.account_invitations;
begin
  if not private.active_verified_account(auth.uid())
    or not private.has_role('admin')
    or not private.active_membership(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_email_lookup !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+$'
    or p_encrypted_email !~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or p_encryption_key_version !~ '^v[1-9][0-9]*$'
    or p_locale not in ('en', 'fr')
    or p_token_digest !~ '^[a-f0-9]{64}$'
    or p_after_digest !~ '^[a-f0-9]{64}$'
    or p_expires_at <= now()
    or p_intended_membership_tier in ('core', 'lead')
    or p_intended_role in ('admin', 'core')
  then
    raise exception 'invalid invitation request' using errcode = '22023';
  end if;
  insert into public.account_invitations(
    email_lookup, encrypted_email, encryption_key_version, locale, intended_role,
    intended_membership_tier, intended_membership_status, invited_by, token_digest, expires_at
  ) values (
    p_email_lookup, p_encrypted_email, p_encryption_key_version, p_locale, p_intended_role,
    p_intended_membership_tier, p_intended_membership_status, auth.uid(), p_token_digest, p_expires_at
  ) returning * into created;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest)
  values (auth.uid(), 'account.invitation.created', 'account_invitation', created.id, p_after_digest);
  return created;
end $$;

create function public.prepare_account_invitation_resend(
  p_invitation_id uuid,
  p_token_digest text,
  p_expires_at timestamptz,
  p_after_digest text
)
returns public.account_invitations
language plpgsql security definer set search_path = '' as $$
declare invitation public.account_invitations; now_utc timestamptz := now();
begin
  if not private.active_verified_account(auth.uid())
    or not private.has_role('admin')
    or not private.active_membership(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_token_digest !~ '^[a-f0-9]{64}$' or p_after_digest !~ '^[a-f0-9]{64}$'
    or p_expires_at <= now_utc then
    raise exception 'invalid invitation request' using errcode = '22023';
  end if;
  select * into invitation from public.account_invitations where id = p_invitation_id for update;
  if not found or invitation.accepted_at is not null or invitation.revoked_at is not null
    or invitation.resend_count >= 5
    or (invitation.last_sent_at is not null and invitation.last_sent_at > now_utc - interval '5 minutes') then
    raise exception 'invitation resend unavailable' using errcode = 'U1302';
  end if;
  update public.account_invitations set
    token_digest = p_token_digest,
    expires_at = p_expires_at,
    resend_count = resend_count + 1,
    last_sent_at = now_utc,
    delivery_state = 'pending',
    delivery_provider = null,
    updated_at = now_utc
  where id = p_invitation_id returning * into invitation;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest)
  values (auth.uid(), 'account.invitation.resent', 'account_invitation', invitation.id, p_after_digest);
  return invitation;
end $$;

create function public.record_account_invitation_delivery(
  p_invitation_id uuid,
  p_delivery_state public.invitation_delivery_state,
  p_delivery_provider text,
  p_after_digest text
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_delivery_state not in ('sent', 'failed', 'suppressed') or p_delivery_provider not in ('log', 'brevo')
    or p_after_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid delivery result' using errcode = '22023';
  end if;
  update public.account_invitations set
    delivery_state = p_delivery_state,
    delivery_provider = p_delivery_provider,
    last_sent_at = case when p_delivery_state in ('sent', 'suppressed') then now() else last_sent_at end,
    updated_at = now()
  where id = p_invitation_id and accepted_at is null and revoked_at is null;
  if not found then raise exception 'invitation unavailable' using errcode = 'U1303'; end if;
  insert into public.audit_logs(action, target_type, target_id, after_digest)
  values ('account.invitation.delivery.' || p_delivery_state::text, 'account_invitation', p_invitation_id, p_after_digest);
end $$;

create function public.revoke_account_invitation(p_invitation_id uuid, p_after_digest text)
returns public.account_invitations
language plpgsql security definer set search_path = '' as $$
declare invitation public.account_invitations;
begin
  if not private.active_verified_account(auth.uid())
    or not private.has_role('admin')
    or not private.active_membership(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_after_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid invitation request' using errcode = '22023';
  end if;
  update public.account_invitations set revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
  where id = p_invitation_id and accepted_at is null and revoked_at is null
  returning * into invitation;
  if not found then raise exception 'invitation revoke unavailable' using errcode = 'U1304'; end if;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest)
  values (auth.uid(), 'account.invitation.revoked', 'account_invitation', invitation.id, p_after_digest);
  return invitation;
end $$;

create function public.accept_account_invitation(
  p_invitation_id uuid,
  p_token_digest text,
  p_user_id uuid,
  p_after_digest text
)
returns public.account_invitations
language plpgsql security definer set search_path = '' as $$
declare invitation public.account_invitations; now_utc timestamptz := now();
begin
  if p_token_digest !~ '^[a-f0-9]{64}$' or p_after_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid invitation acceptance' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.users where id = p_user_id and (banned_until is null or banned_until <= now_utc)
  ) then
    raise exception 'account unavailable' using errcode = 'U1305';
  end if;
  select * into invitation from public.account_invitations
  where id = p_invitation_id and token_digest = p_token_digest for update;
  if not found or invitation.expires_at <= now_utc or invitation.accepted_at is not null
    or invitation.revoked_at is not null then
    raise exception 'invitation unavailable' using errcode = 'U1306';
  end if;
  insert into public.membership_history(user_id, tier, effective_from, approved_by, evidence_digest)
  values (
    p_user_id,
    case when invitation.intended_membership_status = 'active'
      then invitation.intended_membership_tier else 'applicant'::public.membership_tier end,
    now_utc,
    invitation.invited_by,
    p_after_digest
  );
  if invitation.intended_membership_status = 'active' then
    if invitation.intended_role is not null then
      insert into public.user_roles(user_id, role, granted_by)
      values (p_user_id, invitation.intended_role, invitation.invited_by);
    end if;
  end if;
  update public.account_invitations set accepted_at = now_utc, accepted_user_id = p_user_id,
    token_digest = encode(extensions.digest(convert_to(token_digest || ':' || now_utc::text, 'utf8'), 'sha256'), 'hex'),
    updated_at = now_utc
  where id = invitation.id returning * into invitation;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest)
  values (p_user_id, 'account.invitation.accepted', 'account_invitation', invitation.id, p_after_digest);
  return invitation;
end $$;

revoke all on function public.create_account_invitation(text, text, text, text, public.umoja_role, public.membership_tier, public.invitation_membership_status, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.prepare_account_invitation_resend(uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.record_account_invitation_delivery(uuid, public.invitation_delivery_state, text, text) from public, anon, authenticated;
revoke all on function public.revoke_account_invitation(uuid, text) from public, anon, authenticated;
revoke all on function public.accept_account_invitation(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_account_invitation(text, text, text, text, public.umoja_role, public.membership_tier, public.invitation_membership_status, text, timestamptz, text) to authenticated;
grant execute on function public.prepare_account_invitation_resend(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.revoke_account_invitation(uuid, text) to authenticated;
grant execute on function public.record_account_invitation_delivery(uuid, public.invitation_delivery_state, text, text) to service_role;
grant execute on function public.accept_account_invitation(uuid, text, uuid, text) to service_role;

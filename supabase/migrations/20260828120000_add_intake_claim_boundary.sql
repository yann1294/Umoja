-- Dormant, server-only applicant claim capability. No rendered route issues or consumes claims.
create table public.intake_claim_capabilities (
  id uuid primary key default gen_random_uuid(),
  intake_kind text not null check (intake_kind in ('project', 'talent')),
  project_intake_id uuid references public.project_intakes(id) on delete cascade,
  talent_intake_id uuid references public.talent_intakes(id) on delete cascade,
  intended_user_id uuid not null references auth.users(id) on delete cascade,
  token_digest text not null unique check (token_digest ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  replaced_by_id uuid references public.intake_claim_capabilities(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint intake_claim_one_parent check (
    (project_intake_id is not null)::integer + (talent_intake_id is not null)::integer = 1
  ),
  constraint intake_claim_kind_parent check (
    (intake_kind = 'project' and project_intake_id is not null and talent_intake_id is null)
    or (intake_kind = 'talent' and talent_intake_id is not null and project_intake_id is null)
  ),
  constraint intake_claim_expiry check (expires_at > created_at),
  constraint intake_claim_terminal_state check (used_at is null or revoked_at is null)
);

create index intake_claim_project_active
  on public.intake_claim_capabilities(project_intake_id, expires_at)
  where used_at is null and revoked_at is null;
create index intake_claim_talent_active
  on public.intake_claim_capabilities(talent_intake_id, expires_at)
  where used_at is null and revoked_at is null;
create index intake_claim_recipient_active
  on public.intake_claim_capabilities(intended_user_id, expires_at)
  where used_at is null and revoked_at is null;

alter table public.intake_claim_capabilities enable row level security;
revoke all on public.intake_claim_capabilities from public, anon, authenticated;

create function public.issue_intake_claim(
  p_claim_id uuid,
  p_kind text,
  p_intake_id uuid,
  p_intended_user_id uuid,
  p_token_digest text,
  p_expires_at timestamptz,
  p_created_by uuid,
  p_after_digest text
)
returns public.intake_claim_capabilities
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.intake_claim_capabilities;
  existing public.intake_claim_capabilities;
begin
  if p_kind not in ('project', 'talent')
    or p_token_digest !~ '^[a-f0-9]{64}$'
    or p_after_digest !~ '^[a-f0-9]{64}$'
    or p_expires_at <= now()
    or not private.account_active(p_intended_user_id)
    or not exists (
      select 1 from auth.users account
      where account.id = p_intended_user_id and account.email_confirmed_at is not null
    )
  then
    raise exception 'invalid intake claim' using errcode = '22023';
  end if;

  if p_kind = 'project' then
    if not exists (
      select 1 from public.project_intakes intake
      where intake.id = p_intake_id and intake.applicant_id is null and intake.archived_at is null
    ) then raise exception 'intake unavailable' using errcode = '42501'; end if;
    select * into existing from public.intake_claim_capabilities claim
      where claim.project_intake_id = p_intake_id
        and claim.used_at is null and claim.revoked_at is null
      order by claim.created_at desc limit 1 for update;
  else
    if not exists (
      select 1 from public.talent_intakes intake
      where intake.id = p_intake_id and intake.applicant_id is null and intake.archived_at is null
    ) then raise exception 'intake unavailable' using errcode = '42501'; end if;
    select * into existing from public.intake_claim_capabilities claim
      where claim.talent_intake_id = p_intake_id
        and claim.used_at is null and claim.revoked_at is null
      order by claim.created_at desc limit 1 for update;
  end if;

  insert into public.intake_claim_capabilities (
    id, intake_kind, project_intake_id, talent_intake_id, intended_user_id,
    token_digest, expires_at, created_by
  ) values (
    p_claim_id,
    p_kind,
    case when p_kind = 'project' then p_intake_id end,
    case when p_kind = 'talent' then p_intake_id end,
    p_intended_user_id,
    p_token_digest,
    p_expires_at,
    p_created_by
  ) returning * into created;

  if existing.id is not null then
    update public.intake_claim_capabilities
      set revoked_at = now(), replaced_by_id = created.id
      where id = existing.id;
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest)
  values (p_created_by, 'intake.claim.issued', 'intake_claim', created.id, p_after_digest);
  return created;
end
$$;

create function public.consume_intake_claim(
  p_claim_id uuid,
  p_kind text,
  p_intake_id uuid,
  p_actor_id uuid,
  p_token_digest text,
  p_after_digest text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare claim public.intake_claim_capabilities;
begin
  if p_kind not in ('project', 'talent')
    or p_token_digest !~ '^[a-f0-9]{64}$'
    or p_after_digest !~ '^[a-f0-9]{64}$'
    or not private.account_active(p_actor_id)
    or not exists (
      select 1 from auth.users account
      where account.id = p_actor_id and account.email_confirmed_at is not null
    )
  then raise exception 'claim unavailable' using errcode = '42501'; end if;

  select * into claim from public.intake_claim_capabilities candidate
    where candidate.id = p_claim_id for update;
  if not found
    or claim.intake_kind <> p_kind
    or claim.intended_user_id <> p_actor_id
    or claim.token_digest <> p_token_digest
    or claim.expires_at <= now()
    or claim.used_at is not null
    or claim.revoked_at is not null
    or (p_kind = 'project' and claim.project_intake_id <> p_intake_id)
    or (p_kind = 'talent' and claim.talent_intake_id <> p_intake_id)
  then raise exception 'claim unavailable' using errcode = '42501'; end if;

  if p_kind = 'project' then
    update public.project_intakes set applicant_id = p_actor_id, updated_at = now()
      where id = p_intake_id and applicant_id is null and archived_at is null;
  else
    update public.talent_intakes set applicant_id = p_actor_id, updated_at = now()
      where id = p_intake_id and applicant_id is null and archived_at is null;
  end if;
  if not found then raise exception 'claim unavailable' using errcode = '42501'; end if;

  update public.intake_claim_capabilities set used_at = now() where id = claim.id;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest)
  values (p_actor_id, 'intake.claim.consumed', 'intake_claim', claim.id, p_after_digest);
  return p_intake_id;
end
$$;

create function public.revoke_intake_claim(
  p_claim_id uuid,
  p_actor_id uuid,
  p_after_digest text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_after_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid digest' using errcode = '22023';
  end if;
  update public.intake_claim_capabilities
    set revoked_at = now()
    where id = p_claim_id and used_at is null and revoked_at is null;
  if not found then raise exception 'claim unavailable' using errcode = '42501'; end if;
  insert into public.audit_logs(actor_id, action, target_type, target_id, after_digest)
  values (p_actor_id, 'intake.claim.revoked', 'intake_claim', p_claim_id, p_after_digest);
  return p_claim_id;
end
$$;

revoke all on function public.issue_intake_claim(uuid, text, uuid, uuid, text, timestamptz, uuid, text)
  from public, anon, authenticated;
revoke all on function public.consume_intake_claim(uuid, text, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.revoke_intake_claim(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.issue_intake_claim(uuid, text, uuid, uuid, text, timestamptz, uuid, text)
  to service_role;
grant execute on function public.consume_intake_claim(uuid, text, uuid, uuid, text, text)
  to service_role;
grant execute on function public.revoke_intake_claim(uuid, uuid, text)
  to service_role;

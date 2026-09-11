create or replace function private.profile_mutation_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare subject uuid;
begin
  -- Only Auth's internal cascade (database owner) may omit an actor. REST/service-role writes fail closed.
  if auth.uid() is null then
    if current_user = 'postgres' then return coalesce(new, old); end if;
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  subject := coalesce(to_jsonb(new)->>'profile_id', to_jsonb(old)->>'profile_id', to_jsonb(new)->>'user_id', to_jsonb(old)->>'user_id')::uuid;
  insert into public.audit_logs(actor_id, action, target_type, target_id, before_digest, after_digest)
  values(auth.uid(), lower(tg_op), tg_table_name, subject, case when tg_op <> 'INSERT' then encode(extensions.digest(row_to_json(old)::text,'sha256'),'hex') end, case when tg_op <> 'DELETE' then encode(extensions.digest(row_to_json(new)::text,'sha256'),'hex') end);
  return coalesce(new, old);
end $$;

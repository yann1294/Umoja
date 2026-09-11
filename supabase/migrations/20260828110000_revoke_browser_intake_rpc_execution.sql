-- Supabase may retain role-specific grants independently of PUBLIC. Fail closed explicitly.
revoke execute on function public.create_encrypted_project_intake(uuid, uuid, text, text, text, text, text[], integer, timestamptz, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_encrypted_talent_intake(uuid, uuid, text, text, text, text, text[], text, integer, boolean, timestamptz, timestamptz, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.register_intake_file(uuid, text, uuid, text, text, text, text, integer, integer, text)
  from public, anon, authenticated;
revoke execute on function public.archive_intake_file(uuid, text)
  from public, anon, authenticated;

grant execute on function public.create_encrypted_project_intake(uuid, uuid, text, text, text, text, text[], integer, timestamptz, text, text, text)
  to service_role;
grant execute on function public.create_encrypted_talent_intake(uuid, uuid, text, text, text, text, text[], text, integer, boolean, timestamptz, timestamptz, text, text, text)
  to service_role;
grant execute on function public.register_intake_file(uuid, text, uuid, text, text, text, text, integer, integer, text)
  to service_role;
grant execute on function public.archive_intake_file(uuid, text)
  to service_role;

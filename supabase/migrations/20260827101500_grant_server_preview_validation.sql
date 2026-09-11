-- The validation RPC is callable only by the trusted server-side service role. Browser roles
-- remain unable to query preview capability bindings or digests directly.
revoke all on function public.validate_cms_preview_token(uuid, text, text) from public;
revoke all on function public.validate_cms_preview_token(uuid, text, text) from anon;
revoke all on function public.validate_cms_preview_token(uuid, text, text) from authenticated;
grant execute on function public.validate_cms_preview_token(uuid, text, text) to service_role;

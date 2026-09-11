-- The reviewed-version moderation RPC supersedes this legacy overload.
-- Keeping it exposed would preserve a retryable 40001 stale-conflict path.
drop function if exists public.moderate_profile(
  uuid,
  public.profile_publication_state,
  public.profile_publication_state
);

-- Prompt 12 owner-run review script. Do not execute with the application service key.
-- Required psql variables: owner_id, admin_id, skill_id, fixture_slug.
-- The owner must create the synthetic users/rows through the existing fixture harness first.
\set ON_ERROR_STOP on
\if :{?owner_id}
\else
  \echo 'owner_id is required'
  \quit 3
\endif
\if :{?admin_id}
\else
  \echo 'admin_id is required'
  \quit 3
\endif
\if :{?skill_id}
\else
  \echo 'skill_id is required'
  \quit 3
\endif
\if :{?fixture_slug}
\else
  \echo 'fixture_slug is required'
  \quit 3
\endif

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
SET LOCAL search_path = public, extensions;

-- This is a transaction-local attachment to a shared table. It is deliberately narrow:
-- only audit rows for the one synthetic owner UUID fail. DDL takes a brief audit_logs lock.
CREATE FUNCTION pg_temp.prompt12_fail_audit() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'prompt12 synthetic audit insertion failure' USING ERRCODE = 'P0001';
END
$$;
CREATE TRIGGER prompt12_fail_audit
BEFORE INSERT ON public.audit_logs
FOR EACH ROW WHEN (NEW.target_id = :'owner_id'::uuid)
EXECUTE FUNCTION pg_temp.prompt12_fail_audit();

-- The authenticated RPCs read request.jwt.claims; this does not grant application users access.
-- The reviewed owner connection must be allowed to SET ROLE authenticated.
SET LOCAL ROLE authenticated;

-- Case 1: trigger-backed child mutation. The child and its audit row must both roll back.
SELECT count(*) AS child_before INTO TEMP TABLE prompt12_child_snapshot
FROM public.profile_skills WHERE profile_id = :'owner_id'::uuid;
SELECT count(*) AS audit_before INTO TEMP TABLE prompt12_child_audit_snapshot
FROM public.audit_logs WHERE target_id = :'owner_id'::uuid;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'owner_id', 'role', 'authenticated')::text, true);
SAVEPOINT child_case;
DO $$ BEGIN
  INSERT INTO public.profile_skills(profile_id, skill_id, level)
  VALUES (:'owner_id'::uuid, :'skill_id'::uuid, 4);
  RAISE EXCEPTION 'expected audit fault did not occur';
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE <> 'P0001' OR SQLERRM <> 'prompt12 synthetic audit insertion failure' THEN RAISE; END IF;
END $$;
ROLLBACK TO SAVEPOINT child_case;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.profile_skills WHERE profile_id = :'owner_id'::uuid) <> (SELECT child_before FROM prompt12_child_snapshot)
     OR (SELECT count(*) FROM public.audit_logs WHERE target_id = :'owner_id'::uuid) <> (SELECT audit_before FROM prompt12_child_audit_snapshot)
  THEN RAISE EXCEPTION 'child rollback assertion failed'; END IF;
END $$;

-- Case 2: profile plus encrypted private-details RPC. Both rows and its audit must roll back.
SELECT p.updated_at, p.professional_name, p.public_bio INTO TEMP TABLE prompt12_profile_snapshot
FROM public.profiles p WHERE p.user_id = :'owner_id'::uuid;
SELECT count(*) AS private_before INTO TEMP TABLE prompt12_private_snapshot
FROM public.private_profile_details WHERE user_id = :'owner_id'::uuid;
SELECT count(*) AS audit_before INTO TEMP TABLE prompt12_profile_audit_snapshot
FROM public.audit_logs WHERE target_id = :'owner_id'::uuid;
SAVEPOINT profile_case;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'owner_id', 'role', 'authenticated')::text, true);
DO $$ BEGIN
  PERFORM public.save_profile_with_audit(
    :'owner_id'::uuid, 'Prompt 12 rollback fixture', 'en', 'KE', 'rollback fixture', :'fixture_slug',
    'public'::public.profile_visibility, 'submitted'::public.profile_publication_state, true,
    (SELECT updated_at FROM prompt12_profile_snapshot), 'synthetic-encrypted-payload', 'v1'
  );
  RAISE EXCEPTION 'expected audit fault did not occur';
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE <> 'P0001' OR SQLERRM <> 'prompt12 synthetic audit insertion failure' THEN RAISE; END IF;
END $$;
ROLLBACK TO SAVEPOINT profile_case;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN prompt12_profile_snapshot s ON p.updated_at = s.updated_at AND p.professional_name = s.professional_name AND p.public_bio = s.public_bio WHERE p.user_id = :'owner_id'::uuid)
     OR (SELECT count(*) FROM public.private_profile_details WHERE user_id = :'owner_id'::uuid) <> (SELECT private_before FROM prompt12_private_snapshot)
     OR (SELECT count(*) FROM public.audit_logs WHERE target_id = :'owner_id'::uuid) <> (SELECT audit_before FROM prompt12_profile_audit_snapshot)
  THEN RAISE EXCEPTION 'profile/private rollback assertion failed'; END IF;
END $$;

-- Case 3: moderation plus applicant feedback. State, feedback and audit must roll back.
SELECT p.updated_at, p.publication_state INTO TEMP TABLE prompt12_moderation_snapshot
FROM public.profiles p WHERE p.user_id = :'owner_id'::uuid;
SELECT count(*) AS feedback_before INTO TEMP TABLE prompt12_feedback_snapshot
FROM public.profile_moderation_feedback WHERE profile_id = :'owner_id'::uuid;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
SAVEPOINT moderation_case;
DO $$ BEGIN
  PERFORM public.moderate_profile(:'owner_id'::uuid, 'changes_requested'::public.profile_publication_state, 'submitted'::public.profile_publication_state, 'synthetic rollback feedback', (SELECT updated_at FROM prompt12_moderation_snapshot));
  RAISE EXCEPTION 'expected audit fault did not occur';
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE <> 'P0001' OR SQLERRM <> 'prompt12 synthetic audit insertion failure' THEN RAISE; END IF;
END $$;
ROLLBACK TO SAVEPOINT moderation_case;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN prompt12_moderation_snapshot s ON p.updated_at = s.updated_at AND p.publication_state = s.publication_state WHERE p.user_id = :'owner_id'::uuid)
     OR (SELECT count(*) FROM public.profile_moderation_feedback WHERE profile_id = :'owner_id'::uuid) <> (SELECT feedback_before FROM prompt12_feedback_snapshot)
     OR (SELECT count(*) FROM public.audit_logs WHERE target_id = :'owner_id'::uuid) <> (SELECT audit_before FROM prompt12_child_audit_snapshot)
  THEN RAISE EXCEPTION 'moderation/feedback rollback assertion failed'; END IF;
END $$;

ROLLBACK;

-- Run separately after this connection closes, using a privileged read-only check:
-- SELECT count(*) = 0 FROM pg_trigger WHERE tgname = 'prompt12_fail_audit';
-- SELECT count(*) = 0 FROM pg_proc WHERE pronamespace = pg_my_temp_schema() AND proname = 'prompt12_fail_audit';

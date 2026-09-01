-- Prompt 12 owner-run fault-injection review. DO NOT run with an application key.
-- Required psql variables: owner_id, owner_email, admin_id, admin_email, skill_id,
-- fixture_slug, run_id. All identities and rows must already exist as synthetic fixtures.
--
-- This script deliberately installs a transaction-local trigger on the shared audit_logs
-- table. CREATE TRIGGER takes SHARE ROW EXCLUSIVE lock. Run only in an approved quiet
-- window. lock_timeout bounds lock acquisition; statement_timeout bounds every statement.
-- Any error, SIGINT, terminated psql process, or disconnected session closes the transaction
-- and PostgreSQL rolls back the trigger, helper, test writes, and snapshots.
\set ON_ERROR_STOP on
\set VERBOSITY terse

\if :{?owner_id}
\else
  \echo 'owner_id is required'
  \quit 3
\endif
\if :{?owner_email}
\else
  \echo 'owner_email is required'
  \quit 3
\endif
\if :{?admin_id}
\else
  \echo 'admin_id is required'
  \quit 3
\endif
\if :{?admin_email}
\else
  \echo 'admin_email is required'
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
\if :{?run_id}
\else
  \echo 'run_id is required'
  \quit 3
\endif

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
SET LOCAL search_path = public, extensions, pg_temp;

-- psql interpolation occurs here, outside dollar-quoted bodies. Procedural code reads
-- validated values from this session-private table instead of attempting :variable expansion.
CREATE TEMP TABLE prompt12_parameters (
  owner_id uuid PRIMARY KEY,
  owner_email text NOT NULL,
  admin_id uuid UNIQUE NOT NULL,
  admin_email text NOT NULL,
  skill_id uuid NOT NULL,
  fixture_slug text NOT NULL,
  run_id uuid NOT NULL,
  fault_detail text NOT NULL
) ON COMMIT DROP;
INSERT INTO prompt12_parameters
VALUES (
  :'owner_id'::uuid,
  :'owner_email',
  :'admin_id'::uuid,
  :'admin_email',
  :'skill_id'::uuid,
  :'fixture_slug',
  :'run_id'::uuid,
  'umoja-prompt12-audit-fault/' || :'run_id'::uuid::text
);

-- Fail closed unless every supplied identifier resolves to the exact pre-created fixture.
-- The email/slug patterns bind the UUIDs to this run, not merely to arbitrary synthetic rows.
DO $fixture_validation$
DECLARE p prompt12_parameters%ROWTYPE;
BEGIN
  SELECT * INTO STRICT p FROM prompt12_parameters;
  IF p.owner_email <> 'profile-rollback-owner-' || p.run_id || '@example.test'
     OR p.admin_email <> 'profile-rollback-admin-' || p.run_id || '@example.test'
     OR p.fixture_slug <> 'profile-rollback-' || p.run_id THEN
    RAISE EXCEPTION 'fixture labels do not match run_id' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u JOIN public.profiles pr ON pr.user_id = u.id
    WHERE u.id = p.owner_id AND lower(u.email) = lower(p.owner_email)
      AND u.email_confirmed_at IS NOT NULL AND u.banned_until IS NULL
      AND pr.public_slug = p.fixture_slug AND pr.archived_at IS NULL
      AND pr.publication_state = 'submitted'
  ) THEN RAISE EXCEPTION 'owner fixture ownership validation failed' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'admin' AND r.revoked_at IS NULL
    JOIN public.membership_history m ON m.user_id = u.id AND m.effective_to IS NULL
    WHERE u.id = p.admin_id AND lower(u.email) = lower(p.admin_email)
      AND u.email_confirmed_at IS NOT NULL AND u.banned_until IS NULL
  ) THEN RAISE EXCEPTION 'administrator fixture ownership validation failed' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.skills s WHERE s.id = p.skill_id AND s.archived_at IS NULL) THEN
    RAISE EXCEPTION 'skill fixture validation failed' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.private_profile_details d
    WHERE d.user_id = p.owner_id AND d.archived_at IS NULL
      AND d.encryption_key_version ~ '^v[1-9][0-9]*$'
      AND d.encrypted_payload ~ '^v[1-9][0-9]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
  ) THEN RAISE EXCEPTION 'valid encrypted private fixture is required' USING ERRCODE = '22023'; END IF;
END
$fixture_validation$;

SELECT set_config('umoja.prompt12_owner_id', owner_id::text, true),
       set_config('umoja.prompt12_fault_detail', fault_detail, true)
FROM prompt12_parameters;

CREATE FUNCTION pg_temp.prompt12_fail_audit() RETURNS trigger
LANGUAGE plpgsql AS $fault_trigger$
BEGIN
  IF NEW.target_id = current_setting('umoja.prompt12_owner_id')::uuid THEN
    RAISE EXCEPTION 'prompt12 synthetic audit insertion failure'
      USING ERRCODE = 'U1201', DETAIL = current_setting('umoja.prompt12_fault_detail');
  END IF;
  RETURN NEW;
END
$fault_trigger$;
CREATE TRIGGER prompt12_fail_audit
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION pg_temp.prompt12_fail_audit();

CREATE TEMP TABLE prompt12_outcomes (
  case_name text PRIMARY KEY,
  sqlstate text NOT NULL,
  message text NOT NULL,
  detail text NOT NULL
) ON COMMIT DROP;
GRANT SELECT, INSERT, UPDATE ON prompt12_parameters, prompt12_outcomes TO authenticated;

-- Ordered, complete row-state digests are captured with the owner identity already set but
-- before SET ROLE applies RLS. This prevents RLS-filtered snapshots from hiding mutations.
SELECT set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true)
FROM prompt12_parameters;
CREATE TEMP TABLE prompt12_child_before ON COMMIT DROP AS
SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.skill_id)::text, '[]'), 'sha256'), 'hex') AS digest
FROM public.profile_skills x JOIN prompt12_parameters p ON x.profile_id = p.owner_id;
CREATE TEMP TABLE prompt12_child_audit_before ON COMMIT DROP AS
SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id)::text, '[]'), 'sha256'), 'hex') AS digest
FROM public.audit_logs x JOIN prompt12_parameters p ON x.target_id = p.owner_id;

SAVEPOINT child_case;
SET LOCAL ROLE authenticated;
DO $child_mutation$
DECLARE p prompt12_parameters%ROWTYPE; caught_state text; caught_message text; caught_detail text;
BEGIN
  SELECT * INTO STRICT p FROM prompt12_parameters;
  BEGIN
    INSERT INTO public.profile_skills(profile_id, skill_id, level, verification)
    VALUES (p.owner_id, p.skill_id, 4, 'self_reported')
    ON CONFLICT (profile_id, skill_id) DO UPDATE SET level = EXCLUDED.level, updated_at = now();
    RAISE EXCEPTION 'expected audit fault did not occur' USING ERRCODE = 'U1299';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS caught_state = RETURNED_SQLSTATE,
      caught_message = MESSAGE_TEXT, caught_detail = PG_EXCEPTION_DETAIL;
    IF caught_state <> 'U1201' OR caught_message <> 'prompt12 synthetic audit insertion failure'
       OR caught_detail <> p.fault_detail THEN RAISE; END IF;
    INSERT INTO prompt12_outcomes VALUES ('child', caught_state, caught_message, caught_detail);
  END;
END
$child_mutation$;
RESET ROLE;
DO $child_assertion$
DECLARE p prompt12_parameters%ROWTYPE; actual text;
BEGIN
  SELECT * INTO STRICT p FROM prompt12_parameters;
  SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.skill_id)::text, '[]'), 'sha256'), 'hex')
    INTO actual FROM public.profile_skills x WHERE x.profile_id = p.owner_id;
  IF actual <> (SELECT digest FROM prompt12_child_before)
     OR (SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id)::text, '[]'), 'sha256'), 'hex')
         FROM public.audit_logs x WHERE x.target_id = p.owner_id) <> (SELECT digest FROM prompt12_child_audit_before)
     OR NOT EXISTS (SELECT 1 FROM prompt12_outcomes WHERE case_name = 'child' AND sqlstate = 'U1201')
  THEN RAISE EXCEPTION 'child mutation did not roll back exactly' USING ERRCODE = 'U1210'; END IF;
END
$child_assertion$;
RELEASE SAVEPOINT child_case;

-- Reuse the fixture's application-generated encrypted envelope; no placeholder can mask the fault.
SELECT set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true)
FROM prompt12_parameters;
CREATE TEMP TABLE prompt12_profile_before ON COMMIT DROP AS
SELECT encode(extensions.digest(to_jsonb(x)::text, 'sha256'), 'hex') AS digest
FROM public.profiles x JOIN prompt12_parameters p ON x.user_id = p.owner_id;
CREATE TEMP TABLE prompt12_private_before ON COMMIT DROP AS
SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.user_id)::text, '[]'), 'sha256'), 'hex') AS digest
FROM public.private_profile_details x JOIN prompt12_parameters p ON x.user_id = p.owner_id;
CREATE TEMP TABLE prompt12_profile_audit_before ON COMMIT DROP AS
SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id)::text, '[]'), 'sha256'), 'hex') AS digest
FROM public.audit_logs x JOIN prompt12_parameters p ON x.target_id = p.owner_id;

SAVEPOINT profile_case;
SET LOCAL ROLE authenticated;
DO $profile_mutation$
DECLARE p prompt12_parameters%ROWTYPE; pr public.profiles%ROWTYPE; d public.private_profile_details%ROWTYPE;
  caught_state text; caught_message text; caught_detail text;
BEGIN
  SELECT * INTO STRICT p FROM prompt12_parameters;
  SELECT * INTO STRICT pr FROM public.profiles WHERE user_id = p.owner_id;
  SELECT * INTO STRICT d FROM public.private_profile_details WHERE user_id = p.owner_id;
  BEGIN
    PERFORM public.save_profile_with_audit(
      p.owner_id, left(pr.professional_name || ' rollback-check', 120), pr.locale,
      coalesce(pr.country_code, ''), coalesce(pr.public_bio, ''), p.fixture_slug,
      pr.visibility, pr.publication_state, pr.public_consent_at IS NOT NULL,
      pr.updated_at, d.encrypted_payload, d.encryption_key_version
    );
    RAISE EXCEPTION 'expected audit fault did not occur' USING ERRCODE = 'U1299';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS caught_state = RETURNED_SQLSTATE,
      caught_message = MESSAGE_TEXT, caught_detail = PG_EXCEPTION_DETAIL;
    IF caught_state <> 'U1201' OR caught_message <> 'prompt12 synthetic audit insertion failure'
       OR caught_detail <> p.fault_detail THEN RAISE; END IF;
    INSERT INTO prompt12_outcomes VALUES ('profile', caught_state, caught_message, caught_detail);
  END;
END
$profile_mutation$;
RESET ROLE;
DO $profile_assertion$
DECLARE p prompt12_parameters%ROWTYPE; profile_digest text; private_digest text; audit_digest text;
BEGIN
  SELECT * INTO STRICT p FROM prompt12_parameters;
  SELECT encode(extensions.digest(to_jsonb(x)::text, 'sha256'), 'hex') INTO profile_digest FROM public.profiles x WHERE x.user_id = p.owner_id;
  SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.user_id)::text, '[]'), 'sha256'), 'hex') INTO private_digest FROM public.private_profile_details x WHERE x.user_id = p.owner_id;
  SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id)::text, '[]'), 'sha256'), 'hex') INTO audit_digest FROM public.audit_logs x WHERE x.target_id = p.owner_id;
  IF profile_digest <> (SELECT digest FROM prompt12_profile_before)
     OR private_digest <> (SELECT digest FROM prompt12_private_before)
     OR audit_digest <> (SELECT digest FROM prompt12_profile_audit_before)
     OR NOT EXISTS (SELECT 1 FROM prompt12_outcomes WHERE case_name = 'profile' AND sqlstate = 'U1201')
  THEN RAISE EXCEPTION 'profile/private mutation did not roll back exactly' USING ERRCODE = 'U1211'; END IF;
END
$profile_assertion$;
RELEASE SAVEPOINT profile_case;

SELECT set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true)
FROM prompt12_parameters;
CREATE TEMP TABLE prompt12_moderation_profile_before ON COMMIT DROP AS
SELECT encode(extensions.digest(to_jsonb(x)::text, 'sha256'), 'hex') AS digest
FROM public.profiles x JOIN prompt12_parameters p ON x.user_id = p.owner_id;
CREATE TEMP TABLE prompt12_feedback_before ON COMMIT DROP AS
SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id)::text, '[]'), 'sha256'), 'hex') AS digest
FROM public.profile_moderation_feedback x JOIN prompt12_parameters p ON x.profile_id = p.owner_id;
CREATE TEMP TABLE prompt12_moderation_audit_before ON COMMIT DROP AS
SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id)::text, '[]'), 'sha256'), 'hex') AS digest
FROM public.audit_logs x JOIN prompt12_parameters p ON x.target_id = p.owner_id;

SAVEPOINT moderation_case;
SET LOCAL ROLE authenticated;
DO $moderation_mutation$
DECLARE p prompt12_parameters%ROWTYPE; pr public.profiles%ROWTYPE; target_state public.profile_publication_state;
  caught_state text; caught_message text; caught_detail text;
BEGIN
  SELECT * INTO STRICT p FROM prompt12_parameters;
  SELECT * INTO STRICT pr FROM public.profiles WHERE user_id = p.owner_id;
  target_state := CASE pr.publication_state WHEN 'submitted' THEN 'changes_requested'::public.profile_publication_state WHEN 'approved' THEN 'revoked'::public.profile_publication_state ELSE NULL END;
  IF target_state IS NULL THEN RAISE EXCEPTION 'owner profile must be submitted or approved' USING ERRCODE = '22023'; END IF;
  BEGIN
    PERFORM public.moderate_profile(p.owner_id, target_state, pr.publication_state, 'Synthetic rollback feedback', pr.updated_at);
    RAISE EXCEPTION 'expected audit fault did not occur' USING ERRCODE = 'U1299';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS caught_state = RETURNED_SQLSTATE,
      caught_message = MESSAGE_TEXT, caught_detail = PG_EXCEPTION_DETAIL;
    IF caught_state <> 'U1201' OR caught_message <> 'prompt12 synthetic audit insertion failure'
       OR caught_detail <> p.fault_detail THEN RAISE; END IF;
    INSERT INTO prompt12_outcomes VALUES ('moderation', caught_state, caught_message, caught_detail);
  END;
END
$moderation_mutation$;
RESET ROLE;
DO $moderation_assertion$
DECLARE p prompt12_parameters%ROWTYPE; profile_digest text; feedback_digest text; audit_digest text;
BEGIN
  SELECT * INTO STRICT p FROM prompt12_parameters;
  SELECT encode(extensions.digest(to_jsonb(x)::text, 'sha256'), 'hex') INTO profile_digest FROM public.profiles x WHERE x.user_id = p.owner_id;
  SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id)::text, '[]'), 'sha256'), 'hex') INTO feedback_digest FROM public.profile_moderation_feedback x WHERE x.profile_id = p.owner_id;
  SELECT encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id)::text, '[]'), 'sha256'), 'hex') INTO audit_digest FROM public.audit_logs x WHERE x.target_id = p.owner_id;
  IF profile_digest <> (SELECT digest FROM prompt12_moderation_profile_before)
     OR feedback_digest <> (SELECT digest FROM prompt12_feedback_before)
     OR audit_digest <> (SELECT digest FROM prompt12_moderation_audit_before)
     OR NOT EXISTS (SELECT 1 FROM prompt12_outcomes WHERE case_name = 'moderation' AND sqlstate = 'U1201')
  THEN RAISE EXCEPTION 'moderation/feedback mutation did not roll back exactly' USING ERRCODE = 'U1212'; END IF;
END
$moderation_assertion$;
RELEASE SAVEPOINT moderation_case;

DO $all_cases$
BEGIN
  IF (SELECT count(*) FROM prompt12_outcomes) <> 3 THEN
    RAISE EXCEPTION 'not all rollback cases completed' USING ERRCODE = 'U1213';
  END IF;
END
$all_cases$;

ROLLBACK;

-- These checks run in the same session after the outer rollback, so pg_my_temp_schema()
-- refers to the correct temporary namespace. Both catalog objects must already be absent.
SELECT NOT EXISTS (
  SELECT 1 FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE t.tgname = 'prompt12_fail_audit' AND n.nspname = 'public' AND c.relname = 'audit_logs'
) AS trigger_removed,
NOT EXISTS (
  SELECT 1 FROM pg_proc p
  WHERE p.pronamespace = pg_my_temp_schema() AND p.proname = 'prompt12_fail_audit'
) AS helper_removed
\gset prompt12_
\if :prompt12_trigger_removed
\else
  \echo 'post-rollback trigger cleanup check failed'
  \quit 4
\endif
\if :prompt12_helper_removed
\else
  \echo 'post-rollback helper cleanup check failed'
  \quit 4
\endif
\echo 'PASS: all three exact-state rollback cases and catalog cleanup checks succeeded'

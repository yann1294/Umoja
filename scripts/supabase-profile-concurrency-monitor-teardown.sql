-- Owner-run teardown for the short-lived Prompt 12 monitoring login.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '2s';
REVOKE pg_read_all_stats FROM umoja_prompt12_monitor;
REVOKE CONNECT ON DATABASE postgres FROM umoja_prompt12_monitor;
DROP ROLE umoja_prompt12_monitor;
COMMIT;

SELECT NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'umoja_prompt12_monitor'
) AS monitor_removed;

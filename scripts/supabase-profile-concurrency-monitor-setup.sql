-- Owner-run setup for one short-lived Prompt 12 monitoring login.
-- psql prompts locally for the password; do not pass it in chat, argv, or Git.
\set ON_ERROR_STOP on

BEGIN;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '2s';

CREATE ROLE umoja_prompt12_monitor
  LOGIN
  INHERIT
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS
  CONNECTION LIMIT 1;
ALTER ROLE umoja_prompt12_monitor SET default_transaction_read_only = on;
ALTER ROLE umoja_prompt12_monitor SET statement_timeout = '40s';
ALTER ROLE umoja_prompt12_monitor SET idle_session_timeout = '60s';
GRANT CONNECT ON DATABASE postgres TO umoja_prompt12_monitor;
GRANT pg_read_all_stats TO umoja_prompt12_monitor;
COMMIT;

\password umoja_prompt12_monitor

SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication,
  rolbypassrls, rolconnlimit
FROM pg_roles
WHERE rolname = 'umoja_prompt12_monitor';

-- Read-only Prompt 12 concurrency observer. This grants nothing and performs no DDL.
-- Required access: CONNECT plus pg_read_all_stats (or an equivalent narrowly scoped monitor role).
-- Start this session before the HTTP harness. It samples for 30 seconds and never selects query text.
\set ON_ERROR_STOP on
\pset format unaligned
\pset fieldsep '|'
\pset tuples_only on

BEGIN READ ONLY;
SET LOCAL statement_timeout = '35s';
SET LOCAL lock_timeout = '1s';
SET LOCAL search_path = pg_catalog;

WITH candidate AS (
  SELECT a.pid, a.state, a.wait_event_type, a.wait_event,
    clock_timestamp() - a.query_start AS query_age,
    clock_timestamp() - a.xact_start AS transaction_age,
    pg_blocking_pids(a.pid) AS blocking_pids,
    CASE
      WHEN a.query ILIKE '%save_profile_with_audit%' THEN 'profile_save'
      WHEN a.query ILIKE '%moderate_profile%' THEN 'profile_moderation'
      ELSE 'other_profile_request'
    END AS operation
  FROM pg_stat_activity a
  WHERE a.pid <> pg_backend_pid()
    AND a.datname = current_database()
    AND a.backend_type = 'client backend'
    AND (a.query ILIKE '%save_profile_with_audit%' OR a.query ILIKE '%moderate_profile%')
), lock_summary AS (
  SELECT l.pid,
    count(*) FILTER (WHERE l.granted) AS granted_locks,
    count(*) FILTER (WHERE NOT l.granted) AS waiting_locks,
    coalesce(array_agg(DISTINCT l.mode ORDER BY l.mode) FILTER (WHERE NOT l.granted), '{}') AS waiting_modes
  FROM pg_locks l JOIN candidate c ON c.pid = l.pid
  GROUP BY l.pid
)
SELECT to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS.MSOf') AS observed_at,
  c.pid, c.operation, c.state, c.wait_event_type, c.wait_event,
  c.query_age, c.transaction_age, c.blocking_pids,
  coalesce(l.granted_locks, 0) AS granted_locks,
  coalesce(l.waiting_locks, 0) AS waiting_locks,
  coalesce(l.waiting_modes, '{}') AS waiting_modes
FROM candidate c LEFT JOIN lock_summary l USING (pid)
ORDER BY c.query_age DESC;
\watch i=0.25 c=120 m=0
ROLLBACK;

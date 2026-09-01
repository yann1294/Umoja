# Prompt 12 Supabase REST concurrency diagnostic record

Status: resolved and verified in the development project; synthetic data only.

## Historical reproduction

Project ref: `ucfrrtgqbzjrrevsxput`

Run `fab0a9e6-bf8c-48a2-9da5-afe5a46f7306` reproduced the failure from
`2026-08-31T12:08:53.884Z` through `12:09:22.025Z`. Two authenticated
same-version saves started within 2 ms and uploaded within 3 ms. Save B returned HTTP 200 in 372 ms
(`sb-request-id` `01a057b9-0b72-76c1-8c6b-680a2c1d3caa`; edge correlation
`a33bec7f0f61b2b7-BLR`), while save A received no response headers before the fixed 20-second client
bound. Equivalent independent HTTP/1.1 and shared-session HTTP/2 probes produced the same symptom.

The live read-only observer reported no persistent lock wait, blocker or long-running transaction.
After cancellation, one earlier probe briefly appeared as `idle in transaction (aborted)` /
`ClientRead`, with zero locks and blockers, before ending. Cleanup remained suppressed until a
separate activity check proved the database operation had ended.

## Log-confirmed cause

A fresh correlated run, `01d3d2c8-0779-4b79-b219-d83d0a8faf0d`, ran from
`2026-08-31T12:48:05.761Z` through `12:48:35.055Z`. Save A returned HTTP 200 in 420 ms; save B
uploaded in 2 ms but received no headers by 20 seconds. The edge log contained only save A, with
origin time 327 ms and request ID `01a057dc-f332-786e-bf6c-5dba059bc778`.

Narrow Management API log inspection then found repeated PostgREST 14.5 errors for the losing save
between `12:48:13.270Z` and `12:48:13.310Z`. Every sampled error was the RPC's intended stale-version
exception. The function emitted SQLSTATE `40001`, which PostgreSQL reserves for retryable
serialization failures. PostgREST therefore repeatedly executed the application conflict instead of
returning it to the HTTP client. The prior managed admission/pool explanation was a hypothesis and is
superseded by this correlated log evidence.

No token, cookie, request body, response body, connection string or unrelated SQL text was queried or
recorded. Log access used the existing local Supabase CLI session and the read-only
`analytics_logs_read` Management API surface.

## Resolution

- `20260831131500_profile_rest_conflict_codes.sql` changes stale profile and moderation conflicts to
  PostgREST's documented `PT409` SQLSTATE, preserving rollback while returning HTTP 409.
- `20260831132500_remove_legacy_moderation_rpc.sql` removes the obsolete authenticated three-argument
  moderation overload that still emitted `40001`.
- The REST harness recognizes `PT409`, retains its fixed 20-second bound, and still performs no retry.
- Fixture cleanup now deletes profile owners before reviewer admins, respecting the intentional
  `profile_moderation_feedback.reviewer_id ON DELETE RESTRICT` relationship.
- `--cleanup-run <uuid>` limits recovery cleanup to one validated synthetic run.

No pool setting, service restart, plan change, timeout increase, direct-database application fallback
or provider support contact was used.

## Post-fix acceptance

Three clean authenticated REST runs passed all required scenarios:

- `e7ff74ac-2275-4be9-b018-c68b069fdca9`
- `1f40705b-3611-40a9-ad28-f49715feeec3`
- `609214dc-df3e-49ce-807a-62e27d52dd62`

Each run completed simultaneous same-version saves, competing moderation decisions, and applicant edit
versus approval of an earlier reviewed version. Every pair produced exactly one HTTP 200 and one
controlled HTTP 409. All requests settled within 625 ms, and complete profile/private-details/
feedback/audit snapshots showed exactly one coherent state transition with safe publication outcomes.
The final run's gateway logs contained three 200 and three 409 responses with 233–414 ms origin times.

Each successful run confirmed operation settlement before dependency-ordered five-user cleanup. Final
inventory returned zero matching Auth users, profiles and active RPC sessions. The deployed current RPC
definitions contain two `PT409` paths and zero `40001` paths.

Provider or owner log action is no longer required for this gate.

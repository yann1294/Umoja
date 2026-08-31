# Prompt 12 Supabase REST concurrency support packet

Status: provider confirmation required; development project only; synthetic data only.

## Minimal reproduction

Project ref: `ucfrrtgqbzjrrevsxput`

1. Start `scripts/supabase-profile-concurrency-observe.sql` through a read-only statistics-capable
   PostgreSQL connection before the HTTP harness. It samples matching RPC activity every 250 ms for
   30 seconds and emits no query text.
2. Run `node scripts/supabase-profile-concurrency.mjs`. It creates exact-prefix synthetic users,
   seeds submitted profiles, then sends two same-version `save_profile_with_audit` calls over one
   native HTTP/2 session. Both streams use exact content lengths and distinct synthetic
   `x-client-info` correlation values.
3. Keep the 20-second client bound unchanged. If a request times out, do not clean fixtures until a
   separate PostgreSQL activity/lock check proves the database operation ended.
4. After completion proof, run
   `node scripts/supabase-profile-concurrency.mjs --cleanup-exposed-probes` and confirm exactly five
   synthetic users were removed.

The equivalent actual RPCs pass when run through two direct PostgreSQL sessions under
`SET LOCAL ROLE authenticated` with synthetic `request.jwt.claims`; see run
`f82326c5-cdc3-4776-8705-1fa3c244cb49`. That result is intentionally separate from REST health.

## Timestamped reproduction

- Run ID: `fab0a9e6-bf8c-48a2-9da5-afe5a46f7306`
- Overall UTC window: `2026-08-31T12:08:53.884Z` to `2026-08-31T12:09:22.025Z`
- HTTP/2 session setup: 46 ms
- Request start skew: 2 ms
- Save A client correlation:
  `umoja-prompt12/fab0a9e6-bf8c-48a2-9da5-afe5a46f7306/save_a`
  - body sent: 3 ms
  - no response headers by 20,004 ms
  - no server response identifier was available
- Save B client correlation:
  `umoja-prompt12/fab0a9e6-bf8c-48a2-9da5-afe5a46f7306/save_b`
  - body sent: 1 ms
  - HTTP 200 headers: 371 ms; response complete: 372 ms
  - Supabase request ID: `01a057b9-0b72-76c1-8c6b-680a2c1d3caa`
  - edge correlation: `a33bec7f0f61b2b7-BLR`
- The committed state contained only save B's expected profile/audit change.
- The live observer found no matching active PostgreSQL statement during the pending interval.
- The bounded post-timeout check found no unfinished matching database session before cleanup.
- Exact-prefix cleanup removed five synthetic users; no test user remains from this run.

## Observed facts

- Both requests were initiated within 2 ms on the same established HTTP/2 session.
- Both request bodies completed locally within 3 ms.
- One request completed successfully in 372 ms.
- The other received no response headers before the fixed 20-second client bound.
- Live PostgreSQL observation did not show the pending request executing or waiting on a database
  lock during that interval.
- Earlier equivalent reproductions over independent HTTP/1.1 sockets and exact `Content-Length`
  produced the same behavior. One earlier cancelled request was later seen briefly as
  `idle in transaction (aborted)` / `ClientRead`, with zero locks and zero blocking PIDs, then ended.
- Direct authenticated-role PostgreSQL overlap produces one commit plus one controlled `40001` in
  all three required conflict scenarios.

## Inference requiring provider confirmation

The evidence localizes the delay after request upload and before an observable PostgreSQL execution.
It is consistent with delayed admission or connection acquisition in the managed Supabase REST /
PostgREST path. Client timing and database statistics cannot identify the internal managed component,
queue reason or project-side configuration; only provider gateway/PostgREST/pool logs can confirm it.

No service restart, pool-setting change, plan upgrade, retry loop or external support contact is
authorized by this packet.

## Exact owner action

In Supabase Dashboard **Logs Explorer**, inspect the single UTC window and correlation identifiers
above across API gateway and PostgREST logs. Export only redacted matching events, including any
connection-acquisition, pool-timeout, cancellation or upstream-routing fields, and return that export
for review. Do not change project settings or contact support yet.

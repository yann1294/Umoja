#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";

const env = Object.fromEntries(
  readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const serviceFile = process.env.PGSERVICEFILE;
const passwordFile = process.env.PGPASSFILE;
if (!url || !secretKey || !serviceFile || !passwordFile)
  throw new Error("direct_concurrency_configuration_unavailable");

const psql = existsSync("/opt/homebrew/opt/libpq/bin/psql")
  ? "/opt/homebrew/opt/libpq/bin/psql"
  : "psql";
const service = process.env.PGSERVICE ?? "umoja_dev_owner";
const runId = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const fixtureUsers = new Set();
const activeClients = new Set();
const results = { runId, transport: "two_psql_sessions", cases: {}, cleanup: "not_started" };

const serviceHeaders = {
  apikey: secretKey,
  authorization: `Bearer ${secretKey}`,
  "content-type": "application/json",
};

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function request(path, options = {}) {
  return fetch(`${url}${path}`, { ...options, signal: AbortSignal.timeout(10_000) });
}

async function createUser(label, role = null) {
  const email = `profile-direct-${label}-${runId}@example.test`;
  const response = await request("/auth/v1/admin/users", {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`fixture_create_${label}_${response.status}`);
  const { id } = await response.json();
  fixtureUsers.add(id);
  if (role) {
    for (const [path, body] of [
      ["/rest/v1/user_roles", { user_id: id, role }],
      [
        "/rest/v1/membership_history",
        { user_id: id, tier: "core", effective_from: new Date().toISOString() },
      ],
    ]) {
      const seeded = await request(path, {
        method: "POST",
        headers: { ...serviceHeaders, prefer: "return=minimal" },
        body: JSON.stringify(body),
      });
      if (!seeded.ok) throw new Error(`fixture_seed_${label}_${seeded.status}`);
    }
  }
  return { id, email };
}

function runPsql(label, sql, timeoutMs = 12_000) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const child = spawn(psql, [`service=${service}`, "-X", "-v", "ON_ERROR_STOP=1", "-At"], {
      env: {
        ...process.env,
        PGSERVICEFILE: serviceFile,
        PGPASSFILE: passwordFile,
        PGAPPNAME: `umoja-prompt12-direct-${label}`,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    activeClients.add(child);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      if (stdout.length < 64_000) stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 64_000) stderr += chunk;
    });
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      activeClients.delete(child);
      const controlledConflict = /stale (?:profile|moderation decision)/i.test(stderr);
      resolve({
        label,
        elapsedMs: Math.round(performance.now() - startedAt),
        status:
          code === 0 ? "committed" : controlledConflict ? "controlled_stale_conflict" : "failed",
        timedOut: signal === "SIGTERM",
        stdout,
      });
    });
    child.stdin.end(sql);
  });
}

function authenticatedSql(actorId, body, barrier = null) {
  return `
\\set VERBOSITY terse
BEGIN;
SET LOCAL statement_timeout = '8s';
SET LOCAL lock_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '10s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', ${literal(actorId)}, 'role', 'authenticated')::text, true);
${barrier ? `SELECT pg_sleep(greatest(0, extract(epoch FROM (${literal(barrier)}::timestamptz - clock_timestamp()))));` : ""}
${body}
COMMIT;
`;
}

async function seedSubmittedProfile(owner, label) {
  const slug = `profile-direct-${label}-${runId}`;
  const sql = authenticatedSql(
    owner.id,
    `SELECT (public.save_profile_with_audit(
      ${literal(owner.id)}::uuid, ${literal(`Synthetic direct ${label}`)}, 'en', 'KE',
      'Synthetic direct concurrency fixture', ${literal(slug)}, 'public'::public.profile_visibility,
      'submitted'::public.profile_publication_state, true, null, null, null
    )).updated_at;`,
  );
  const result = await runPsql(`seed-${label}`, sql);
  if (result.status !== "committed") throw new Error(`profile_seed_${label}_${result.status}`);
  return { slug };
}

async function snapshot(ownerId) {
  const sql = `
SET statement_timeout = '8s';
SELECT p.updated_at, p.professional_name, p.publication_state,
  (SELECT count(*) FROM public.profile_moderation_feedback f WHERE f.profile_id=p.user_id),
  (SELECT count(*) FROM public.audit_logs a WHERE a.target_id=p.user_id),
  encode(extensions.digest(jsonb_build_object(
    'profile', to_jsonb(p),
    'private', coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.user_id) FROM public.private_profile_details d WHERE d.user_id=p.user_id), '[]'::jsonb),
    'feedback', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.created_at,f.id) FROM public.profile_moderation_feedback f WHERE f.profile_id=p.user_id), '[]'::jsonb),
    'audit', coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at,a.id) FROM public.audit_logs a WHERE a.target_id=p.user_id), '[]'::jsonb)
  )::text, 'sha256'), 'hex')
FROM public.profiles p WHERE p.user_id=${literal(ownerId)}::uuid;
`;
  const result = await runPsql("snapshot", sql);
  if (result.status !== "committed") throw new Error("snapshot_failed");
  const line = result.stdout.trim().split("\n").at(-1) ?? "";
  const [updatedAt, name, state, feedbackCount, auditCount, digest] = line.split("|");
  if (!updatedAt || !digest) throw new Error("snapshot_invalid");
  return {
    updatedAt,
    name,
    state,
    feedbackCount: Number(feedbackCount),
    auditCount: Number(auditCount),
    digest,
  };
}

function assertPair(caseName, pair) {
  const commits = pair.filter((item) => item.status === "committed").length;
  const conflicts = pair.filter((item) => item.status === "controlled_stale_conflict").length;
  if (commits !== 1 || conflicts !== 1 || pair.some((item) => item.timedOut))
    throw new Error(`${caseName}_unexpected_outcomes`);
}

async function runPair(caseName, first, second, ownerId, assertState) {
  const before = await snapshot(ownerId);
  const barrier = new Date(Date.now() + 1_500).toISOString();
  const startedAt = performance.now();
  const pair = await Promise.all([first(before, barrier), second(before, barrier)]);
  const after = await snapshot(ownerId);
  assertPair(caseName, pair);
  assertState(before, after);
  results.cases[caseName] = {
    wallMs: Math.round(performance.now() - startedAt),
    requests: pair.map(({ label, elapsedMs, status, timedOut }) => ({
      label,
      elapsedMs,
      status,
      timedOut,
    })),
    beforeDigest: before.digest,
    afterDigest: after.digest,
    state: {
      profileName: after.name,
      profileState: after.state,
      feedbackCount: after.feedbackCount,
      auditCount: after.auditCount,
    },
  };
}

async function removeFixtures() {
  for (const id of fixtureUsers) {
    const response = await request(`/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: serviceHeaders,
      body: JSON.stringify({ should_soft_delete: false }),
    });
    if (!response.ok && response.status !== 404)
      throw new Error(`fixture_cleanup_${response.status}`);
  }
  results.cleanup = `exact_${fixtureUsers.size}_users_removed_after_sessions_ended`;
}

async function databaseOperationsFinished() {
  const result = await runPsql(
    "completion-check",
    `SET statement_timeout = '8s';
     SELECT count(*) FROM pg_stat_activity
     WHERE pid <> pg_backend_pid()
       AND datname = current_database()
       AND application_name LIKE 'umoja-prompt12-direct-%'
       AND (state <> 'idle' OR xact_start IS NOT NULL);`,
  );
  return result.status === "committed" && result.stdout.trim().split("\n").at(-1) === "0";
}

try {
  const saveOwner = await createUser("save");
  const moderationOwner = await createUser("moderation");
  const editOwner = await createUser("edit");
  const adminA = await createUser("admin-a", "admin");
  const adminB = await createUser("admin-b", "admin");
  await seedSubmittedProfile(saveOwner, "save");
  await seedSubmittedProfile(moderationOwner, "moderation");
  await seedSubmittedProfile(editOwner, "edit");

  await runPair(
    "same_version_saves",
    (before, barrier) =>
      runPsql(
        "save-a",
        authenticatedSql(
          saveOwner.id,
          `SELECT 1 FROM public.save_profile_with_audit(${literal(saveOwner.id)}::uuid, 'Synthetic direct save A', 'en', 'KE', 'Synthetic direct concurrency fixture', ${literal(`profile-direct-save-${runId}`)}, 'public'::public.profile_visibility, 'submitted'::public.profile_publication_state, true, ${literal(before.updatedAt)}::timestamptz, null, null);`,
          barrier,
        ),
      ),
    (before, barrier) =>
      runPsql(
        "save-b",
        authenticatedSql(
          saveOwner.id,
          `SELECT 1 FROM public.save_profile_with_audit(${literal(saveOwner.id)}::uuid, 'Synthetic direct save B', 'en', 'KE', 'Synthetic direct concurrency fixture', ${literal(`profile-direct-save-${runId}`)}, 'public'::public.profile_visibility, 'submitted'::public.profile_publication_state, true, ${literal(before.updatedAt)}::timestamptz, null, null);`,
          barrier,
        ),
      ),
    saveOwner.id,
    (before, after) => {
      if (
        after.digest === before.digest ||
        !["Synthetic direct save A", "Synthetic direct save B"].includes(after.name) ||
        after.state !== "submitted" ||
        after.feedbackCount !== before.feedbackCount ||
        after.auditCount !== before.auditCount + 1
      )
        throw new Error("same_version_state_inconsistent");
    },
  );

  await runPair(
    "competing_moderation",
    (before, barrier) =>
      runPsql(
        "moderate-approved",
        authenticatedSql(
          adminA.id,
          `SELECT 1 FROM public.moderate_profile(${literal(moderationOwner.id)}::uuid, 'approved'::public.profile_publication_state, 'submitted'::public.profile_publication_state, 'Synthetic direct approved', ${literal(before.updatedAt)}::timestamptz);`,
          barrier,
        ),
      ),
    (before, barrier) =>
      runPsql(
        "moderate-changes",
        authenticatedSql(
          adminB.id,
          `SELECT 1 FROM public.moderate_profile(${literal(moderationOwner.id)}::uuid, 'changes_requested'::public.profile_publication_state, 'submitted'::public.profile_publication_state, 'Synthetic direct changes', ${literal(before.updatedAt)}::timestamptz);`,
          barrier,
        ),
      ),
    moderationOwner.id,
    (before, after) => {
      if (
        after.digest === before.digest ||
        !["approved", "changes_requested"].includes(after.state) ||
        after.feedbackCount !== before.feedbackCount + 1 ||
        after.auditCount !== before.auditCount + 1
      )
        throw new Error("moderation_state_inconsistent");
    },
  );

  await runPair(
    "edit_versus_approval",
    (before, barrier) =>
      runPsql(
        "owner-edit",
        authenticatedSql(
          editOwner.id,
          `SELECT 1 FROM public.save_profile_with_audit(${literal(editOwner.id)}::uuid, 'Synthetic direct edited version', 'en', 'KE', 'Synthetic direct edit competing with approval', ${literal(`profile-direct-edit-${runId}`)}, 'public'::public.profile_visibility, 'submitted'::public.profile_publication_state, true, ${literal(before.updatedAt)}::timestamptz, null, null);`,
          barrier,
        ),
      ),
    (before, barrier) =>
      runPsql(
        "earlier-approval",
        authenticatedSql(
          adminA.id,
          `SELECT 1 FROM public.moderate_profile(${literal(editOwner.id)}::uuid, 'approved'::public.profile_publication_state, 'submitted'::public.profile_publication_state, 'Synthetic direct earlier approval', ${literal(before.updatedAt)}::timestamptz);`,
          barrier,
        ),
      ),
    editOwner.id,
    (before, after) => {
      const editWon =
        after.name === "Synthetic direct edited version" &&
        after.state === "submitted" &&
        after.feedbackCount === before.feedbackCount;
      const approvalWon =
        after.name === before.name &&
        after.state === "approved" &&
        after.feedbackCount === before.feedbackCount + 1;
      if (
        after.digest === before.digest ||
        (!editWon && !approvalWon) ||
        after.auditCount !== before.auditCount + 1
      )
        throw new Error("edit_approval_state_inconsistent");
    },
  );
  results.success = true;
} catch (error) {
  results.success = false;
  results.failureCategory =
    error instanceof Error && /unexpected_outcomes|state_inconsistent/.test(error.message)
      ? "controlled_conflict_assertion_failed"
      : "fixture_or_harness_failure";
  process.exitCode = 1;
} finally {
  const unfinishedClients = [...activeClients];
  for (const child of unfinishedClients) child.kill("SIGTERM");
  await Promise.all(unfinishedClients.map((child) => once(child, "close")));
  const completionProven = await databaseOperationsFinished().catch(() => false);
  if (completionProven)
    await removeFixtures().catch(() => {
      results.cleanup = "failed";
      results.success = false;
      process.exitCode = 1;
    });
  else {
    results.cleanup = "intentionally_skipped_database_completion_unknown";
    results.success = false;
    process.exitCode = 1;
  }
  console.log(JSON.stringify(results));
}

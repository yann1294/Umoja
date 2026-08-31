#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import https from "node:https";

const REQUEST_LIMIT_MS = 20_000;
const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey) {
  throw new Error("Supabase development configuration is unavailable");
}

const runId = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const fixtureUsers = new Set();
const unsettledRequests = new Set();
const results = {
  runId,
  requestLimitMs: REQUEST_LIMIT_MS,
  concurrentTransport: "native_https_dedicated_socket",
  cases: {},
  cleanup: "not_started",
};
let cleanupSafe = true;

const serviceHeaders = {
  apikey: secretKey,
  authorization: `Bearer ${secretKey}`,
  "content-type": "application/json",
};

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function categoryFromError(status, payload) {
  const code = typeof payload?.code === "string" ? payload.code : "";
  const message = typeof payload?.message === "string" ? payload.message.toLowerCase() : "";
  if (
    code === "40001" ||
    message.includes("stale profile") ||
    message.includes("stale moderation")
  ) {
    return "controlled_stale_conflict";
  }
  if (status === 401 || status === 403 || code === "42501") return "authorization_denied";
  if (status === 408 || status === 504) return "gateway_timeout";
  if (status >= 500) return "server_error_unclassified";
  if (status >= 400) return "request_error_unclassified";
  return "none";
}

async function request(path, options = {}) {
  return fetch(`${url}${path}`, options);
}

async function timedRequest(label, path, options) {
  const startedAt = performance.now();
  let timer;
  let activeRequest;
  const operation = new Promise((resolve, reject) => {
    const target = new URL(path, url);
    activeRequest = https.request(
      target,
      {
        method: options.method,
        headers: { ...options.headers, connection: "close" },
        agent: false,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          let payload = null;
          if ((response.statusCode ?? 500) >= 400) {
            try {
              payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              payload = null;
            }
          }
          resolve({ status: response.statusCode ?? 500, payload });
        });
      },
    );
    activeRequest.on("error", reject);
    if (options.body) activeRequest.write(options.body);
    activeRequest.end();
  });
  unsettledRequests.add(label);
  try {
    const response = await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          activeRequest?.destroy();
          reject(new Error("bounded-client-timeout"));
        }, REQUEST_LIMIT_MS);
      }),
    ]);
    return {
      label,
      startedAtMs: Math.round(startedAt),
      elapsedMs: Math.round(performance.now() - startedAt),
      status: response.status,
      category: categoryFromError(response.status, response.payload),
      settled: true,
    };
  } catch (error) {
    cleanupSafe = false;
    return {
      label,
      startedAtMs: Math.round(startedAt),
      elapsedMs: Math.round(performance.now() - startedAt),
      status: null,
      category:
        error instanceof Error && error.message === "bounded-client-timeout"
          ? "client_timeout_database_completion_unknown"
          : "network_or_pool_failure",
      settled: false,
    };
  } finally {
    clearTimeout(timer);
    unsettledRequests.delete(label);
  }
}

async function createUser(label, role = null) {
  const email = `profile-${label}-${runId}@example.test`;
  const created = await request("/auth/v1/admin/users", {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) throw new Error(`fixture_create_${label}_${created.status}`);
  const { id } = await created.json();
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
  const token = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!token.ok) throw new Error(`fixture_auth_${label}_${token.status}`);
  const { access_token: accessToken } = await token.json();
  return {
    id,
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  };
}

async function createSubmittedProfile(owner, label) {
  const response = await request("/rest/v1/rpc/save_profile_with_audit", {
    method: "POST",
    headers: owner.headers,
    body: JSON.stringify({
      profile_user_id: owner.id,
      professional_name: `Synthetic ${label}`,
      profile_locale: "en",
      profile_country: "KE",
      profile_bio: "Synthetic concurrency fixture",
      profile_slug: `profile-${label}-${runId}`,
      profile_visibility: "public",
      requested_state: "submitted",
      consent_given: true,
      private_envelope: "v1.c3ludGhldGlj.aXY.Y2lwaGVydGV4dA",
      private_key_version: "v1",
    }),
  });
  if (!response.ok) throw new Error(`profile_seed_${label}_${response.status}`);
  return response.json();
}

async function snapshot(ownerId) {
  const resources = {};
  for (const [name, path] of Object.entries({
    profile: `/rest/v1/profiles?select=*&user_id=eq.${ownerId}`,
    privateDetails: `/rest/v1/private_profile_details?select=*&user_id=eq.${ownerId}`,
    feedback: `/rest/v1/profile_moderation_feedback?select=*&profile_id=eq.${ownerId}&order=created_at,id`,
    audit: `/rest/v1/audit_logs?select=*&target_id=eq.${ownerId}&order=created_at,id`,
  })) {
    const response = await request(path, { headers: serviceHeaders });
    if (!response.ok) throw new Error(`snapshot_${name}_${response.status}`);
    resources[name] = await response.json();
  }
  return {
    digest: digest(resources),
    profileState: resources.profile[0]?.publication_state ?? null,
    profileName: resources.profile[0]?.professional_name ?? null,
    feedbackCount: resources.feedback.length,
    auditCount: resources.audit.length,
  };
}

function assertControlledPair(caseName, pair) {
  const successes = pair.filter((item) => item.status === 200).length;
  const conflicts = pair.filter((item) => item.category === "controlled_stale_conflict").length;
  if (pair.some((item) => !item.settled)) {
    throw new Error(`${caseName}_database_completion_unproven`);
  }
  if (successes !== 1 || conflicts !== 1) throw new Error(`${caseName}_unexpected_outcomes`);
}

async function runConcurrentCase(caseName, first, second, ownerId, stateCheck) {
  const before = await snapshot(ownerId);
  const synchronizedAt = performance.now();
  const pairPromise = Promise.all([first(), second()]);
  const duringPromise = new Promise((resolve) => setTimeout(resolve, 1_000)).then(async () => ({
    ...(await snapshot(ownerId)),
    observedAfterStartMs: Math.round(performance.now() - synchronizedAt),
  }));
  const pair = await pairPromise;
  const during = await duringPromise;
  const after = await snapshot(ownerId);
  results.cases[caseName] = {
    harnessStartSkewMs: Math.abs(pair[0].startedAtMs - pair[1].startedAtMs),
    wallMs: Math.round(performance.now() - synchronizedAt),
    requests: pair,
    beforeDigest: before.digest,
    during: {
      observedAfterStartMs: during.observedAfterStartMs,
      digest: during.digest,
      profileState: during.profileState,
      profileName: during.profileName,
      feedbackCount: during.feedbackCount,
      auditCount: during.auditCount,
    },
    afterDigest: after.digest,
    state: {
      profileState: after.profileState,
      profileName: after.profileName,
      feedbackCount: after.feedbackCount,
      auditCount: after.auditCount,
    },
  };
  assertControlledPair(caseName, pair);
  stateCheck(before, after);
}

async function cleanupHistoricalProbeUsers() {
  const exactPattern =
    /^profile-(?:concurrency(?:-admin-[ab])?|moderation|edit-approval)-[0-9a-f-]+@example\.test$/;
  const matchingUsers = [];
  let removed = 0;
  for (let page = 1; ; page += 1) {
    const response = await request(`/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: serviceHeaders,
    });
    if (!response.ok) throw new Error(`historical_inventory_${response.status}`);
    const payload = await response.json();
    const users = Array.isArray(payload.users) ? payload.users : [];
    for (const user of users) {
      if (typeof user.email === "string" && exactPattern.test(user.email)) {
        matchingUsers.push(user.id);
      }
    }
    if (users.length < 1000) break;
  }
  for (const id of matchingUsers) {
    const removedUser = await request(`/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: serviceHeaders,
      body: JSON.stringify({ should_soft_delete: false }),
    });
    if (!removedUser.ok) throw new Error(`historical_cleanup_${removedUser.status}`);
    removed += 1;
  }
  console.log(JSON.stringify({ historicalSyntheticUsersRemoved: removed }));
}

if (process.argv.includes("--cleanup-exposed-probes")) {
  await cleanupHistoricalProbeUsers();
  process.exit(0);
}

try {
  const [saveOwner, moderationOwner, editOwner, adminA, adminB] = await Promise.all([
    createUser("concurrency", null),
    createUser("moderation", null),
    createUser("edit-approval", null),
    createUser("concurrency-admin-a", "admin"),
    createUser("concurrency-admin-b", "admin"),
  ]);
  const [saveVersion, moderationVersion, editVersion] = await Promise.all([
    createSubmittedProfile(saveOwner, "concurrency"),
    createSubmittedProfile(moderationOwner, "moderation"),
    createSubmittedProfile(editOwner, "edit-approval"),
  ]);

  const saveBody = (name) => ({
    profile_user_id: saveOwner.id,
    professional_name: name,
    profile_locale: "en",
    profile_country: "KE",
    profile_bio: "Synthetic concurrency fixture",
    profile_slug: `profile-concurrency-${runId}`,
    profile_visibility: "public",
    requested_state: "submitted",
    consent_given: true,
    expected_updated_at: saveVersion.updated_at,
  });
  await runConcurrentCase(
    "simultaneous_same_version_saves",
    () =>
      timedRequest("save_a", "/rest/v1/rpc/save_profile_with_audit", {
        method: "POST",
        headers: saveOwner.headers,
        body: JSON.stringify(saveBody("Synthetic save A")),
      }),
    () =>
      timedRequest("save_b", "/rest/v1/rpc/save_profile_with_audit", {
        method: "POST",
        headers: saveOwner.headers,
        body: JSON.stringify(saveBody("Synthetic save B")),
      }),
    saveOwner.id,
    (before, after) => {
      if (
        after.digest === before.digest ||
        !["Synthetic save A", "Synthetic save B"].includes(after.profileName)
      )
        throw new Error("same_version_state_inconsistent");
    },
  );

  const moderationBody = (decision) => ({
    profile_user_id: moderationOwner.id,
    decision,
    expected_state: "submitted",
    feedback: `Synthetic ${decision}`,
    expected_updated_at: moderationVersion.updated_at,
  });
  await runConcurrentCase(
    "competing_moderation_decisions",
    () =>
      timedRequest("moderate_approve", "/rest/v1/rpc/moderate_profile", {
        method: "POST",
        headers: adminA.headers,
        body: JSON.stringify(moderationBody("approved")),
      }),
    () =>
      timedRequest("moderate_changes", "/rest/v1/rpc/moderate_profile", {
        method: "POST",
        headers: adminB.headers,
        body: JSON.stringify(moderationBody("changes_requested")),
      }),
    moderationOwner.id,
    (before, after) => {
      if (
        after.digest === before.digest ||
        !["approved", "changes_requested"].includes(after.profileState) ||
        after.feedbackCount !== before.feedbackCount + 1
      )
        throw new Error("moderation_state_inconsistent");
    },
  );

  const editBody = {
    profile_user_id: editOwner.id,
    professional_name: "Synthetic edited version",
    profile_locale: "en",
    profile_country: "KE",
    profile_bio: "Synthetic edit competing with approval",
    profile_slug: `profile-edit-approval-${runId}`,
    profile_visibility: "public",
    requested_state: "submitted",
    consent_given: true,
    expected_updated_at: editVersion.updated_at,
  };
  const approvalBody = {
    profile_user_id: editOwner.id,
    decision: "approved",
    expected_state: "submitted",
    feedback: "Synthetic earlier-version approval",
    expected_updated_at: editVersion.updated_at,
  };
  await runConcurrentCase(
    "edit_versus_earlier_review_approval",
    () =>
      timedRequest("owner_edit", "/rest/v1/rpc/save_profile_with_audit", {
        method: "POST",
        headers: editOwner.headers,
        body: JSON.stringify(editBody),
      }),
    () =>
      timedRequest("earlier_approval", "/rest/v1/rpc/moderate_profile", {
        method: "POST",
        headers: adminA.headers,
        body: JSON.stringify(approvalBody),
      }),
    editOwner.id,
    (before, after) => {
      const editWon =
        after.profileName === "Synthetic edited version" &&
        after.profileState === "submitted" &&
        after.feedbackCount === before.feedbackCount;
      const approvalWon =
        after.profileName !== "Synthetic edited version" &&
        after.profileState === "approved" &&
        after.feedbackCount === before.feedbackCount + 1;
      if (after.digest === before.digest || (!editWon && !approvalWon))
        throw new Error("edit_approval_state_inconsistent");
    },
  );
  results.success = true;
} catch (error) {
  results.success = false;
  results.failureCategory =
    error instanceof Error && error.message.includes("database_completion_unproven")
      ? "database_completion_unproven"
      : "assertion_or_fixture_failure";
  process.exitCode = 1;
} finally {
  if (cleanupSafe && unsettledRequests.size === 0) {
    for (const id of fixtureUsers) {
      const response = await request(`/auth/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: serviceHeaders,
        body: JSON.stringify({ should_soft_delete: false }),
      });
      if (!response.ok) {
        results.cleanup = "failed";
        results.success = false;
        process.exitCode = 1;
        break;
      }
    }
    if (results.cleanup !== "failed")
      results.cleanup = "complete_after_all_http_and_database_transactions_settled";
  } else {
    results.cleanup = "intentionally_skipped_database_completion_unknown";
    results.ownerAction =
      "Run the read-only activity/lock observer, wait for zero matching activity, then use --cleanup-exposed-probes.";
  }
  console.log(JSON.stringify(results));
}

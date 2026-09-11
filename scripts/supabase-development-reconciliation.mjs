import { createHash } from "node:crypto";
import fs from "node:fs";

const environment = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const delimiter = line.indexOf("=");
      return [line.slice(0, delimiter), line.slice(delimiter + 1).replace(/^("|')|("|')$/g, "")];
    }),
);

const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const secret = environment.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Supabase development credentials are not configured.");

const headers = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};

async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!response.ok) throw new Error(`Reconciliation read failed (${response.status}).`);
  return response.json();
}

async function authUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const body = await request(`/auth/v1/admin/users?page=${page}&per_page=100`);
    const batch = Array.isArray(body) ? body : (body.users ?? []);
    users.push(...batch);
    if (batch.length < 100) return users;
  }
}

const users = await authUsers();
const syntheticUserIds = new Set(
  users
    .filter(({ email }) => typeof email === "string" && email.endsWith("@example.test"))
    .map(({ id }) => id),
);
const developmentIdentities = users.filter(({ id }) => !syntheticUserIds.has(id));
const syntheticIdentities = users.filter(({ id }) => syntheticUserIds.has(id));

const [roles, memberships, profiles, pages, revisions, projectIntakes, talentIntakes, audits] =
  await Promise.all([
    request("/rest/v1/user_roles?select=user_id,role,revoked_at"),
    request("/rest/v1/membership_history?select=user_id,effective_from,effective_to"),
    request("/rest/v1/profiles?select=user_id,archived_at"),
    request("/rest/v1/cms_pages?select=id,stable_key,author_id,updated_by_id,current_revision_id"),
    request("/rest/v1/cms_revisions?select=id,page_id,author_id,blocks"),
    request("/rest/v1/project_intakes?select=applicant_id,assigned_reviewer_id"),
    request("/rest/v1/talent_intakes?select=applicant_id,assigned_reviewer_id"),
    request("/rest/v1/audit_logs?select=actor_id,target_type,target_id"),
  ]);

const now = Date.now();
const identityResults = developmentIdentities.map((user) => {
  const activeRoles = roles.filter((role) => role.user_id === user.id && role.revoked_at === null);
  const activeMemberships = memberships.filter(
    (membership) =>
      membership.user_id === user.id &&
      new Date(membership.effective_from).getTime() <= now &&
      (membership.effective_to === null || new Date(membership.effective_to).getTime() > now),
  );
  const referencedByCms =
    pages.some((page) => page.author_id === user.id || page.updated_by_id === user.id) ||
    revisions.some((revision) => revision.author_id === user.id);
  const referencedByIntake = [...projectIntakes, ...talentIntakes].some(
    (intake) => intake.applicant_id === user.id || intake.assigned_reviewer_id === user.id,
  );
  const referencedByAudit = audits.some((audit) => audit.actor_id === user.id);
  const enabled =
    !user.deleted_at && (!user.banned_until || new Date(user.banned_until).getTime() <= now);
  const mfaEnrolled = Array.isArray(user.factors)
    ? user.factors.some((factor) => factor.status === "verified")
    : false;
  return {
    hasProfile: profiles.some(
      (profile) => profile.user_id === user.id && profile.archived_at === null,
    ),
    hasActiveRole: activeRoles.length > 0,
    hasActiveAdminRole: activeRoles.some((role) => role.role === "admin"),
    hasActiveMembership: activeMemberships.length > 0,
    enabled,
    mfaEnrolled,
    intendedDevelopmentAdministrator:
      enabled && activeMemberships.length > 0 && activeRoles.some((role) => role.role === "admin"),
    references: {
      cms: referencedByCms,
      intake: referencedByIntake,
      audit: referencedByAudit,
      otherApplicationRows: profiles.some((profile) => profile.user_id === user.id),
    },
  };
});

const storageEntries = await request("/storage/v1/object/list/cms-private", {
  method: "POST",
  body: JSON.stringify({
    prefix: "",
    limit: 1000,
    offset: 0,
    sortBy: { column: "created_at", order: "asc" },
  }),
});
const storageObjects = storageEntries.filter(
  (object) => typeof object.id === "string" && object.metadata !== null,
);

function pathDigest(path) {
  return createHash("sha256").update(path).digest("hex").slice(0, 16);
}

function revisionReferencesObject(revision, objectPath) {
  return JSON.stringify(revision.blocks).includes(JSON.stringify(objectPath).slice(1, -1));
}

const storageResults = storageObjects.map((object) => {
  const matchingRevisions = revisions.filter((revision) =>
    revisionReferencesObject(revision, object.name),
  );
  const matchingPageIds = new Set(matchingRevisions.map((revision) => revision.page_id));
  const matchingPages = pages.filter((page) => matchingPageIds.has(page.id));
  const knownSyntheticLifecycle =
    object.name.startsWith("synthetic-test/") ||
    syntheticUserIds.has(object.owner_id) ||
    syntheticUserIds.has(object.owner) ||
    matchingPages.some((page) => page.stable_key.startsWith("test:"));
  const referenced = matchingRevisions.length > 0;
  const referencedByNonSyntheticCms = matchingPages.some(
    (page) =>
      !page.stable_key.startsWith("test:") &&
      !syntheticUserIds.has(page.author_id) &&
      !syntheticUserIds.has(page.updated_by_id),
  );
  const classification = knownSyntheticLifecycle
    ? "verified synthetic fixture residue"
    : referencedByNonSyntheticCms
      ? "active referenced development media"
      : referenced
        ? "potentially real/private object"
        : "unreferenced unknown object";
  return {
    bucket: "cms-private",
    redactedPathDigest: pathDigest(object.name),
    size: Number(object.metadata?.size ?? 0),
    mimeType: object.metadata?.mimetype ?? "unknown",
    createdAt: object.created_at ?? null,
    updatedAt: object.updated_at ?? null,
    referencedByCmsMediaRow: matchingPages.some((page) => page.stable_key.startsWith("media:")),
    referencedByPageOrRevision: referenced,
    matchingKnownSyntheticLifecycle: knownSyntheticLifecycle,
    orphaned: !referenced,
    classification,
  };
});

console.log(
  JSON.stringify({
    auth: {
      totalUsers: users.length,
      syntheticUsers: syntheticUserIds.size,
      syntheticIdentityEvidence: syntheticIdentities.map((user) => ({
        knownFixturePrefix:
          typeof user.email === "string" &&
          ["claim-", "cms-", "intake-", "lifecycle-", "project-", "spike-", "talent-"].some(
            (prefix) => user.email.startsWith(prefix),
          ),
        createdAt: user.created_at ?? null,
        deleted: Boolean(user.deleted_at),
        enabled:
          !user.deleted_at && (!user.banned_until || new Date(user.banned_until).getTime() <= now),
        referencedByCms:
          pages.some((page) => page.author_id === user.id || page.updated_by_id === user.id) ||
          revisions.some((revision) => revision.author_id === user.id),
        hasActiveRole: roles.some((role) => role.user_id === user.id && role.revoked_at === null),
        hasActiveMembership: memberships.some(
          (membership) => membership.user_id === user.id && membership.effective_to === null,
        ),
      })),
      developmentIdentityCount: developmentIdentities.length,
      identities: identityResults,
    },
    cmsPrivate: {
      objectCount: storageResults.length,
      objects: storageResults,
      classificationCounts: Object.fromEntries(
        [...new Set(storageResults.map(({ classification }) => classification))].map(
          (classification) => [
            classification,
            storageResults.filter((object) => object.classification === classification).length,
          ],
        ),
      ),
    },
  }),
);

import fs from "node:fs";

const source = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const offset = line.indexOf("=");
      return [line.slice(0, offset), line.slice(offset + 1).replace(/^("|')|("|')$/g, "")];
    }),
);
const endpoint = source.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/$/, "");
const project = source.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const key =
  source.APPWRITE_BOOTSTRAP_API_KEY ??
  source.APPWRITE_INVENTORY_API_KEY ??
  source.APPWRITE_SERVER_API_KEY;
if (!endpoint || !project || !key) {
  console.log(JSON.stringify({ status: "blocked", category: "credentials_missing" }));
  process.exit(2);
}

const headers = { "X-Appwrite-Project": project, "X-Appwrite-Key": key };
const requiredReadScopes = [
  "users.read",
  "teams.read",
  "databases.read",
  "tables.read",
  "rows.read",
  "buckets.read",
  "files.read",
];

class InventoryError extends Error {
  constructor(status) {
    super("Inventory unavailable");
    this.status = status;
  }
}

async function read(path) {
  const response = await fetch(`${endpoint}${path}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  if (!response.ok) throw new InventoryError(response.status);
  return response.json();
}

async function probeReadScope(path) {
  const response = await fetch(`${endpoint}${path}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  return response.status;
}

function dateRange(rows) {
  const values = rows
    .flatMap((row) => [row.$createdAt, row.$updatedAt])
    .filter((value) => typeof value === "string")
    .sort();
  return values.length ? { earliest: values[0], latest: values.at(-1) } : null;
}

async function listAll(path, collection) {
  const records = [];
  let offset = 0;
  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const body = await read(`${path}${separator}limit=100&offset=${offset}&total=true`);
    const page = Array.isArray(body[collection]) ? body[collection] : [];
    records.push(...page);
    if (records.length >= Number(body.total ?? records.length) || page.length === 0) break;
    offset += page.length;
  }
  return records;
}

try {
  const users = await listAll("/users", "users");
  const teams = await listAll("/teams", "teams");
  const memberships = (
    await Promise.all(
      teams.map((team) =>
        listAll(`/teams/${encodeURIComponent(team.$id)}/memberships`, "memberships"),
      ),
    )
  ).flat();
  const tableIds = [
    "cms_pages",
    "cms_revisions",
    "project_intakes",
    "talent_intakes",
    "audit_logs",
  ];
  const tableRows = Object.fromEntries(
    await Promise.all(
      tableIds.map(async (table) => [
        table,
        await listAll(`/tablesdb/umoja/tables/${table}/rows`, "rows"),
      ]),
    ),
  );
  const buckets = await listAll("/storage/buckets", "buckets");
  const files = (
    await Promise.all(
      buckets.map((bucket) =>
        listAll(`/storage/buckets/${encodeURIComponent(bucket.$id)}/files`, "files"),
      ),
    )
  ).flat();
  const knownCmsSeeds = new Set(["seed-home-en", "seed-home-fr"]);
  const cmsRows = tableRows.cms_pages;
  const syntheticOnly =
    users.every((user) => String(user.email ?? "").endsWith("@example.test")) &&
    memberships.length === 0 &&
    cmsRows.every((row) => knownCmsSeeds.has(row.$id) && row.stableKey === "development-home") &&
    tableRows.cms_revisions.length === 0 &&
    tableRows.project_intakes.length === 0 &&
    tableRows.talent_intakes.length === 0 &&
    tableRows.audit_logs.length === 0 &&
    files.length === 0;

  console.log(
    JSON.stringify({
      status: "complete",
      counts: {
        users: users.length,
        teams: teams.length,
        memberships: memberships.length,
        tables: Object.fromEntries(
          Object.entries(tableRows).map(([table, rows]) => [table, rows.length]),
        ),
        storageBuckets: buckets.length,
        storageObjects: files.length,
      },
      ranges: {
        users: dateRange(users),
        teams: dateRange(teams),
        memberships: dateRange(memberships),
        tables: Object.fromEntries(
          Object.entries(tableRows).map(([table, rows]) => [table, dateRange(rows)]),
        ),
        storage: dateRange(files),
      },
      dataClassification: syntheticOnly ? "synthetic_or_empty" : "non_synthetic_possible",
      exportCapability: "metadata_readable_export_requires_separate_authorization",
    }),
  );
} catch (error) {
  const status = error instanceof InventoryError ? error.status : 0;
  const scopeProbe = Object.fromEntries(
    await Promise.all(
      [
        ["users.read", "/users?limit=1"],
        ["teams.read", "/teams?limit=1"],
        ["databases.read", "/tablesdb/umoja"],
        ["tables.read", "/tablesdb/umoja/tables?limit=1"],
        ["rows.read", "/tablesdb/umoja/tables/cms_pages/rows?limit=1"],
        ["buckets.read", "/storage/buckets?limit=1"],
        ["files.read", "/storage/buckets/cms_media/files?limit=1"],
      ].map(async ([scope, path]) => [scope, await probeReadScope(path)]),
    ),
  );
  const missingScopeCategories = Object.entries(scopeProbe)
    .filter(([, probeStatus]) => probeStatus === 401)
    .map(([scope]) => scope);
  console.log(
    JSON.stringify({
      status: "blocked",
      category:
        status === 401 && missingScopeCategories.length === requiredReadScopes.length
          ? "credential_rejected_or_all_read_scopes_missing"
          : status === 401
            ? "required_read_scopes_missing"
            : `read_failed_${status || "unknown"}`,
      missingScopeCategories,
      requiredReadScopes,
    }),
  );
  process.exit(2);
}

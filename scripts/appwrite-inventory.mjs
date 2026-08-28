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
const key = source.APPWRITE_INVENTORY_API_KEY ?? source.APPWRITE_SERVER_API_KEY;
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
  const response = await fetch(`${endpoint}${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new InventoryError(response.status);
  return response.json();
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
  const memberships = await listAll("/teams/umoja-operations/memberships", "memberships");
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
  const files = await listAll("/storage/buckets/cms_media/files", "files");
  const knownCmsSeeds = new Set(["seed-home-en", "seed-home-fr"]);
  const cmsRows = tableRows.cms_pages;
  const syntheticOnly =
    users.every((user) => String(user.email ?? "").endsWith("@example.test")) &&
    cmsRows.every((row) => knownCmsSeeds.has(row.$id) && row.stableKey === "development-home") &&
    tableRows.project_intakes.length === 0 &&
    tableRows.talent_intakes.length === 0 &&
    files.length === 0;

  console.log(
    JSON.stringify({
      status: "complete",
      counts: {
        users: users.length,
        memberships: memberships.length,
        tables: Object.fromEntries(
          Object.entries(tableRows).map(([table, rows]) => [table, rows.length]),
        ),
        storageObjects: files.length,
      },
      ranges: {
        users: dateRange(users),
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
  console.log(
    JSON.stringify({
      status: "blocked",
      category: status === 401 ? "credential_rejected" : `read_failed_${status || "unknown"}`,
      requiredReadScopes,
    }),
  );
  process.exit(2);
}

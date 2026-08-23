import fs from "node:fs";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "../../..");
export const configPath = path.join(root, "appwrite.config.json");

export function loadLocalEnvironment() {
  const file = path.join(root, "apps/web/.env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

export function loadConfig() {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

export function validateConfig(config = loadConfig()) {
  const failures = [];
  if (config.project?.name !== "umoja-development")
    failures.push("project.name must be umoja-development");
  for (const host of ["localhost", "127.0.0.1"])
    if (!config.project?.platforms?.includes(host)) failures.push(`missing platform ${host}`);
  if (config.team?.id !== "umoja-operations") failures.push("team ID must be umoja-operations");
  const requiredRoles = ["admin", "cms-editor", "reviewer", "core", "extended", "project-manager"];
  for (const role of requiredRoles)
    if (!config.team?.roles?.includes(role)) failures.push(`missing role ${role}`);
  const tableIds = new Set(config.database?.tables?.map((table) => table.id));
  for (const id of [
    "cms_pages",
    "cms_revisions",
    "project_intakes",
    "talent_intakes",
    "audit_logs",
  ])
    if (!tableIds.has(id)) failures.push(`missing table ${id}`);
  const bucketIds = new Set(config.buckets?.map((bucket) => bucket.id));
  for (const id of ["cms_media", "intake_files"])
    if (!bucketIds.has(id)) failures.push(`missing bucket ${id}`);
  const serialized = JSON.stringify(config);
  if (/APPWRITE_(?:.*KEY)|[A-Za-z0-9_-]{80,}/.test(serialized))
    failures.push("configuration appears to contain a secret");
  if (/create\(\\?"any|update\(\\?"any|delete\(\\?"any/.test(serialized))
    failures.push("public write permission is forbidden");
  for (const table of config.database.tables ?? []) {
    if (!table.rowSecurity) failures.push(`${table.id} must enable row security`);
    if (!table.columns?.length || !table.indexes?.length)
      failures.push(`${table.id} needs columns and indexes`);
    for (const column of table.columns ?? [])
      if (column.encrypt)
        failures.push(`${table.id}.${column.key} cannot require paid column encryption`);
  }
  for (const id of ["project_intakes", "talent_intakes"]) {
    const table = config.database.tables?.find((item) => item.id === id);
    const keys = new Set(table?.columns?.map((column) => column.key));
    for (const key of [
      "emailLookup",
      "encryptionKeyVersion",
      "encryptedPayload",
      "encryptedInternalNotes",
    ])
      if (!keys.has(key)) failures.push(`${id} must define ${key}`);
    for (const forbidden of ["contactEmail", "contactPhone", "contactName", "internalNotes"])
      if (keys.has(forbidden)) failures.push(`${id} cannot store plaintext ${forbidden}`);
    if (table?.indexes?.some((index) => index.columns?.includes("encryptedPayload")))
      failures.push(`${id} cannot index encryptedPayload`);
  }
  for (const bucket of config.buckets ?? []) {
    if (!bucket.fileSecurity) failures.push(`${bucket.id} must enable file security`);
    if (bucket.permissions?.some((permission) => permission.includes('"any"')))
      failures.push(`${bucket.id} cannot grant bucket-wide public access`);
  }
  return failures;
}

export function requireValues(names) {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing required environment names: ${missing.join(", ")}`);
}

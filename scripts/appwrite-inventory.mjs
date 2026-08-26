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
const key = source.APPWRITE_SERVER_API_KEY;
if (!endpoint || !project || !key)
  throw new Error("Appwrite inventory credentials are not configured.");
const headers = { "X-Appwrite-Project": project, "X-Appwrite-Key": key };
const getTotal = async (path) => {
  const response = await fetch(`${endpoint}${path}`, { headers });
  if (!response.ok) throw new Error(`Appwrite inventory request failed: ${response.status}`);
  const body = await response.json();
  return Number(body.total ?? 0);
};
const tables = ["cms_pages", "cms_revisions", "project_intakes", "talent_intakes", "audit_logs"];
const tableCounts = Object.fromEntries(
  await Promise.all(
    tables.map(async (table) => [
      table,
      await getTotal(`/tablesdb/umoja/tables/${table}/rows?total=true`),
    ]),
  ),
);
const fileCount = await getTotal("/storage/buckets/cms_media/files?total=true");
const userCount = await getTotal("/users?total=true");
console.log(JSON.stringify({ users: userCount, tableCounts, files: fileCount }));

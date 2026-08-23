import { Client, Query, Storage, TablesDB } from "node-appwrite";
import { createServices } from "./appwrite-client.mjs";
import { loadConfig, loadLocalEnvironment, requireValues } from "./config.mjs";

loadLocalEnvironment();
requireValues([
  "NEXT_PUBLIC_APPWRITE_ENDPOINT",
  "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  "APPWRITE_SERVER_API_KEY",
]);
const config = loadConfig();
const runtime = createServices("APPWRITE_SERVER_API_KEY");
await runtime.tables.get({ databaseId: config.database.id });
const published = await runtime.tables.listRows({
  databaseId: config.database.id,
  tableId: "cms_pages",
  queries: [Query.equal("state", ["published"])],
  total: false,
});
if (published.rows.some((row) => row.state !== "published"))
  throw new Error("Public CMS query returned a non-published row.");

const anonymousClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
const anonymousTables = new TablesDB(anonymousClient);
const anonymousStorage = new Storage(anonymousClient);
const forbiddenChecks = [
  () =>
    anonymousTables.listRows({
      databaseId: config.database.id,
      tableId: "cms_pages",
      total: false,
    }),
  () =>
    anonymousTables.listRows({
      databaseId: config.database.id,
      tableId: "project_intakes",
      total: false,
    }),
  () =>
    anonymousTables.listRows({
      databaseId: config.database.id,
      tableId: "talent_intakes",
      total: false,
    }),
  () => anonymousStorage.listFiles({ bucketId: "intake_files", total: false }),
];
for (const check of forbiddenChecks) {
  let denied = false;
  try {
    await check();
  } catch (error) {
    denied = error?.code === 401 || error?.code === 403;
  }
  if (!denied) throw new Error("Anonymous access was not denied as required.");
}
console.log(
  "Integration checks passed: runtime reachable and anonymous CMS draft/intake/file access denied.",
);

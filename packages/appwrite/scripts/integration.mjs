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
  {
    run: () =>
      anonymousTables.listRows({
        databaseId: config.database.id,
        tableId: "cms_pages",
        total: false,
      }),
    visible: (result) => result.rows.length,
  },
  {
    run: () =>
      anonymousTables.listRows({
        databaseId: config.database.id,
        tableId: "project_intakes",
        total: false,
      }),
    visible: (result) => result.rows.length,
  },
  {
    run: () =>
      anonymousTables.listRows({
        databaseId: config.database.id,
        tableId: "talent_intakes",
        total: false,
      }),
    visible: (result) => result.rows.length,
  },
  {
    run: () => anonymousStorage.listFiles({ bucketId: config.storage.intakeFiles, total: false }),
    visible: (result) => result.files.length,
  },
];
for (const check of forbiddenChecks) {
  try {
    const result = await check.run();
    if (check.visible(result) !== 0)
      throw new Error("Anonymous access exposed a protected Appwrite resource.");
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) continue;
    throw error;
  }
}
for (const rowId of ["seed-home-en", "seed-home-fr"]) {
  try {
    await anonymousTables.getRow({
      databaseId: config.database.id,
      tableId: "cms_pages",
      rowId,
    });
    throw new Error("Anonymous access exposed a protected CMS draft.");
  } catch (error) {
    if (error?.code === 401 || error?.code === 403 || error?.code === 404) continue;
    throw error;
  }
}
console.log(
  "Integration checks passed: public CMS is published-only and anonymous draft/intake/file visibility is zero.",
);

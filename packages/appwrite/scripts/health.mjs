import { createServices } from "./appwrite-client.mjs";
import { loadConfig } from "./config.mjs";

const config = loadConfig();
const report = {
  connected: false,
  databaseReachable: false,
  requiredTablesPresent: false,
  requiredBucketsPresent: false,
};
try {
  const services = createServices("APPWRITE_SERVER_API_KEY");
  report.connected = true;
  await services.tables.get({ databaseId: config.database.id });
  report.databaseReachable = true;
  const tables = await Promise.allSettled(
    config.database.tables.map((table) =>
      services.tables.getTable({ databaseId: config.database.id, tableId: table.id }),
    ),
  );
  report.requiredTablesPresent = tables.every((result) => result.status === "fulfilled");
  const buckets = await Promise.allSettled(
    config.buckets.map((bucket) => services.storage.getBucket({ bucketId: bucket.id })),
  );
  report.requiredBucketsPresent = buckets.every((result) => result.status === "fulfilled");
} catch {
  // The report intentionally excludes exception details and resource identifiers.
}
console.log(JSON.stringify(report));
if (!Object.values(report).every(Boolean)) process.exitCode = 1;

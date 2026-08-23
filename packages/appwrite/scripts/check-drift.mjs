import { createServices } from "./appwrite-client.mjs";
import { loadConfig } from "./config.mjs";

const config = loadConfig();
const services = createServices("APPWRITE_BOOTSTRAP_API_KEY");
const project = await services.project.get();
if (project.name !== config.project.name)
  throw new Error("Connected project is not umoja-development.");
const drift = [];
for (const table of config.database.tables) {
  try {
    const columns = await services.tables.listColumns({
      databaseId: config.database.id,
      tableId: table.id,
      total: false,
    });
    const indexes = await services.tables.listIndexes({
      databaseId: config.database.id,
      tableId: table.id,
      total: false,
    });
    for (const column of table.columns)
      if (!columns.columns.some((item) => item.key === column.key))
        drift.push(`${table.id}.column.${column.key}`);
    for (const index of table.indexes)
      if (!indexes.indexes.some((item) => item.key === index.key))
        drift.push(`${table.id}.index.${index.key}`);
  } catch {
    drift.push(`table.${table.id}`);
  }
}
for (const bucket of config.buckets)
  try {
    await services.storage.getBucket({ bucketId: bucket.id });
  } catch {
    drift.push(`bucket.${bucket.id}`);
  }
if (drift.length) {
  console.error(`Schema drift: ${drift.join(", ")}`);
  process.exitCode = 1;
} else console.log("No required Appwrite schema drift detected.");

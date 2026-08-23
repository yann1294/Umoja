import { createServices } from "./appwrite-client.mjs";
import { loadConfig } from "./config.mjs";
import {
  bucketMismatches,
  columnMismatches,
  indexMismatches,
  tableMismatches,
} from "./schema-compat.mjs";

const config = loadConfig();
const services = createServices("APPWRITE_BOOTSTRAP_API_KEY");
const project = await services.project.get();
if (project.name !== config.project.name)
  throw new Error("Connected project is not umoja-development.");
const drift = [];
try {
  const database = await services.tables.get({ databaseId: config.database.id });
  if (database.name !== config.database.name) drift.push(`database.${config.database.id}.name`);
  if (!database.enabled) drift.push(`database.${config.database.id}.enabled`);
} catch {
  drift.push(`database.${config.database.id}`);
}
try {
  const team = await services.teams.get({ teamId: config.team.id });
  if (team.name !== config.team.name) drift.push(`team.${config.team.id}.name`);
} catch {
  drift.push(`team.${config.team.id}`);
}
for (const table of config.database.tables) {
  try {
    const actualTable = await services.tables.getTable({
      databaseId: config.database.id,
      tableId: table.id,
    });
    for (const mismatch of tableMismatches(table, actualTable))
      drift.push(`${table.id}.table.${mismatch}`);
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
    for (const column of table.columns) {
      const actual = columns.columns.find((item) => item.key === column.key);
      if (!actual) drift.push(`${table.id}.column.${column.key}`);
      else
        for (const mismatch of columnMismatches(column, actual))
          drift.push(`${table.id}.column.${column.key}.${mismatch}`);
    }
    for (const actual of columns.columns)
      if (!table.columns.some((column) => column.key === actual.key))
        drift.push(`${table.id}.unexpected-column.${actual.key}`);
    for (const index of table.indexes) {
      const actual = indexes.indexes.find((item) => item.key === index.key);
      if (!actual) drift.push(`${table.id}.index.${index.key}`);
      else
        for (const mismatch of indexMismatches(index, actual))
          drift.push(`${table.id}.index.${index.key}.${mismatch}`);
    }
    for (const actual of indexes.indexes)
      if (!table.indexes.some((index) => index.key === actual.key))
        drift.push(`${table.id}.unexpected-index.${actual.key}`);
  } catch {
    drift.push(`table.${table.id}`);
  }
}
for (const bucket of config.buckets)
  try {
    const actual = await services.storage.getBucket({ bucketId: bucket.id });
    for (const mismatch of bucketMismatches(bucket, actual)) drift.push(`${bucket.id}.${mismatch}`);
  } catch {
    drift.push(`bucket.${bucket.id}`);
  }
if (drift.length) {
  console.error(`Schema drift: ${drift.join(", ")}`);
  process.exitCode = 1;
} else console.log("No required Appwrite schema drift detected.");

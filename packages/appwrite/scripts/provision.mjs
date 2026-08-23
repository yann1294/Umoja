import { OrderBy, TablesDBIndexType } from "node-appwrite";
import { createServices, isMissing } from "./appwrite-client.mjs";
import { loadConfig, validateConfig } from "./config.mjs";
import {
  assertCompatible,
  bucketMismatches,
  columnMismatches,
  indexMismatches,
  tableMismatches,
} from "./schema-compat.mjs";

const config = loadConfig();
const failures = validateConfig(config);
if (failures.length) throw new Error(`Invalid configuration: ${failures.join("; ")}`);
const services = createServices("APPWRITE_BOOTSTRAP_API_KEY");
const project = await services.project.get();
if (project.name !== config.project.name)
  throw new Error("Refusing to provision a project not named umoja-development.");

async function createIfMissing(getter, creator) {
  try {
    return await getter();
  } catch (error) {
    if (!isMissing(error)) throw error;
    return creator();
  }
}

const platforms = await services.project.listPlatforms();
for (const hostname of config.project.platforms) {
  if (!platforms.platforms.some((platform) => platform.hostname === hostname)) {
    await services.project.createWebPlatform({
      platformId: hostname.replaceAll(".", "-"),
      name: `Umoja ${hostname}`,
      hostname,
    });
  }
}
await services.project.updateAuthMethod({ methodId: "email-password", enabled: true });
await services.project.updatePasswordStrengthPolicy({ min: 12 });
await services.project.updatePasswordDictionaryPolicy({ enabled: true });
await services.project.updatePasswordPersonalDataPolicy({ enabled: true });
await services.project.updatePasswordHistoryPolicy({ total: 5 });
await services.project.updateMembershipPrivacyPolicy({
  userId: false,
  userEmail: false,
  userPhone: false,
  userName: false,
  userMFA: false,
  userAccessedAt: false,
});
await services.project.updateMFAFactorsPolicy({
  totp: true,
  email: true,
  phone: false,
  custom: false,
});

const team = await createIfMissing(
  () => services.teams.get({ teamId: config.team.id }),
  () =>
    services.teams.create({
      teamId: config.team.id,
      name: config.team.name,
      roles: config.team.roles,
    }),
);
assertCompatible(`team.${config.team.id}`, [...(team.name === config.team.name ? [] : ["name"])]);
const database = await createIfMissing(
  () => services.tables.get({ databaseId: config.database.id }),
  () =>
    services.tables.create({
      databaseId: config.database.id,
      name: config.database.name,
      enabled: true,
    }),
);
assertCompatible(`database.${config.database.id}`, [
  ...(database.name === config.database.name ? [] : ["name"]),
  ...(database.enabled ? [] : ["enabled"]),
]);

async function createColumn(tableId, column) {
  const common = {
    databaseId: config.database.id,
    tableId,
    key: column.key,
    required: column.required,
    array: column.array ?? false,
  };
  if (column.type === "string")
    return services.tables.createStringColumn({
      ...common,
      size: column.size,
      encrypt: column.encrypt ?? false,
    });
  if (column.type === "enum")
    return services.tables.createEnumColumn({ ...common, elements: column.elements });
  if (column.type === "integer")
    return services.tables.createIntegerColumn({ ...common, min: column.min, max: column.max });
  if (column.type === "boolean") return services.tables.createBooleanColumn(common);
  if (column.type === "datetime") return services.tables.createDatetimeColumn(common);
  throw new Error(`Unsupported column type ${column.type}`);
}

for (const table of config.database.tables) {
  const existingTable = await createIfMissing(
    () => services.tables.getTable({ databaseId: config.database.id, tableId: table.id }),
    () =>
      services.tables.createTable({
        databaseId: config.database.id,
        tableId: table.id,
        name: table.name,
        permissions: table.permissions,
        rowSecurity: table.rowSecurity,
        enabled: true,
      }),
  );
  assertCompatible(`table.${table.id}`, tableMismatches(table, existingTable));
  let existing = await services.tables.listColumns({
    databaseId: config.database.id,
    tableId: table.id,
    total: false,
  });
  for (const column of table.columns) {
    const current = existing.columns.find((item) => item.key === column.key);
    if (current)
      assertCompatible(`table.${table.id}.column.${column.key}`, columnMismatches(column, current));
    else await createColumn(table.id, column);
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    existing = await services.tables.listColumns({
      databaseId: config.database.id,
      tableId: table.id,
      total: false,
    });
    if (
      existing.columns.length >= table.columns.length &&
      existing.columns.every((item) => item.status === "available")
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (attempt === 59) throw new Error(`Columns for ${table.id} did not become available.`);
  }
  for (const column of table.columns) {
    const current = existing.columns.find((item) => item.key === column.key);
    if (!current) throw new Error(`Missing Appwrite column ${table.id}.${column.key}.`);
    assertCompatible(`table.${table.id}.column.${column.key}`, columnMismatches(column, current));
  }
  const indexes = await services.tables.listIndexes({
    databaseId: config.database.id,
    tableId: table.id,
    total: false,
  });
  for (const index of table.indexes) {
    const current = indexes.indexes.find((item) => item.key === index.key);
    if (current) {
      assertCompatible(`table.${table.id}.index.${index.key}`, indexMismatches(index, current));
      continue;
    }
    await services.tables.createIndex({
      databaseId: config.database.id,
      tableId: table.id,
      key: index.key,
      type: TablesDBIndexType[
        index.type === "key" ? "Key" : index.type === "unique" ? "Unique" : "Fulltext"
      ],
      columns: index.columns,
      orders: index.orders?.map((order) => OrderBy[order === "DESC" ? "Desc" : "Asc"]),
      lengths: index.lengths,
    });
  }
}

for (const bucket of config.buckets) {
  let existingBucket = await createIfMissing(
    () => services.storage.getBucket({ bucketId: bucket.id }),
    () =>
      services.storage.createBucket({
        bucketId: bucket.id,
        name: bucket.name,
        permissions: bucket.permissions,
        fileSecurity: bucket.fileSecurity,
        enabled: true,
        maximumFileSize: bucket.maximumFileSize,
        allowedFileExtensions: bucket.allowedFileExtensions,
        encryption: bucket.encryption,
        antivirus: bucket.antivirus,
        transformations: bucket.transformations,
      }),
  );
  const mismatches = bucketMismatches(bucket, existingBucket);
  if (mismatches.length && bucket.reconcileExisting) {
    existingBucket = await services.storage.updateBucket({
      bucketId: bucket.id,
      name: bucket.name,
      permissions: bucket.permissions,
      fileSecurity: bucket.fileSecurity,
      enabled: true,
      maximumFileSize: bucket.maximumFileSize,
      allowedFileExtensions: bucket.allowedFileExtensions,
      encryption: bucket.encryption,
      antivirus: bucket.antivirus,
      transformations: bucket.transformations,
    });
  }
  assertCompatible(`bucket.${bucket.id}`, bucketMismatches(bucket, existingBucket));
}

const verifiedTables = await Promise.all(
  config.database.tables.map((table) =>
    services.tables.getTable({ databaseId: config.database.id, tableId: table.id }),
  ),
);
const verifiedBuckets = await Promise.all(
  config.buckets.map((bucket) => services.storage.getBucket({ bucketId: bucket.id })),
);
await services.teams.get({ teamId: config.team.id });
for (const [index, table] of config.database.tables.entries())
  assertCompatible(`table.${table.id}`, tableMismatches(table, verifiedTables[index]));
for (const [index, bucket] of config.buckets.entries())
  assertCompatible(`bucket.${bucket.id}`, bucketMismatches(bucket, verifiedBuckets[index]));
console.log(
  `Verified development resources: ${verifiedTables.length} tables, ${verifiedBuckets.length} buckets, team ${config.team.id}.`,
);

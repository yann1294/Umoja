function sameValues(left = [], right = []) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

export function columnMismatches(expected, actual) {
  const mismatches = [];
  const actualType =
    expected.type === "enum" && Array.isArray(actual.elements) ? "enum" : actual.type;
  if (actualType !== expected.type) mismatches.push("type");
  if (Boolean(actual.required) !== Boolean(expected.required)) mismatches.push("required");
  if (Boolean(actual.array) !== Boolean(expected.array)) mismatches.push("array");
  if (expected.size !== undefined && Number(actual.size) !== expected.size) mismatches.push("size");
  if (expected.elements && !sameValues(actual.elements, expected.elements))
    mismatches.push("elements");
  if (expected.min !== undefined && Number(actual.min) !== expected.min) mismatches.push("min");
  if (expected.max !== undefined && Number(actual.max) !== expected.max) mismatches.push("max");
  if (Boolean(actual.encrypt) !== Boolean(expected.encrypt)) mismatches.push("encrypt");
  return mismatches;
}

export function indexMismatches(expected, actual) {
  const mismatches = [];
  if (actual.type !== expected.type) mismatches.push("type");
  if (!sameValues(actual.attributes ?? actual.columns, expected.columns))
    mismatches.push("columns");
  if (expected.orders && JSON.stringify(actual.orders ?? []) !== JSON.stringify(expected.orders))
    mismatches.push("orders");
  if (expected.lengths && JSON.stringify(actual.lengths ?? []) !== JSON.stringify(expected.lengths))
    mismatches.push("lengths");
  return mismatches;
}

export function tableMismatches(expected, actual) {
  const mismatches = [];
  if (actual.name !== expected.name) mismatches.push("name");
  if (!actual.enabled) mismatches.push("enabled");
  if (Boolean(actual.rowSecurity) !== Boolean(expected.rowSecurity)) mismatches.push("rowSecurity");
  if (!sameValues(actual.$permissions, expected.permissions)) mismatches.push("permissions");
  return mismatches;
}

export function bucketMismatches(expected, actual) {
  const mismatches = [];
  if (actual.name !== expected.name) mismatches.push("name");
  if (!actual.enabled) mismatches.push("enabled");
  if (Boolean(actual.fileSecurity) !== Boolean(expected.fileSecurity))
    mismatches.push("fileSecurity");
  if (Number(actual.maximumFileSize) !== expected.maximumFileSize)
    mismatches.push("maximumFileSize");
  if (!sameValues(actual.allowedFileExtensions, expected.allowedFileExtensions))
    mismatches.push("allowedFileExtensions");
  if (Boolean(actual.encryption) !== Boolean(expected.encryption)) mismatches.push("encryption");
  if (Boolean(actual.antivirus) !== Boolean(expected.antivirus)) mismatches.push("antivirus");
  if (!sameValues(actual.$permissions, expected.permissions)) mismatches.push("permissions");
  return mismatches;
}

export function assertCompatible(resource, mismatches) {
  if (mismatches.length)
    throw new Error(
      `Incompatible existing Appwrite resource ${resource}: ${mismatches.join(", ")}`,
    );
}

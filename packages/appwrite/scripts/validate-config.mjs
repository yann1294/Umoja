import { loadConfig, validateConfig } from "./config.mjs";

const failures = validateConfig(loadConfig());
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    "Appwrite configuration valid: 5 tables, 2 private-by-default buckets, 1 application team.",
  );
}

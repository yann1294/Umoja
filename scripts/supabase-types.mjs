import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import prettier from "prettier";

const target = resolve("supabase/database.types.ts");
const write = process.argv.includes("--write");
const result = spawnSync("pnpm", ["exec", "supabase", "gen", "types", "typescript", "--linked"], {
  encoding: "utf8",
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
  maxBuffer: 16 * 1024 * 1024,
});

if (result.status !== 0) {
  process.stderr.write("Supabase linked type generation failed.\n");
  process.exit(result.status ?? 1);
}

const configuration = await prettier.resolveConfig(target);
const generated = await prettier.format(result.stdout, { ...configuration, filepath: target });

if (write) {
  writeFileSync(target, generated, "utf8");
  process.stdout.write("Normalized linked Supabase types were written.\n");
  process.exit(0);
}

const committed = await prettier.format(readFileSync(target, "utf8"), {
  ...configuration,
  filepath: target,
});
if (generated !== committed) {
  process.stderr.write(
    "Generated Supabase types differ from the committed normalized schema. Run with --write and review the diff.\n",
  );
  process.exit(1);
}
process.stdout.write("Supabase generated types match the committed normalized schema.\n");

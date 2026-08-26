import { spawnSync } from "node:child_process";

if (process.argv[2] !== "--local") {
  throw new Error("Refusing a non-local health target. Pass --local.");
}
const result = spawnSync("pnpm", ["exec", "supabase", "status", "--output", "json"], {
  encoding: "utf8",
});
if (result.status !== 0) process.exit(result.status ?? 1);
if (!/API URL|DB URL/.test(result.stdout)) process.exit(1);
process.stdout.write("Local Supabase health check passed.\n");

import { spawnSync } from "node:child_process";

// This command is intentionally the only linked write. It never resets and requires an explicit
// development-project acknowledgement supplied outside source control.
if (process.env.UMOJA_SUPABASE_TARGET !== "development") {
  throw new Error(
    "Refusing remote push: set UMOJA_SUPABASE_TARGET=development after verifying the empty development project.",
  );
}
for (const args of [
  ["exec", "supabase", "projects", "list"],
  ["exec", "supabase", "db", "push", "--linked", "--dry-run"],
  ["exec", "supabase", "db", "push", "--linked"],
]) {
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

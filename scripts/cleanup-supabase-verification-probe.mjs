import fs from "node:fs";

const probePath = "supabase/.temp/verification-probe.json";
if (!fs.existsSync(probePath)) process.exit(0);
const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim().replace(/^export\s+/, ""), line.slice(i + 1).trim().replace(/^("|')|("|')$/g, "")];
    }),
);
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret } = env;
const { id } = JSON.parse(fs.readFileSync(probePath, "utf8"));
if (!url || !secret || typeof id !== "string") throw new Error("Verification probe cleanup configuration is unavailable.");
const response = await fetch(`${url}/auth/v1/admin/users/${id}`, {
  method: "DELETE",
  headers: { apikey: secret, authorization: `Bearer ${secret}` },
});
if (!response.ok && response.status !== 404) throw new Error(`Synthetic verification user cleanup failed: ${response.status}`);
fs.rmSync(probePath);
console.log(JSON.stringify({ cleaned: true }));

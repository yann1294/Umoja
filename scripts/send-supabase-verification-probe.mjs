import fs from "node:fs";
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
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret, SUPABASE_E2E_EMAIL: email, APP_URL: appUrl } = env;
if (!url || !secret || !email || !appUrl) throw new Error("Required development configuration is unavailable.");
const headers = { apikey: secret, authorization: `Bearer ${secret}`, "content-type": "application/json" };
const created = await fetch(`${url}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email, password: `Umoja-${crypto.randomUUID()}-A9!`, email_confirm: false }) });
if (!created.ok) throw new Error(`Synthetic verification user creation failed: ${created.status}`);
const user = await created.json();
const redirect = new URL("/api/supabase-auth/callback", appUrl);
redirect.searchParams.set("locale", "en");
redirect.searchParams.set("flow", "verification");
const resend = await fetch(`${url}/auth/v1/resend`, { method: "POST", headers: { apikey: secret, "content-type": "application/json" }, body: JSON.stringify({ type: "signup", email, options: { emailRedirectTo: redirect.toString() } }) });
if (!resend.ok) { await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers }); throw new Error(`Verification email request failed: ${resend.status}`); }
fs.mkdirSync("supabase/.temp", { recursive: true });
fs.writeFileSync("supabase/.temp/verification-probe.json", JSON.stringify({ id: user.id }));
console.log(JSON.stringify({ flow: "verification", locale: "en", sent: true }));

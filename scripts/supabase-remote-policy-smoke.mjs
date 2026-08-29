import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const offset = line.indexOf("=");
      return [line.slice(0, offset), line.slice(offset + 1).replace(/^("|')|("|')$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = env.SUPABASE_SECRET_KEY;
if (!url || !key || !secret) throw new Error("Supabase credentials are not configured.");
const request = (path, options = {}) =>
  fetch(`${url}${path}`, { ...options, headers: { apikey: key, ...(options.headers ?? {}) } });
const serviceRequest = (path, options = {}) =>
  fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: secret, authorization: `Bearer ${secret}`, ...(options.headers ?? {}) },
  });
const probe = "policy-probe/00000000-0000-0000-0000-000000000000.txt";
const buckets = [
  { id: "cms-private", contentType: "application/pdf", body: "%PDF-1.4\n% synthetic probe\n" },
  { id: "applicant-private", contentType: "application/octet-stream", body: "encrypted-probe" },
];

try {
  for (const bucket of buckets) {
    const upload = await serviceRequest(`/storage/v1/object/${bucket.id}/${probe}`, {
      method: "POST",
      headers: { "content-type": bucket.contentType, "x-upsert": "true" },
      body: bucket.body,
    });
    if (!upload.ok)
      throw new Error(`Unable to create synthetic ${bucket.id} probe: ${upload.status}`);
  }
  const profiles = await request("/rest/v1/profiles?select=user_id,public_slug");
  const intakes = await request("/rest/v1/project_intakes?select=id");
  const directIntake = await request("/rest/v1/project_intakes", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({}),
  });
  const privateCms = await request("/storage/v1/object/list/cms-private", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefix: "policy-probe/", limit: 10 }),
  });
  const privateApplicant = await request("/storage/v1/object/list/applicant-private", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefix: "policy-probe/", limit: 10 }),
  });
  const publicCms = await request("/storage/v1/object/list/cms-public", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 1 }),
  });
  const privateCmsRows = privateCms.ok ? await privateCms.json() : [];
  const privateApplicantRows = privateApplicant.ok ? await privateApplicant.json() : [];
  const report = {
    publicProfiles: profiles.status,
    privateIntakes: intakes.status,
    directIntakeInsert: directIntake.status,
    privateCmsVisibleObjects: privateCmsRows.length,
    privateApplicantVisibleObjects: privateApplicantRows.length,
    publicCmsList: publicCms.status,
  };
  const expected =
    report.publicProfiles === 200 &&
    report.privateIntakes === 401 &&
    report.directIntakeInsert >= 400 &&
    report.privateCmsVisibleObjects === 0 &&
    report.privateApplicantVisibleObjects === 0 &&
    report.publicCmsList === 200;
  console.log(JSON.stringify({ ...report, passed: expected }));
  if (!expected) process.exitCode = 1;
} finally {
  const cleanup = await Promise.all(
    buckets.map((bucket) =>
      serviceRequest(`/storage/v1/object/${bucket.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [probe] }),
      }),
    ),
  );
  if (cleanup.some((response) => !response.ok))
    throw new Error("Synthetic policy probe cleanup failed.");
}

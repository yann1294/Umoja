import { createCipheriv, createHmac, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import { expectMinimumTouchTargets, expectNoPageHorizontalOverflow } from "./helpers/visual";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

type Role = "admin" | "reviewer" | "extended";
type User = { id: string; email: string; headers: HeadersInit };
const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^("|')|("|')$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = env.SUPABASE_SECRET_KEY!;
const service = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};
const run = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const users: User[] = [];
const intakeIds: string[] = [];
let admin: User;
let reviewer: User;
let unrelated: User;
let disabled: User;
let projectId = "";
const request = (path: string, init: RequestInit = {}) => fetch(`${url}${path}`, init);

async function ok(response: Response, operation: string) {
  if (!response.ok) throw new Error(`${operation}:${response.status}`);
  return response;
}

async function createUser(role: Role) {
  const email = `intake-browser-${role}-${run}-${users.length}@example.test`;
  const created = await ok(
    await request("/auth/v1/admin/users", {
      method: "POST",
      headers: service,
      body: JSON.stringify({ email, password, email_confirm: true }),
    }),
    `user-${role}`,
  );
  const id = (await created.json()).id as string;
  const user = { id, email, headers: {} as HeadersInit };
  users.push(user);
  await ok(
    await request("/rest/v1/user_roles", {
      method: "POST",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify({ user_id: id, role }),
    }),
    `role-${role}`,
  );
  await ok(
    await request("/rest/v1/membership_history", {
      method: "POST",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify({ user_id: id, tier: "core", effective_from: new Date().toISOString() }),
    }),
    `membership-${role}`,
  );
  const token = await ok(
    await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: publishable, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
    `token-${role}`,
  );
  user.headers = {
    apikey: publishable,
    authorization: `Bearer ${(await token.json()).access_token as string}`,
    "content-type": "application/json",
  };
  return user;
}

function decodeKey(name: string) {
  const value = env[name]!;
  return Buffer.from(value, value.includes("+") || value.includes("/") ? "base64" : "base64url");
}

function envelope(plaintext: string, context: string) {
  const version =
    env.SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION ?? env.APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION;
  const suffix = version.toUpperCase();
  const key = decodeKey(
    env[`SUPABASE_DATA_ENCRYPTION_KEY_${suffix}`]
      ? `SUPABASE_DATA_ENCRYPTION_KEY_${suffix}`
      : `APPWRITE_DATA_ENCRYPTION_KEY_${suffix}`,
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`umoja:data:${version}:${context}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${version}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function lookup(value: string, context: string) {
  const version =
    env.SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION ?? env.APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION;
  const suffix = version.toUpperCase();
  const key = decodeKey(
    env[`SUPABASE_LOOKUP_HMAC_KEY_${suffix}`]
      ? `SUPABASE_LOOKUP_HMAC_KEY_${suffix}`
      : `APPWRITE_LOOKUP_HMAC_KEY_${suffix}`,
  );
  const digest = createHmac("sha256", key)
    .update(`umoja:lookup:${version}:${context}\0`)
    .update(value)
    .digest("base64url");
  return `${version}.${digest}`;
}

async function signIn(page: Page, user: User, next = "/en/admin/intake") {
  await page.context().clearCookies();
  await page.goto(`/en/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function cleanup() {
  if (intakeIds.length) {
    await request(`/rest/v1/audit_logs?target_id=in.(${intakeIds.join(",")})`, {
      method: "DELETE",
      headers: service,
    });
    await request(`/rest/v1/project_intakes?id=in.(${intakeIds.join(",")})`, {
      method: "DELETE",
      headers: service,
    });
  }
  for (const user of users) {
    await request(`/rest/v1/user_roles?user_id=eq.${user.id}`, {
      method: "DELETE",
      headers: service,
    });
    await request(`/rest/v1/membership_history?user_id=eq.${user.id}`, {
      method: "DELETE",
      headers: service,
    });
    await request(`/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: service,
      body: JSON.stringify({ should_soft_delete: false }),
    });
  }
}

test.beforeAll(async () => {
  try {
    admin = await createUser("admin");
    reviewer = await createUser("reviewer");
    unrelated = await createUser("extended");
    disabled = await createUser("reviewer");
    const submissionId = randomUUID();
    const payload = {
      contact: {
        preferredName: "Synthetic Intake Reviewer Fixture",
        email: "synthetic-intake-browser@example.test",
        phone: "+254700000000",
      },
      organization: { name: "Synthetic cooperative", country: "Kenya", website: "" },
      need: {
        title: "Synthetic browser intake",
        description:
          "Synthetic encrypted browser content for authorization verification only. Contenu synthétique bilingue suffisamment long pour vérifier l’adaptation des détails privés sur les petits et grands écrans, sans donnée personnelle réelle.",
        serviceAreas: ["Product engineering"],
      },
      budgetBand: "Still defining",
      timing: { desiredStart: "Within 1–3 months", targetDate: "" },
      attachments: [],
      projectConsent: true,
    };
    const created = await ok(
      await request("/rest/v1/rpc/create_encrypted_project_intake", {
        method: "POST",
        headers: service,
        body: JSON.stringify({
          p_submission_id: submissionId,
          p_applicant_id: null,
          p_public_reference: `UP-${run.replaceAll("-", "").slice(0, 12).toUpperCase()}`,
          p_email_lookup: lookup(payload.contact.email, "intake:project:email"),
          p_idempotency_key_hash: lookup(payload.contact.email, "intake:project:idempotency"),
          p_encryption_key_version:
            env.SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION ??
            env.APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION,
          p_encrypted_payload: envelope(
            JSON.stringify(payload),
            `intake:project:${submissionId}:payload`,
          ),
          p_service_areas: payload.need.serviceAreas,
          p_attachment_count: 0,
          p_consent_at: new Date().toISOString(),
          p_policy_version: "2026-08",
          p_locale: "en",
          p_after_digest: "0".repeat(64),
        }),
      }),
      "create-intake",
    );
    projectId = (await created.json()).id;
    intakeIds.push(projectId);
    await ok(
      await request("/rest/v1/rpc/update_intake_review", {
        method: "POST",
        headers: admin.headers,
        body: JSON.stringify({
          p_kind: "project",
          p_intake_id: projectId,
          p_status: "triage",
          p_assigned_reviewer_id: reviewer.id,
          p_encrypted_internal_notes: null,
          p_after_digest: "1".repeat(64),
        }),
      }),
      "assign-reviewer",
    );
    await ok(
      await request(`/auth/v1/admin/users/${disabled.id}`, {
        method: "PUT",
        headers: service,
        body: JSON.stringify({ ban_duration: "876000h" }),
      }),
      "disable-user",
    );
  } catch (error) {
    await cleanup();
    throw error;
  }
});

test.afterAll(async () => {
  const createdUserIds = users.map((user) => user.id);
  await cleanup();
  if (intakeIds.length) {
    expect(
      await (
        await request(`/rest/v1/project_intakes?select=id&id=in.(${intakeIds.join(",")})`, {
          headers: service,
        })
      ).json(),
    ).toEqual([]);
    expect(
      await (
        await request(`/rest/v1/audit_logs?select=id&target_id=in.(${intakeIds.join(",")})`, {
          headers: service,
        })
      ).json(),
    ).toEqual([]);
  }
  for (const id of createdUserIds) {
    expect(
      await (
        await request(`/rest/v1/user_roles?select=user_id&user_id=eq.${id}`, { headers: service })
      ).json(),
    ).toEqual([]);
    expect(
      await (
        await request(`/rest/v1/membership_history?select=user_id&user_id=eq.${id}`, {
          headers: service,
        })
      ).json(),
    ).toEqual([]);
    expect((await request(`/auth/v1/admin/users/${id}`, { headers: service })).status).toBe(404);
  }
});

test("uses the real scoped sign-in and renders assigned encrypted intake", async ({ page }) => {
  await signIn(page, admin, `/en/admin/intake/project/${projectId}`);
  await expect(page).toHaveURL(new RegExp(`/en/admin/intake/project/${projectId}$`));
  await expect(page.getByText("Synthetic Intake Reviewer Fixture")).toBeVisible();
  await expect(page.getByText("accepted", { exact: true })).toHaveCount(0);
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(
    page,
    "main button:visible, main a:not(.workspace-skip-link):not([href='#main-content']):visible, main input:visible, main select:visible",
  );
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () =>
    (await (window as typeof window & { axe: typeof axe }).axe.run(document)).violations
      .filter((item) => item.impact === "critical" || item.impact === "serious")
      .map((item) => item.id),
  );
  expect(violations).toEqual([]);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await expect(page).toHaveScreenshot("supabase-intake-admin-detail-en.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    mask: [page.getByLabel("Owner (internal ID)")],
  });

  await signIn(page, reviewer, `/en/admin/intake/project/${projectId}`);
  await expect(page.getByText("Synthetic Intake Reviewer Fixture")).toBeVisible();
});

test("denies unrelated and disabled principals without entering Appwrite lifecycle routes", async ({
  page,
}) => {
  await signIn(page, unrelated);
  await expect(page).toHaveURL(/\/en\/account-state\?reason=forbidden/);
  await signIn(page, disabled);
  await expect(page).toHaveURL(/\/en\/sign-in/);
  await expect(page.getByRole("alert")).toBeVisible();
});

test("rejects the reserved accepted transition", async () => {
  const response = await request("/rest/v1/rpc/update_intake_review", {
    method: "POST",
    headers: admin.headers,
    body: JSON.stringify({
      p_kind: "project",
      p_intake_id: projectId,
      p_status: "accepted",
      p_assigned_reviewer_id: reviewer.id,
      p_encrypted_internal_notes: null,
      p_after_digest: "2".repeat(64),
    }),
  });
  expect(response.ok).toBe(false);
});

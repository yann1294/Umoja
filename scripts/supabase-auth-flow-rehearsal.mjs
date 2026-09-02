import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const requireFromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { createClient } = requireFromWeb("@supabase/supabase-js");

const appUrl = process.env.APP_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!appUrl || !supabaseUrl || !publishableKey || !secretKey) {
  throw new Error("Required development Auth configuration is unavailable.");
}
if (new URL(appUrl).hostname !== "127.0.0.1") {
  throw new Error("The rehearsal requires a loopback application origin.");
}

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const browserAuth = () =>
  createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
const marker = `umoja-auth-rehearsal-${randomUUID()}`;
const email = `${marker}@example.test`;
const dashboardEmail = `${marker}-dashboard@example.test`;
const firstPassword = `Initial-${randomBytes(18).toString("base64url")}aA1`;
const resetPassword = `Recovery-${randomBytes(18).toString("base64url")}bB2`;
let fixtureUserId = null;
const fixtureUserIds = new Set();
let rehearsalPassed = false;

function assert(condition, category) {
  if (!condition) throw new Error(`Auth rehearsal failed: ${category}`);
}

function isAppLocation(value, pathWithQuery) {
  if (!value) return false;
  const actual = new URL(value);
  const expected = new URL(pathWithQuery, appUrl);
  return (
    actual.origin === expected.origin &&
    actual.pathname === expected.pathname &&
    actual.search === expected.search
  );
}

function cookieJar() {
  const values = new Map();
  return {
    header() {
      return [...values].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    capture(response) {
      for (const value of response.headers.getSetCookie?.() ?? []) {
        const pair = value.split(";", 1)[0];
        const separator = pair.indexOf("=");
        if (separator > 0) values.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    },
  };
}

async function exchange(hash, flow, locale) {
  const jar = cookieJar();
  const query = new URLSearchParams({ flow, type: flow, token_hash: hash });
  if (locale) query.set("locale", locale);
  const response = await fetch(`${appUrl}/api/supabase-auth/confirm?${query}`, {
    redirect: "manual",
  });
  jar.capture(response);
  return { jar, response };
}

async function createLink(type, options, address = email) {
  const result = await admin.auth.admin.generateLink({ type, email: address, options });
  if (result.error || !result.data.user || !result.data.properties.hashed_token) {
    throw new Error(`Auth rehearsal failed: ${type}-link-generation`);
  }
  fixtureUserId ??= result.data.user.id;
  fixtureUserIds.add(result.data.user.id);
  return result.data.properties.hashed_token;
}

try {
  const dashboardInviteHash = await createLink("invite", undefined, dashboardEmail);
  const dashboardInvitation = await exchange(dashboardInviteHash, "invite");
  assert(dashboardInvitation.response.status === 303, "dashboard-invite-exchange");
  const dashboardLocation = dashboardInvitation.response.headers.get("location");
  if (!isAppLocation(dashboardLocation, "/en/accept-invite")) {
    const diagnostic = await browserAuth().auth.verifyOtp({
      token_hash: dashboardInviteHash,
      type: "invite",
    });
    throw new Error(
      `Auth rehearsal failed: dashboard-invite-exchange:${diagnostic.error?.code ?? "direct-verification-succeeded"}:user-${Boolean(diagnostic.data.user)}:session-${Boolean(diagnostic.data.session)}:hash-length-${dashboardInviteHash.length}`,
    );
  }
  assert(
    isAppLocation(dashboardLocation, "/en/accept-invite"),
    `dashboard-invite-default-locale:${dashboardLocation ? `${new URL(dashboardLocation).origin}${new URL(dashboardLocation).pathname}${new URL(dashboardLocation).search}` : "none"}`,
  );
  // The next generated identity is the primary fixture used for setup, recovery, and disablement.
  fixtureUserId = null;

  const inviteHash = await createLink("invite", {
    data: { umoja_invite_locale: "fr", umoja_invite_source: "rehearsal" },
  });
  const invitation = await exchange(inviteHash, "invite");
  assert(invitation.response.status === 303, "dashboard-invite-exchange");
  assert(
    isAppLocation(invitation.response.headers.get("location"), "/fr/accept-invite"),
    "invite-locale-resolution",
  );
  assert(!invitation.response.headers.get("location")?.includes("token"), "invite-token-removal");
  const setupPage = await fetch(`${appUrl}/fr/accept-invite`, {
    headers: { cookie: invitation.jar.header() },
  });
  assert(
    setupPage.ok && (await setupPage.text()).includes("confirm-invite-password"),
    "invite-form",
  );
  const setup = await fetch(`${appUrl}/api/supabase-auth/invite/accept?locale=fr`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", cookie: invitation.jar.header() },
    body: JSON.stringify({ password: firstPassword, confirmation: firstPassword }),
  });
  assert(setup.status === 303, "invite-password-save");
  assert(
    isAppLocation(setup.headers.get("location"), "/fr/account-state?reason=membership-required"),
    "account-without-role-status",
  );

  const firstSignInClient = browserAuth();
  const firstSignIn = await firstSignInClient.auth.signInWithPassword({
    email,
    password: firstPassword,
  });
  assert(!firstSignIn.error, "first-password-sign-in");
  await firstSignInClient.auth.signOut();

  const recoveryHash = await createLink("recovery", {
    redirectTo: `${appUrl}/api/supabase-auth/confirm?locale=en&flow=recovery`,
  });
  const recovery = await exchange(recoveryHash, "recovery", "en");
  assert(recovery.response.status === 303, "recovery-exchange");
  const reset = await fetch(`${appUrl}/api/supabase-auth/recovery/confirm?locale=en`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", cookie: recovery.jar.header() },
    body: JSON.stringify({ password: resetPassword, confirmation: resetPassword }),
  });
  assert(reset.status === 303, "recovery-password-save");
  const oldSignIn = await browserAuth().auth.signInWithPassword({ email, password: firstPassword });
  assert(Boolean(oldSignIn.error), "old-password-rejected");
  const newSignInClient = browserAuth();
  const newSignIn = await newSignInClient.auth.signInWithPassword({
    email,
    password: resetPassword,
  });
  assert(!newSignIn.error, "new-password-sign-in");
  await newSignInClient.auth.signOut();

  const replay = await exchange(recoveryHash, "recovery", "en");
  assert(
    isAppLocation(replay.response.headers.get("location"), "/en/recover-password?state=invalid"),
    "used-link-rejected",
  );
  const malformed = await fetch(
    `${appUrl}/api/supabase-auth/confirm?locale=fr&flow=recovery&type=recovery&token_hash=short`,
    { redirect: "manual" },
  );
  assert(
    isAppLocation(malformed.headers.get("location"), "/fr/recover-password?state=invalid"),
    "malformed-link-rejected",
  );

  const disabledHash = await createLink("recovery", {
    redirectTo: `${appUrl}/api/supabase-auth/confirm?locale=fr&flow=recovery`,
  });
  const disabled = await admin.auth.admin.updateUserById(fixtureUserId, { ban_duration: "1h" });
  assert(!disabled.error, "fixture-disable");
  const disabledExchange = await exchange(disabledHash, "recovery", "fr");
  assert(
    isAppLocation(
      disabledExchange.response.headers.get("location"),
      "/fr/recover-password?state=invalid",
    ),
    "disabled-account-rejected",
  );

  rehearsalPassed = true;
} finally {
  for (const userId of fixtureUserIds) {
    await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    const removed = await admin.auth.admin.deleteUser(userId, false);
    if (removed.error) throw new Error("Auth rehearsal cleanup failed.");
  }
  for (let page = 1; ; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listed.error) throw new Error("Auth rehearsal cleanup verification failed.");
    assert(
      !listed.data.users.some((user) => user.email?.startsWith(marker)),
      "fixture-cleanup-leftover",
    );
    if (listed.data.users.length < 1000) break;
  }
}

if (rehearsalPassed) {
  console.log(
    JSON.stringify({
      result: "pass",
      dashboardInvite: "pass",
      firstPassword: "pass",
      pendingAccess: "pass",
      recovery: "pass",
      oldPasswordRejected: "pass",
      usedMalformedDisabled: "pass",
      cleanup: "zero-matching-leftovers",
    }),
  );
}

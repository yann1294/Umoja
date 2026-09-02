import "server-only";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ServerPrincipal } from "@/lib/auth/principal";
import {
  capabilityRequiresMfa,
  rolesHaveCapability,
  type UmojaCapability,
  type UmojaRole,
  type WorkspaceAccessReason,
} from "@/lib/auth/policy";
import { createSupabaseServerClient } from "./server";
import { createSupabaseAdminClient } from "./admin";
import { createSupabaseRouteClient } from "./route-client";
import { toSupabaseServerPrincipal } from "./principal";
import { supabaseAuthConfirmationUrl } from "./redirects";
import { isUmojaRole } from "@/lib/auth/policy";
import { resolveSupabaseAuthContinuation } from "./auth-continuation";
import {
  authFlowCookieFromRequest,
  clearSupabaseAuthFlowCookie,
  parseSupabaseAuthFlowContext,
  SUPABASE_AUTH_FLOW_COOKIE,
  type SupabasePasswordFlow,
} from "./auth-flow-context";

export type SupabaseWorkspaceUser = Readonly<{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  roles: readonly UmojaRole[];
}>;

export type SupabaseWorkspaceAccessState = Readonly<{
  reason: WorkspaceAccessReason;
  user: SupabaseWorkspaceUser | null;
}>;

export const supabaseSignInSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(12).max(256),
});

export const supabasePasswordSchema = z
  .string()
  .min(12)
  .max(256)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

const passwordCompletionSchema = z
  .object({
    password: supabasePasswordSchema,
    confirmation: z.string().max(256),
  })
  .refine(({ password, confirmation }) => password === confirmation, {
    path: ["confirmation"],
  });

export function privilegedMfaRequired() {
  return process.env.UMOJA_PRIVILEGED_MFA_MODE === "required";
}

function activeMembership(
  memberships: readonly { effective_from: string; effective_to: string | null }[],
) {
  const now = new Date();
  return memberships.some(
    ({ effective_from, effective_to }) =>
      effective_to === null && new Date(effective_from).valueOf() <= now.valueOf(),
  );
}

export async function getSupabasePostAuthenticationContinuation(
  client: ReturnType<typeof createSupabaseRouteClient>,
  user: Pick<User, "id">,
  locale: "en" | "fr",
  requestedNext?: unknown,
) {
  const [{ data: assignments }, { data: memberships }, { data: assurance }] = await Promise.all([
    client
      .from("user_roles")
      .select("role, revoked_at")
      .eq("user_id", user.id)
      .is("revoked_at", null),
    client
      .from("membership_history")
      .select("effective_from, effective_to")
      .eq("user_id", user.id)
      .is("effective_to", null),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const roles = (assignments ?? []).map(({ role }) => role).filter(isUmojaRole);
  return resolveSupabaseAuthContinuation({
    locale,
    requestedNext,
    roles,
    membershipActive: activeMembership(memberships ?? []),
    mfaRequired: privilegedMfaRequired(),
    currentLevel: assurance?.currentLevel ?? null,
    nextLevel: assurance?.nextLevel ?? null,
  });
}

export async function hasValidSupabasePasswordFlow(flow: SupabasePasswordFlow) {
  const value = (await cookies()).get(SUPABASE_AUTH_FLOW_COOKIE)?.value;
  const context = parseSupabaseAuthFlowContext(value, flow);
  if (!context) return false;
  const { data, error } = await (await createSupabaseServerClient()).auth.getUser();
  const bannedUntil = data.user?.banned_until ? new Date(data.user.banned_until) : null;
  return Boolean(
    !error &&
    data.user &&
    data.user.id === context.subject &&
    (!bannedUntil || bannedUntil <= new Date()),
  );
}

export async function completeSupabasePasswordFlow(
  request: Request,
  response: NextResponse,
  flow: SupabasePasswordFlow,
  input: unknown,
  locale: "en" | "fr",
) {
  const values = passwordCompletionSchema.parse(input);
  const context = parseSupabaseAuthFlowContext(authFlowCookieFromRequest(request), flow);
  if (!context) throw new Error("password-flow-unavailable");
  const client = createSupabaseRouteClient(request, response);
  const { data, error } = await client.auth.getUser();
  const bannedUntil = data.user?.banned_until ? new Date(data.user.banned_until) : null;
  if (
    error ||
    !data.user ||
    data.user.id !== context.subject ||
    (bannedUntil && bannedUntil > new Date())
  ) {
    throw new Error("password-flow-unavailable");
  }
  const updated = await client.auth.updateUser({ password: values.password });
  if (updated.error) throw new Error("password-flow-unavailable");
  clearSupabaseAuthFlowCookie(response);
  if (flow === "recovery") {
    await client.auth.signOut({ scope: "local" });
    return `/${locale}/sign-in?password=updated`;
  }
  return getSupabasePostAuthenticationContinuation(client, data.user, locale);
}

export async function getSupabaseServerPrincipal(): Promise<ServerPrincipal | null> {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data: assignments, error } = await client
    .from("user_roles")
    .select("role, revoked_at")
    .is("revoked_at", null)
    .eq("user_id", user.id);
  if (error || !assignments?.length) return null;
  const { data: memberships, error: membershipError } = await client
    .from("membership_history")
    .select("effective_from, effective_to")
    .eq("user_id", user.id)
    .is("effective_to", null);
  if (membershipError || !memberships?.length) return null;
  const [{ data: factors }, { data: assurance }] = await Promise.all([
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  return toSupabaseServerPrincipal(user, assignments, memberships, factors, assurance);
}

export async function getSupabaseWorkspaceUser(): Promise<SupabaseWorkspaceUser | null> {
  const principal = await getSupabaseServerPrincipal();
  if (!principal) return null;
  return {
    id: principal.actorId,
    email: principal.email,
    name: "",
    emailVerified: principal.emailVerified,
    mfaEnabled: principal.mfaVerified,
    roles: principal.roles,
  };
}

export async function getSupabaseWorkspaceAccessState(
  capability: UmojaCapability = "workspace.access",
): Promise<SupabaseWorkspaceAccessState> {
  const client = await createSupabaseServerClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  const user = authData.user;
  if (authError || !user) return { reason: "sign-in", user: null };
  const bannedUntil = user.banned_until ? new Date(user.banned_until) : null;
  if (bannedUntil && Number.isFinite(bannedUntil.valueOf()) && bannedUntil > new Date()) {
    return { reason: "account-disabled", user: null };
  }
  if (!user.email_confirmed_at) return { reason: "email-unverified", user: null };
  const [{ data: assignments }, { data: memberships }, { data: factors }, { data: assurance }] =
    await Promise.all([
      client
        .from("user_roles")
        .select("role, revoked_at")
        .is("revoked_at", null)
        .eq("user_id", user.id),
      client
        .from("membership_history")
        .select("effective_from, effective_to")
        .eq("user_id", user.id)
        .is("effective_to", null),
      client.auth.mfa.listFactors(),
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
  const principal = toSupabaseServerPrincipal(
    user,
    assignments ?? [],
    memberships ?? [],
    factors,
    assurance,
  );
  if (!principal) return { reason: "membership-required", user: null };
  const workspaceUser = {
    id: principal.actorId,
    email: principal.email,
    name: "",
    emailVerified: principal.emailVerified,
    mfaEnabled: principal.mfaVerified,
    roles: principal.roles,
  } satisfies SupabaseWorkspaceUser;
  if (capability === "governance.manage") {
    return { reason: "governance-policy-required", user: workspaceUser };
  }
  if (!rolesHaveCapability(principal.roles, capability)) {
    return { reason: "forbidden", user: workspaceUser };
  }
  if (privilegedMfaRequired() && capabilityRequiresMfa(capability) && !principal.mfaVerified) {
    return { reason: "mfa-required", user: workspaceUser };
  }
  return { reason: "allowed", user: workspaceUser };
}

function accessStateUrl(locale: string, reason: WorkspaceAccessReason, next: string) {
  if (reason === "sign-in" || reason === "session-expired") {
    return `/${locale}/sign-in?next=${encodeURIComponent(next)}${reason === "session-expired" ? "&reason=session-expired" : ""}`;
  }
  return `/${locale}/account-state?reason=${reason}`;
}

export async function requireSupabaseWorkspaceUser(locale = "en") {
  const safeLocale = locale === "fr" ? "fr" : "en";
  const state = await getSupabaseWorkspaceAccessState();
  if (state.reason !== "allowed" || !state.user) {
    redirect(accessStateUrl(safeLocale, state.reason, `/${safeLocale}/workspace`));
  }
  return state.user;
}

/** Applicant boundary: verified, active Supabase identity only; no operations membership is implied. */
export async function requireSupabaseApplicant(locale = "en") {
  const safeLocale = locale === "fr" ? "fr" : "en";
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  const user = data.user;
  const bannedUntil = user?.banned_until ? new Date(user.banned_until) : null;
  if (error || !user || !user.email_confirmed_at || (bannedUntil && bannedUntil > new Date())) {
    redirect(
      accessStateUrl(
        safeLocale,
        !user ? "sign-in" : "account-disabled",
        `/${safeLocale}/workspace`,
      ),
    );
  }
  return {
    id: user.id,
    email: user.email ?? "",
    name: String(user.user_metadata?.preferred_name ?? ""),
    emailVerified: true,
    mfaEnabled: false,
    roles: [] as const,
  } satisfies SupabaseWorkspaceUser;
}

/** This boundary is used only by route groups that are fully Supabase-backed. */
export async function requireSupabaseWorkspaceCapability(
  capability: UmojaCapability,
  locale: string = "en",
) {
  const safeLocale = locale === "fr" ? "fr" : "en";
  const state = await getSupabaseWorkspaceAccessState(capability);
  if (state.reason !== "allowed" || !state.user) {
    const defaultPath =
      capability === "cms.manage" || capability === "cms.publish"
        ? `/${safeLocale}/admin/content`
        : capability === "intake.review"
          ? `/${safeLocale}/admin/intake`
          : `/${safeLocale}/admin`;
    redirect(accessStateUrl(safeLocale, state.reason, defaultPath));
  }
  return state.user;
}

export function canUseSupabaseWorkspaceCapability(
  user: SupabaseWorkspaceUser,
  capability: UmojaCapability,
) {
  return rolesHaveCapability(user.roles, capability);
}

export async function signInWithSupabase(input: unknown) {
  const values = supabaseSignInSchema.parse(input);
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.signInWithPassword(values);
  if (error || !data.user || data.user.banned_until) throw new Error("Authentication unavailable.");
  return { id: data.user.id, email: data.user.email ?? "" };
}

export async function signOutOfSupabase() {
  const client = await createSupabaseServerClient();
  await client.auth.signOut();
}

export async function requestSupabaseRecovery(email: unknown, locale: "en" | "fr" = "en") {
  const value = z.email().parse(email);
  const client = await createSupabaseServerClient();
  await client.auth.resetPasswordForEmail(value, {
    redirectTo: supabaseAuthConfirmationUrl(locale, "recovery"),
  });
}

export async function issueSupabaseInvite(email: unknown, locale: "en" | "fr" = "en") {
  await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const recipient = z.email().parse(email);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(recipient, {
    redirectTo: supabaseAuthConfirmationUrl(locale, "invite"),
    data: { umoja_invite_locale: locale, umoja_invite_source: "application" },
  });
  if (error) throw new Error("Invitation unavailable.");
}

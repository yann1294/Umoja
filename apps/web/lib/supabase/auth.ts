import "server-only";

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
import { toSupabaseServerPrincipal } from "./principal";
import { supabaseAuthConfirmationUrl } from "./redirects";

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
  const { data: factors } = await client.auth.mfa.listFactors();
  return toSupabaseServerPrincipal(user, assignments, memberships, factors);
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
  const [{ data: assignments }, { data: memberships }, { data: factors }] = await Promise.all([
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
  ]);
  const principal = toSupabaseServerPrincipal(user, assignments ?? [], memberships ?? [], factors);
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
  if (
    process.env.UMOJA_PRIVILEGED_MFA_MODE === "required" &&
    capabilityRequiresMfa(capability) &&
    !principal.mfaVerified
  ) {
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

export async function resetSupabasePassword(password: unknown) {
  const value = z.string().min(12).max(256).parse(password);
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.updateUser({ password: value });
  if (error) throw new Error("Password reset unavailable.");
}

export async function issueSupabaseInvite(
  email: unknown,
  roles: readonly UmojaRole[],
  locale: "en" | "fr" = "en",
) {
  const issuer = await requireSupabaseWorkspaceUser(locale);
  if (!issuer.roles.includes("admin")) throw new Error("Invitation unavailable.");
  const recipient = z.email().parse(email);
  const safeRoles = z
    .array(z.enum(["admin", "cms-editor", "reviewer", "core", "extended", "project-manager"]))
    .min(1)
    .parse(roles);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(recipient, {
    redirectTo: supabaseAuthConfirmationUrl(locale, "invite"),
  });
  if (error || !data.user) throw new Error("Invitation unavailable.");
  const { error: roleError } = await admin
    .from("user_roles")
    .insert(safeRoles.map((role) => ({ user_id: data.user.id, role, granted_by: issuer.id })));
  if (roleError) throw new Error("Invitation unavailable.");
  const { error: membershipError } = await admin.from("membership_history").insert({
    user_id: data.user.id,
    tier: "core",
    effective_from: new Date().toISOString(),
    approved_by: issuer.id,
  });
  if (membershipError) throw new Error("Invitation unavailable.");
}

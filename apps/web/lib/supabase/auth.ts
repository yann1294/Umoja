import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rolesHaveCapability, type UmojaCapability, type UmojaRole } from "@umoja/appwrite";
import type { ServerPrincipal } from "@/lib/auth/principal";
import { createSupabaseServerClient } from "./server";
import { createSupabaseAdminClient } from "./admin";
import { toSupabaseServerPrincipal } from "./principal";
import { supabaseAuthCallbackUrl } from "./redirects";

export type SupabaseWorkspaceUser = Readonly<{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  roles: readonly UmojaRole[];
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

export async function requireSupabaseWorkspaceUser(locale = "en") {
  const user = await getSupabaseWorkspaceUser();
  if (!user) redirect(`/${locale}/sign-in`);
  return user;
}

/** This boundary is used only by route groups that are fully Supabase-backed. */
export async function requireSupabaseWorkspaceCapability(
  capability: UmojaCapability,
  locale: string = "en",
) {
  const safeLocale = locale === "fr" ? "fr" : "en";
  const principal = await getSupabaseServerPrincipal();
  if (!principal)
    redirect(`/${safeLocale}/admin/content/sign-in?next=/${safeLocale}/admin/content`);
  if (!rolesHaveCapability(principal.roles, capability) || !principal.membershipActive) {
    redirect(`/${safeLocale}/account-state?reason=forbidden`);
  }
  return {
    id: principal.actorId,
    name: "",
    email: principal.email,
    emailVerified: principal.emailVerified,
    mfaEnabled: principal.mfaVerified,
    roles: principal.roles,
  } satisfies SupabaseWorkspaceUser;
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
    redirectTo: supabaseAuthCallbackUrl(locale, "recovery"),
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
    redirectTo: supabaseAuthCallbackUrl(locale, "invite"),
  });
  if (error || !data.user) throw new Error("Invitation unavailable.");
  const { error: roleError } = await admin
    .from("user_roles")
    .insert(safeRoles.map((role) => ({ user_id: data.user.id, role, granted_by: issuer.id })));
  if (roleError) throw new Error("Invitation unavailable.");
}

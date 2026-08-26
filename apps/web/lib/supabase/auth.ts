import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { UmojaRole } from "@umoja/appwrite/permissions";
import { createSupabaseServerClient } from "./server";

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

export async function getSupabaseWorkspaceUser(): Promise<SupabaseWorkspaceUser | null> {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user || user.banned_until) return null;
  const { data: assignments, error } = await client
    .from("user_roles")
    .select("role, revoked_at")
    .is("revoked_at", null)
    .eq("user_id", user.id);
  if (error || !assignments?.length) return null;
  const { data: factors } = await client.auth.mfa.listFactors();
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "",
    emailVerified: Boolean(user.email_confirmed_at),
    mfaEnabled: Boolean(
      factors?.totp?.some((factor) => factor.status === "verified") ||
      factors?.webauthn?.some((factor) => factor.status === "verified"),
    ),
    roles: assignments.map((assignment) => assignment.role as UmojaRole),
  };
}

export async function requireSupabaseWorkspaceUser(locale = "en") {
  const user = await getSupabaseWorkspaceUser();
  if (!user) redirect(`/${locale}/sign-in`);
  return user;
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

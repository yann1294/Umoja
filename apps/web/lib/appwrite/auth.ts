import "server-only";

import { Account, Client, Query, Teams } from "node-appwrite";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  hasUmojaRole,
  type UmojaRole,
  UMOJA_OPERATIONS_TEAM_ID,
} from "@umoja/appwrite/permissions";
import { toSafeAppwriteError } from "@umoja/appwrite/errors";
import { isConfirmedWorkspaceMembership } from "@umoja/appwrite/auth-policy";
import { createSsrServices } from "./admin";
import { getServerAppwriteEnvironment } from "./env";
import {
  clearAppwriteSessionCookie,
  createSessionServices,
  setAppwriteSessionCookie,
} from "./session";

export const signInSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(12).max(256),
});

export const recoveryRequestSchema = z.object({ email: z.email().trim().toLowerCase() });
export const recoveryConfirmSchema = z.object({
  userId: z.string().min(1).max(64),
  secret: z.string().min(1).max(512),
  password: z.string().min(12).max(256),
});
export const tokenSchema = z.object({
  userId: z.string().min(1).max(64),
  secret: z.string().min(1).max(512),
});
export const inviteSchema = tokenSchema.extend({ membershipId: z.string().min(1).max(64) });

async function membershipForSession(secret: string) {
  const env = getServerAppwriteEnvironment();
  const client = new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setSession(secret);
  const account = new Account(client);
  const teams = new Teams(client);
  const user = await account.get();
  const list = await teams.listMemberships({
    teamId: UMOJA_OPERATIONS_TEAM_ID,
    queries: [Query.equal("userId", [user.$id]), Query.equal("confirm", [true])],
  });
  return { user, membership: list.memberships[0] ?? null };
}

export async function signIn(input: unknown) {
  const values = signInSchema.parse(input);
  try {
    const { account } = createSsrServices();
    const session = await account.createEmailPasswordSession(values);
    const authorized = await membershipForSession(session.secret);
    if (!isConfirmedWorkspaceMembership(authorized.membership)) {
      const env = getServerAppwriteEnvironment();
      const client = new Client()
        .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
        .setSession(session.secret);
      await new Account(client).deleteSession({ sessionId: "current" });
      throw Object.assign(new Error("Membership required"), { code: 403 });
    }
    await setAppwriteSessionCookie(session.secret, session.expire);
    return { id: authorized.user.$id, name: authorized.user.name, email: authorized.user.email };
  } catch (error) {
    throw toSafeAppwriteError(error);
  }
}

export async function signOut() {
  const services = await createSessionServices();
  try {
    if (services) await services.account.deleteSession({ sessionId: "current" });
  } finally {
    await clearAppwriteSessionCookie();
  }
}

export async function getCurrentWorkspaceUser() {
  try {
    const services = await createSessionServices();
    if (!services) return null;
    const user = await services.account.get();
    const result = await services.teams.listMemberships({
      teamId: UMOJA_OPERATIONS_TEAM_ID,
      queries: [Query.equal("userId", [user.$id]), Query.equal("confirm", [true])],
    });
    const membership = result.memberships[0];
    if (!membership) return null;
    return {
      id: user.$id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerification,
      roles: membership.roles.filter((role): role is UmojaRole =>
        ["admin", "cms-editor", "reviewer", "core", "extended", "project-manager"].includes(role),
      ),
    };
  } catch {
    return null;
  }
}

export async function requireWorkspaceUser(locale = "en") {
  const user = await getCurrentWorkspaceUser();
  if (!user) redirect(`/${locale}/sign-in`);
  return user;
}

export async function requireWorkspaceRole(
  required: UmojaRole | readonly UmojaRole[],
  locale = "en",
) {
  const user = await requireWorkspaceUser(locale);
  if (!hasUmojaRole(user.roles, required)) redirect(`/${locale}/workspace?access=denied`);
  return user;
}

export async function requestPasswordRecovery(input: unknown) {
  const { email } = recoveryRequestSchema.parse(input);
  const env = getServerAppwriteEnvironment();
  try {
    await createSsrServices().account.createRecovery({
      email,
      url: `${env.APP_URL}/en/recover-password`,
    });
  } catch {
    // Always return the same result to prevent account enumeration.
  }
}

export async function confirmPasswordRecovery(input: unknown) {
  const values = recoveryConfirmSchema.parse(input);
  try {
    await createSsrServices().account.updateRecovery(values);
  } catch (error) {
    throw toSafeAppwriteError(error);
  }
}

export async function requestEmailVerification() {
  const services = await createSessionServices();
  if (!services) throw toSafeAppwriteError({ code: 401 });
  const env = getServerAppwriteEnvironment();
  await services.account.createVerification({ url: `${env.APP_URL}/en/verify-email` });
}

export async function confirmEmailVerification(input: unknown) {
  const services = await createSessionServices();
  if (!services) throw toSafeAppwriteError({ code: 401 });
  await services.account.updateVerification(tokenSchema.parse(input));
}

export async function acceptWorkspaceInvite(input: unknown) {
  const services = await createSessionServices();
  if (!services) throw toSafeAppwriteError({ code: 401 });
  const values = inviteSchema.parse(input);
  return services.teams.updateMembershipStatus({ teamId: UMOJA_OPERATIONS_TEAM_ID, ...values });
}

export async function inviteWorkspaceMember(email: string, roles: UmojaRole[], locale = "en") {
  await requireWorkspaceRole("admin", locale);
  const services = await createSessionServices();
  if (!services) throw toSafeAppwriteError({ code: 401 });
  const env = getServerAppwriteEnvironment();
  return services.teams.createMembership({
    teamId: UMOJA_OPERATIONS_TEAM_ID,
    email: z.email().parse(email.trim().toLowerCase()),
    roles,
    url: `${env.APP_URL}/${locale}/accept-invite`,
  });
}

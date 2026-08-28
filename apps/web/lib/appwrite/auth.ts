import "server-only";

import { Account, Client, Query, Teams } from "node-appwrite";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  evaluateWorkspaceAccess,
  isConfirmedWorkspaceMembership,
  rolesHaveCapability,
  type UmojaCapability,
  type WorkspaceAccessReason,
  type WorkspacePrincipal,
} from "@umoja/appwrite/auth-policy";
import { type UmojaRole, UMOJA_OPERATIONS_TEAM_ID, UMOJA_ROLES } from "@umoja/appwrite/permissions";
import { toSafeAppwriteError } from "@umoja/appwrite/errors";
import { createSsrServices } from "./admin";
import { getServerAppwriteEnvironment } from "./env";
import { getApplicationEnvironment } from "@/lib/config/environment";
import {
  clearAppwriteSessionCookie,
  createSessionServices,
  getAppwriteSessionSecret,
  setAppwriteSessionCookie,
} from "./session";

export type WorkspaceUser = Readonly<{
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  roles: readonly UmojaRole[];
}>;

export type WorkspaceAccessState = Readonly<{
  reason: WorkspaceAccessReason;
  user: WorkspaceUser | null;
}>;

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
    queries: [Query.equal("userId", [user.$id])],
  });
  return { user, membership: list.memberships[0] ?? null };
}

export async function signIn(input: unknown) {
  const values = signInSchema.parse(input);
  try {
    const { account } = createSsrServices();
    const session = await account.createEmailPasswordSession(values);
    const authorized = await membershipForSession(session.secret);
    if (!authorized.user.status || !authorized.membership) {
      const env = getServerAppwriteEnvironment();
      const client = new Client()
        .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
        .setSession(session.secret);
      await new Account(client).deleteSession({ sessionId: "current" });
      throw Object.assign(new Error("Workspace access unavailable"), { code: 403 });
    }
    await setAppwriteSessionCookie(session.secret, session.expire);
    const reason = !authorized.user.emailVerification
      ? "email-unverified"
      : !isConfirmedWorkspaceMembership(authorized.membership)
        ? "invite-pending"
        : "allowed";
    return {
      id: authorized.user.$id,
      name: authorized.user.name,
      email: authorized.user.email,
      reason,
    };
  } catch (error) {
    throw toSafeAppwriteError(error);
  }
}

export async function signOut() {
  const services = await createSessionServices();
  try {
    if (services) await services.account.deleteSession({ sessionId: "current" });
  } catch {
    // Local sign-out must still complete when a remote session is already expired or revoked.
  } finally {
    await clearAppwriteSessionCookie();
  }
}

function toWorkspaceUser(
  user: Readonly<{
    $id: string;
    name: string;
    email: string;
    emailVerification: boolean;
    mfa: boolean;
  }>,
  roles: readonly string[],
): WorkspaceUser {
  return {
    id: user.$id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerification,
    mfaEnabled: user.mfa,
    roles: roles.filter((role): role is UmojaRole => UMOJA_ROLES.includes(role as UmojaRole)),
  };
}

function principalFor(
  user: Readonly<{ status: boolean; emailVerification: boolean }>,
  membership: Readonly<{ confirm: boolean; roles: string[] }> | null,
): WorkspacePrincipal {
  return {
    authenticated: true,
    sessionValid: true,
    accountEnabled: user.status,
    emailVerified: user.emailVerification,
    membershipPresent: Boolean(membership),
    membershipConfirmed: isConfirmedWorkspaceMembership(membership),
    roles: membership?.roles ?? [],
  };
}

export async function getWorkspaceAccessState(
  capability: UmojaCapability = "workspace.access",
): Promise<WorkspaceAccessState> {
  const secret = await getAppwriteSessionSecret();
  if (!secret) return { reason: "sign-in", user: null };
  try {
    const services = await createSessionServices();
    if (!services) return { reason: "sign-in", user: null };
    const user = await services.account.get();
    const result = await services.teams.listMemberships({
      teamId: UMOJA_OPERATIONS_TEAM_ID,
      queries: [Query.equal("userId", [user.$id])],
    });
    const membership = result.memberships[0] ?? null;
    const reason = evaluateWorkspaceAccess(principalFor(user, membership), capability);
    return { reason, user: toWorkspaceUser(user, membership?.roles ?? []) };
  } catch {
    return { reason: "session-expired", user: null };
  }
}

export async function getCurrentWorkspaceUser() {
  const state = await getWorkspaceAccessState();
  return state.reason === "allowed" ? state.user : null;
}

function accountStateUrl(locale: string, reason: WorkspaceAccessReason) {
  if (reason === "sign-in" || reason === "session-expired") {
    return `/${locale}/sign-in${reason === "session-expired" ? "?reason=session-expired" : ""}`;
  }
  return `/${locale}/account-state?reason=${reason}`;
}

export async function requireWorkspaceUser(locale = "en") {
  const state = await getWorkspaceAccessState();
  if (state.reason !== "allowed" || !state.user) redirect(accountStateUrl(locale, state.reason));
  return state.user;
}

export async function requireWorkspaceRole(
  required: UmojaRole | readonly UmojaRole[],
  locale = "en",
) {
  const roles = Array.isArray(required) ? required : [required];
  const user = await requireWorkspaceUser(locale);
  if (!roles.some((role) => user.roles.includes(role))) {
    redirect(`/${locale}/account-state?reason=forbidden`);
  }
  return user;
}

export async function requireWorkspaceCapability(capability: UmojaCapability, locale = "en") {
  const state = await getWorkspaceAccessState(capability);
  if (state.reason !== "allowed" || !state.user) redirect(accountStateUrl(locale, state.reason));
  return state.user;
}

export function canUseWorkspaceCapability(user: WorkspaceUser, capability: UmojaCapability) {
  return rolesHaveCapability(user.roles, capability);
}

export async function refreshWorkspaceSession() {
  const services = await createSessionServices();
  const secret = await getAppwriteSessionSecret();
  if (!services || !secret) throw toSafeAppwriteError({ code: 401 });
  try {
    const session = await services.account.updateSession({ sessionId: "current" });
    await setAppwriteSessionCookie(secret, session.expire);
    const state = await getWorkspaceAccessState();
    if (state.reason !== "allowed") throw toSafeAppwriteError({ code: 403 });
    return state;
  } catch (error) {
    throw toSafeAppwriteError(error);
  }
}

export async function requestPasswordRecovery(input: unknown, locale: "en" | "fr" = "en") {
  const { email } = recoveryRequestSchema.parse(input);
  const env = getApplicationEnvironment();
  try {
    await createSsrServices().account.createRecovery({
      email,
      url: `${env.APP_URL}/${locale}/recover-password`,
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

export async function requestEmailVerification(locale: "en" | "fr" = "en") {
  const services = await createSessionServices();
  if (!services) throw toSafeAppwriteError({ code: 401 });
  const env = getApplicationEnvironment();
  await services.account.createVerification({ url: `${env.APP_URL}/${locale}/verify-email` });
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
  const env = getApplicationEnvironment();
  return services.teams.createMembership({
    teamId: UMOJA_OPERATIONS_TEAM_ID,
    email: z.email().parse(email.trim().toLowerCase()),
    roles,
    url: `${env.APP_URL}/${locale}/accept-invite`,
  });
}

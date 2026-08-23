import "server-only";

import { Account, Client, Storage, TablesDB, Teams } from "node-appwrite";
import { cookies } from "next/headers";
import { sessionCookiePolicy } from "@umoja/appwrite/auth-policy";
import { getServerAppwriteEnvironment } from "./env";

export function appwriteSessionCookieName(projectId: string) {
  return `a_session_${projectId}`;
}

export async function getAppwriteSessionSecret() {
  const env = getServerAppwriteEnvironment();
  return (await cookies()).get(appwriteSessionCookieName(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID))
    ?.value;
}

export async function createSessionServices() {
  const env = getServerAppwriteEnvironment();
  const secret = await getAppwriteSessionSecret();
  if (!secret) return null;
  const client = new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setSession(secret);
  return {
    client,
    account: new Account(client),
    teams: new Teams(client),
    tables: new TablesDB(client),
    storage: new Storage(client),
  };
}

export async function setAppwriteSessionCookie(secret: string, expiresAt?: string) {
  const env = getServerAppwriteEnvironment();
  (await cookies()).set(appwriteSessionCookieName(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID), secret, {
    ...sessionCookiePolicy(process.env.NODE_ENV === "production"),
    priority: "high",
    ...(expiresAt ? { expires: new Date(expiresAt) } : {}),
  });
}

export async function clearAppwriteSessionCookie() {
  const env = getServerAppwriteEnvironment();
  (await cookies()).set(appwriteSessionCookieName(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID), "", {
    ...sessionCookiePolicy(process.env.NODE_ENV === "production"),
    maxAge: 0,
  });
}

import "server-only";

import { Account, Client, Storage, TablesDB, Teams, Users } from "node-appwrite";
import { AppwriteEnvironmentError } from "@umoja/appwrite/env";
import { getServerAppwriteEnvironment } from "./env";

type KeyPurpose = "runtime" | "ssr" | "bootstrap";

export function createKeyedAppwriteClient(purpose: KeyPurpose) {
  const env = getServerAppwriteEnvironment();
  const key =
    purpose === "runtime"
      ? env.APPWRITE_SERVER_API_KEY
      : purpose === "ssr"
        ? env.APPWRITE_SSR_API_KEY
        : env.APPWRITE_BOOTSTRAP_API_KEY;
  if (!key) throw new AppwriteEnvironmentError();
  return new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(key);
}

export function createRuntimeServices() {
  const client = createKeyedAppwriteClient("runtime");
  return {
    client,
    tables: new TablesDB(client),
    storage: new Storage(client),
  };
}

export function createSsrServices() {
  const client = createKeyedAppwriteClient("ssr");
  return {
    client,
    account: new Account(client),
    teams: new Teams(client),
    users: new Users(client),
  };
}

export function createBootstrapServices() {
  const client = createKeyedAppwriteClient("bootstrap");
  return {
    client,
    tables: new TablesDB(client),
    storage: new Storage(client),
    teams: new Teams(client),
  };
}

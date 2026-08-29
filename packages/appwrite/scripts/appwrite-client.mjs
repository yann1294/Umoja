import { Client, Project, Storage, TablesDB, Teams } from "node-appwrite";
import { loadLocalEnvironment, requireValues } from "./config.mjs";

export function createServices(keyName) {
  loadLocalEnvironment();
  requireValues(["NEXT_PUBLIC_APPWRITE_ENDPOINT", "NEXT_PUBLIC_APPWRITE_PROJECT_ID", keyName]);
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env[keyName]);
  return {
    project: new Project(client),
    tables: new TablesDB(client),
    storage: new Storage(client),
    teams: new Teams(client),
  };
}

export function isMissing(error) {
  return error && typeof error === "object" && error.code === 404;
}

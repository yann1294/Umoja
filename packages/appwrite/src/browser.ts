import { Client } from "appwrite";
import { parsePublicAppwriteEnvironment } from "./env";

let browserClient: Client | undefined;

export function getBrowserAppwriteClient(source: Record<string, string | undefined>): Client {
  if (browserClient) return browserClient;
  const env = parsePublicAppwriteEnvironment(source);
  browserClient = new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
  return browserClient;
}

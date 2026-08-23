import "server-only";

import { getAppwriteResourceConfig } from "@umoja/appwrite/config";
import { getServerAppwriteEnvironment } from "./env";

export function getAppwriteConfig() {
  return getAppwriteResourceConfig(getServerAppwriteEnvironment());
}

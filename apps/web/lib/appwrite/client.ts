"use client";

import { getBrowserAppwriteClient } from "@umoja/appwrite/browser";

export function getAppwriteClient() {
  return getBrowserAppwriteClient({
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  });
}

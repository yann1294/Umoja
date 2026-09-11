import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../../supabase/database.types";

const PRIVATE_BUCKET = "cms-private";
const PUBLIC_BUCKET = "cms-public";

export const cmsMediaTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
export const cmsMediaMaximumBytes = 10 * 1024 * 1024;

export function validCmsMediaSignature(type: string, bytes: Uint8Array) {
  if (type === "image/png")
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return (
    type === "image/webp" &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  );
}

type Client = SupabaseClient<Database>;

export async function uploadPrivateCmsMedia(
  client: Client,
  bytes: Uint8Array,
  contentType: "image/png" | "image/jpeg" | "image/webp",
) {
  const objectPath = randomUUID();
  const { error } = await client.storage.from(PRIVATE_BUCKET).upload(objectPath, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return objectPath;
}

/** Copy only a reviewed derivative from the private editorial bucket to the published bucket. */
export async function publishCmsMediaDerivative(client: Client, objectPath: string) {
  const source = await client.storage.from(PRIVATE_BUCKET).download(objectPath);
  if (source.error) throw source.error;
  const { error } = await client.storage.from(PUBLIC_BUCKET).upload(objectPath, source.data, {
    contentType: source.data.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
}

export async function removePublishedCmsMediaDerivative(client: Client, objectPath: string) {
  const { error } = await client.storage.from(PUBLIC_BUCKET).remove([objectPath]);
  if (error) throw error;
}

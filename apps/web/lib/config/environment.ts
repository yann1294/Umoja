import "server-only";

import { z } from "zod";

const optionalSecret = z.string().trim().min(1).optional();

const applicationEnvironmentSchema = z.object({
  APP_URL: z.url(),
  NEXT_REVALIDATION_SECRET: optionalSecret,
  UMOJA_ACTIVE_ENCRYPTION_KEY_VERSION: z
    .string()
    .regex(/^v[1-9][0-9]*$/)
    .optional(),
  SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION: z
    .string()
    .regex(/^v[1-9][0-9]*$/)
    .optional(),
  APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION: z
    .string()
    .regex(/^v[1-9][0-9]*$/)
    .optional(),
});

export class ApplicationEnvironmentError extends Error {
  readonly code = "APPLICATION_CONFIGURATION_UNAVAILABLE";

  constructor() {
    super("Application configuration is unavailable.");
    this.name = "ApplicationEnvironmentError";
  }
}

export function getApplicationEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const parsed = applicationEnvironmentSchema.safeParse(source);
  if (!parsed.success) throw new ApplicationEnvironmentError();
  return parsed.data;
}

/**
 * Returns only server-side encryption configuration. Canonical UMOJA names take precedence while
 * the Supabase and Appwrite aliases preserve existing development ciphertext and key rotation.
 */
export function getIntakeCryptographyEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const shared = getApplicationEnvironment(source);
  const activeVersion =
    shared.UMOJA_ACTIVE_ENCRYPTION_KEY_VERSION ??
    shared.SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION ??
    shared.APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION;
  if (!activeVersion) throw new ApplicationEnvironmentError();
  const suffix = activeVersion.toUpperCase();
  const resolve = (purpose: "DATA_ENCRYPTION" | "FILE_ENCRYPTION" | "LOOKUP_HMAC") =>
    source[`UMOJA_${purpose}_KEY_${suffix}`] ??
    source[`SUPABASE_${purpose}_KEY_${suffix}`] ??
    source[`APPWRITE_${purpose}_KEY_${suffix}`];
  const data = resolve("DATA_ENCRYPTION");
  const file = resolve("FILE_ENCRYPTION");
  const lookup = resolve("LOOKUP_HMAC");
  if (!data || !file || !lookup) throw new ApplicationEnvironmentError();
  return {
    activeVersion,
    dataKeys: { [activeVersion]: data },
    fileKeys: { [activeVersion]: file },
    lookupKeys: { [activeVersion]: lookup },
  } as const;
}

import { z } from "zod";

const optionalSecret = z.string().trim().min(1).optional();

const emailAddress = z.email().trim().toLowerCase();

const applicationOrigin = z
  .url()
  .transform((value) => new URL(value))
  .refine(
    (value) =>
      (value.protocol === "http:" || value.protocol === "https:") &&
      value.username === "" &&
      value.password === "" &&
      value.pathname === "/" &&
      value.search === "" &&
      value.hash === "",
  )
  .transform((value) => value.origin);

const applicationEnvironmentSchema = z.object({
  APP_URL: applicationOrigin,
  NEXT_REVALIDATION_SECRET: optionalSecret,
  UMOJA_ACTIVE_ENCRYPTION_KEY_VERSION: z
    .string()
    .regex(/^v[1-9][0-9]*$/)
    .optional(),
  SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION: z
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
 * the Supabase alias preserves existing development ciphertext and key rotation.
 */
export function getIntakeCryptographyEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const shared = getApplicationEnvironment(source);
  const activeVersion =
    shared.UMOJA_ACTIVE_ENCRYPTION_KEY_VERSION ?? shared.SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION;
  if (!activeVersion) throw new ApplicationEnvironmentError();
  const suffix = activeVersion.toUpperCase();
  const resolve = (purpose: "DATA_ENCRYPTION" | "FILE_ENCRYPTION" | "LOOKUP_HMAC") =>
    source[`UMOJA_${purpose}_KEY_${suffix}`] ?? source[`SUPABASE_${purpose}_KEY_${suffix}`];
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

export type TransactionalEmailEnvironment =
  | Readonly<{
      provider: "log";
      from: string;
      fromName: string;
    }>
  | Readonly<{
      provider: "brevo";
      from: string;
      fromName: string;
      apiKey: string;
    }>;

/** Server-only delivery configuration. The log adapter is deliberately unavailable in production. */
export function getTransactionalEmailEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): TransactionalEmailEnvironment {
  const provider =
    source.UMOJA_EMAIL_PROVIDER ?? (source.NODE_ENV === "production" ? undefined : "log");
  const fromName = z
    .string()
    .trim()
    .min(1)
    .max(120)
    .catch("Umoja")
    .parse(source.UMOJA_EMAIL_FROM_NAME);
  const from = emailAddress.safeParse(source.UMOJA_EMAIL_FROM);
  if (!from.success) throw new ApplicationEnvironmentError();
  if (provider === "log" && source.NODE_ENV !== "production") {
    return { provider, from: from.data, fromName };
  }
  if (provider === "brevo") {
    const apiKey = z.string().trim().min(20).safeParse(source.BREVO_API_KEY);
    if (!apiKey.success) throw new ApplicationEnvironmentError();
    return { provider, from: from.data, fromName, apiKey: apiKey.data };
  }
  throw new ApplicationEnvironmentError();
}

import { z } from "zod";

const optionalSecret = z.string().trim().min(1).optional();
const identifier = z.string().trim().min(1);

export const appwriteEnvironmentSchema = z.object({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.url().refine((value) => value.endsWith("/v1"), {
    message: "Appwrite endpoint must end with /v1",
  }),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: identifier,
  APPWRITE_SSR_API_KEY: optionalSecret,
  APPWRITE_SERVER_API_KEY: optionalSecret,
  APPWRITE_BOOTSTRAP_API_KEY: optionalSecret,
  APPWRITE_DATA_ENCRYPTION_KEY_V1: optionalSecret,
  APPWRITE_FILE_ENCRYPTION_KEY_V1: optionalSecret,
  APPWRITE_LOOKUP_HMAC_KEY_V1: optionalSecret,
  APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION: z
    .string()
    .trim()
    .regex(/^v[1-9][0-9]*$/)
    .optional(),
  APPWRITE_DATABASE_ID: identifier.default("umoja"),
  APPWRITE_CMS_PAGES_TABLE_ID: identifier.default("cms_pages"),
  APPWRITE_CMS_REVISIONS_TABLE_ID: identifier.default("cms_revisions"),
  APPWRITE_PROJECT_INTAKES_TABLE_ID: identifier.default("project_intakes"),
  APPWRITE_TALENT_INTAKES_TABLE_ID: identifier.default("talent_intakes"),
  APPWRITE_AUDIT_LOGS_TABLE_ID: identifier.default("audit_logs"),
  APPWRITE_CMS_MEDIA_BUCKET_ID: identifier.default("cms_media"),
  APPWRITE_INTAKE_FILES_BUCKET_ID: identifier.default("intake_files"),
  APP_URL: z.url().default("http://localhost:3000"),
  NEXT_REVALIDATION_SECRET: optionalSecret,
});

export type AppwriteEnvironment = z.infer<typeof appwriteEnvironmentSchema>;

export class AppwriteEnvironmentError extends Error {
  readonly code = "APPWRITE_CONFIGURATION_UNAVAILABLE";

  constructor() {
    super("Appwrite is not configured for this environment.");
    this.name = "AppwriteEnvironmentError";
  }
}

export function parseAppwriteEnvironment(
  source: Record<string, string | undefined>,
): AppwriteEnvironment {
  const result = appwriteEnvironmentSchema.safeParse(source);
  if (!result.success) throw new AppwriteEnvironmentError();
  return result.data;
}

export function parsePublicAppwriteEnvironment(
  source: Record<string, string | undefined>,
): Pick<AppwriteEnvironment, "NEXT_PUBLIC_APPWRITE_ENDPOINT" | "NEXT_PUBLIC_APPWRITE_PROJECT_ID"> {
  const schema = appwriteEnvironmentSchema.pick({
    NEXT_PUBLIC_APPWRITE_ENDPOINT: true,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: true,
  });
  const result = schema.safeParse(source);
  if (!result.success) throw new AppwriteEnvironmentError();
  return result.data;
}

const SECRET_NAME = /(KEY|SECRET|SESSION|PASSWORD|TOKEN)/i;

export function redactEnvironment(
  source: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      SECRET_NAME.test(key) && value ? "[REDACTED]" : (value ?? ""),
    ]),
  );
}

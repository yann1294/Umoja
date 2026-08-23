import type { AppwriteEnvironment } from "./env";

export const UMOJA_OPERATIONS_TEAM_ID = "umoja-operations";
export const UMOJA_OPERATIONS_TEAM_NAME = "umoja-operations";

export function getAppwriteResourceConfig(env: AppwriteEnvironment) {
  return {
    endpoint: env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: env.APPWRITE_DATABASE_ID,
    teamId: UMOJA_OPERATIONS_TEAM_ID,
    tables: {
      cmsPages: env.APPWRITE_CMS_PAGES_TABLE_ID,
      cmsRevisions: env.APPWRITE_CMS_REVISIONS_TABLE_ID,
      projectIntakes: env.APPWRITE_PROJECT_INTAKES_TABLE_ID,
      talentIntakes: env.APPWRITE_TALENT_INTAKES_TABLE_ID,
      auditLogs: env.APPWRITE_AUDIT_LOGS_TABLE_ID,
    },
    buckets: {
      cmsMedia: env.APPWRITE_CMS_MEDIA_BUCKET_ID,
      intakeFiles: env.APPWRITE_INTAKE_FILES_BUCKET_ID,
    },
  } as const;
}

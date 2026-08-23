import "server-only";

import type { Models, TablesDB } from "node-appwrite";
import {
  ProjectIntakeSchema,
  TalentIntakeSchema,
  type ProjectIntake,
  type TalentIntake,
} from "@umoja/validation";
import { getAppwriteConfig } from "@/lib/appwrite/config";
import {
  createAppwriteBlindIndex,
  decryptAppwriteValue,
  encryptAppwriteValue,
  type AppwriteEncryptionKeyring,
} from "@/lib/appwrite/encryption";

type IntakeKind = "project" | "talent";
type IntakeRow = Models.Row & Record<string, unknown>;
type AuthorizedRead = (
  request: Readonly<{
    kind: IntakeKind;
    rowId: string;
    operation: "read-sensitive";
    status: string;
    assignedReviewerId?: string;
  }>,
) => Promise<boolean>;

type PreparedSubmission<T> = Readonly<{
  submissionId: string;
  keyHash: string;
  payload: T;
  policyVersion: string;
  claimedAt: string;
}>;

export class IntakeRepositoryAccessError extends Error {
  readonly code = "INTAKE_ACCESS_DENIED";

  constructor() {
    super("The intake submission is unavailable.");
    this.name = "IntakeRepositoryAccessError";
  }
}

function authorizationMetadata(kind: IntakeKind, row: IntakeRow) {
  return {
    kind,
    rowId: row.$id,
    operation: "read-sensitive" as const,
    status: String(row.status),
    assignedReviewerId: row.assignedReviewerId ? String(row.assignedReviewerId) : undefined,
  };
}

export class AppwriteEncryptedIntakeRepository {
  private readonly resources = getAppwriteConfig();

  constructor(
    private readonly tables: TablesDB,
    private readonly keyring: AppwriteEncryptionKeyring,
    private readonly authorizeRead: AuthorizedRead,
  ) {}

  async createProject(input: PreparedSubmission<ProjectIntake>, locale: "en" | "fr") {
    const payload = ProjectIntakeSchema.parse(input.payload);
    return this.tables.createRow({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.projectIntakes,
      rowId: input.submissionId,
      data: {
        submissionId: input.submissionId,
        emailLookup: createAppwriteBlindIndex(
          payload.contact.email,
          "intake:project:email",
          this.keyring,
        ),
        encryptionKeyVersion: this.keyring.activeVersion,
        encryptedPayload: encryptAppwriteValue(
          JSON.stringify(payload),
          `intake:project:${input.submissionId}:payload`,
          this.keyring,
        ),
        encryptedInternalNotes: null,
        serviceAreas: payload.need.serviceAreas,
        attachmentCount: payload.attachments.length,
        consentAt: input.claimedAt,
        policyVersion: input.policyVersion,
        locale,
        status: "new",
        assignedReviewerId: null,
        idempotencyKeyHash: input.keyHash,
        createdAt: input.claimedAt,
        updatedAt: input.claimedAt,
      },
    });
  }

  async createTalent(input: PreparedSubmission<TalentIntake>, locale: "en" | "fr") {
    const payload = TalentIntakeSchema.parse(input.payload);
    return this.tables.createRow({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.talentIntakes,
      rowId: input.submissionId,
      data: {
        submissionId: input.submissionId,
        emailLookup: createAppwriteBlindIndex(
          payload.privateContact.email,
          "intake:talent:email",
          this.keyring,
        ),
        encryptionKeyVersion: this.keyring.activeVersion,
        encryptedPayload: encryptAppwriteValue(
          JSON.stringify(payload),
          `intake:talent:${input.submissionId}:payload`,
          this.keyring,
        ),
        encryptedInternalNotes: null,
        skillAreas: payload.skillAreas,
        experienceBand: payload.experienceBand,
        attachmentCount: 0,
        publicProfileConsent: payload.publicProfileConsent,
        applicationConsentAt: input.claimedAt,
        dataProcessingConsentAt: input.claimedAt,
        policyVersion: input.policyVersion,
        locale,
        status: "new",
        assignedReviewerId: null,
        idempotencyKeyHash: input.keyHash,
        createdAt: input.claimedAt,
        updatedAt: input.claimedAt,
      },
    });
  }

  async getProject(rowId: string) {
    return this.getSensitive("project", rowId, ProjectIntakeSchema);
  }

  async getTalent(rowId: string) {
    return this.getSensitive("talent", rowId, TalentIntakeSchema);
  }

  private async getSensitive<T>(
    kind: IntakeKind,
    rowId: string,
    schema: { parse(value: unknown): T },
  ) {
    const tableId =
      kind === "project"
        ? this.resources.tables.projectIntakes
        : this.resources.tables.talentIntakes;
    const row = await this.tables.getRow<IntakeRow>({
      databaseId: this.resources.databaseId,
      tableId,
      rowId,
    });
    if (!(await this.authorizeRead(authorizationMetadata(kind, row))))
      throw new IntakeRepositoryAccessError();
    const plaintext = decryptAppwriteValue(
      String(row.encryptedPayload),
      `intake:${kind}:${String(row.submissionId)}:payload`,
      this.keyring,
    );
    try {
      return schema.parse(JSON.parse(plaintext));
    } catch {
      throw new IntakeRepositoryAccessError();
    }
  }
}

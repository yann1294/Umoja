import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ProjectIntakeSchema,
  TalentIntakeSchema,
  type ProjectIntake,
  type TalentIntake,
} from "@umoja/validation";
import type { ServerPrincipal } from "@/lib/auth/principal";
import type { Database } from "../../../../supabase/database.types";
import {
  createIntakeBlindIndex,
  decryptIntakeValue,
  encryptIntakeValue,
  type IntakeEncryptionKeyring,
} from "./encryption";
import type {
  IntakeReviewStatus,
  IntakeReviewUpdate,
  IntakeSummary,
  PersistedIntakeKind,
  PreparedIntakeSubmission,
} from "./contracts";
import { IntakeRepositoryAccessError } from "./repository";

type Client = SupabaseClient<Database>;
type ProjectRow = Database["public"]["Tables"]["project_intakes"]["Row"];
type TalentRow = Database["public"]["Tables"]["talent_intakes"]["Row"];
type IntakeRow = ProjectRow | TalentRow;

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function duplicate(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

function canReview(principal: ServerPrincipal | null) {
  return Boolean(
    principal?.membershipActive &&
    (principal.roles.includes("reviewer") || principal.roles.includes("admin")),
  );
}

function canRead(principal: ServerPrincipal | null, row: IntakeRow) {
  return Boolean(principal && (row.applicant_id === principal.actorId || canReview(principal)));
}

function table(kind: PersistedIntakeKind) {
  return kind === "project" ? "project_intakes" : "talent_intakes";
}

function summary(kind: PersistedIntakeKind, row: IntakeRow): IntakeSummary {
  return {
    id: row.id,
    submissionId: row.submission_id,
    kind,
    status: row.status as IntakeReviewStatus,
    locale: row.locale === "fr" ? "fr" : "en",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedReviewerId: row.assigned_reviewer_id ?? undefined,
    categories:
      kind === "project" ? (row as ProjectRow).service_areas : (row as TalentRow).skill_areas,
    attachmentCount: row.attachment_count,
  };
}

/**
 * Adapter-only Supabase repository. Public creation requires a service-role client after the
 * existing validation/rate-limit/honeypot boundary; signed-in reads and review transitions use a
 * user-scoped SSR client so RLS remains authoritative.
 */
export class SupabaseEncryptedIntakeRepository {
  constructor(
    private readonly client: Client,
    private readonly keyring: IntakeEncryptionKeyring,
    private readonly principal: ServerPrincipal | null,
    private readonly privilegedCreation = false,
  ) {}

  async createProject(input: PreparedIntakeSubmission<ProjectIntake>, locale: "en" | "fr") {
    if (!this.privilegedCreation) throw new IntakeRepositoryAccessError();
    const payload = ProjectIntakeSchema.parse(input.payload);
    const encryptedPayload = encryptIntakeValue(
      JSON.stringify(payload),
      `intake:project:${input.submissionId}:payload`,
      this.keyring,
    );
    const { data, error } = await this.client.rpc("create_encrypted_project_intake", {
      p_after_digest: digest({
        kind: "project",
        submissionId: input.submissionId,
        keyHash: input.keyHash,
        policyVersion: input.policyVersion,
      }),
      // Postgres accepts NULL for anonymous submissions; generated RPC argument types do not
      // currently represent nullable function parameters.
      p_applicant_id: input.ownerUserId ?? (null as unknown as string),
      p_attachment_count: payload.attachments.length,
      p_consent_at: input.claimedAt,
      p_email_lookup: createIntakeBlindIndex(
        payload.contact.email,
        "intake:project:email",
        this.keyring,
      ),
      p_encrypted_payload: encryptedPayload,
      p_encryption_key_version: this.keyring.activeVersion,
      p_idempotency_key_hash: input.keyHash,
      p_locale: locale,
      p_policy_version: input.policyVersion,
      p_service_areas: payload.need.serviceAreas,
      p_submission_id: input.submissionId,
    });
    if (error) {
      if (duplicate(error)) return { status: "duplicate" as const };
      throw error;
    }
    return { status: "created" as const, row: data };
  }

  async createTalent(input: PreparedIntakeSubmission<TalentIntake>, locale: "en" | "fr") {
    if (!this.privilegedCreation) throw new IntakeRepositoryAccessError();
    const payload = TalentIntakeSchema.parse(input.payload);
    const encryptedPayload = encryptIntakeValue(
      JSON.stringify(payload),
      `intake:talent:${input.submissionId}:payload`,
      this.keyring,
    );
    const { data, error } = await this.client.rpc("create_encrypted_talent_intake", {
      p_after_digest: digest({
        kind: "talent",
        submissionId: input.submissionId,
        keyHash: input.keyHash,
        policyVersion: input.policyVersion,
      }),
      p_applicant_id: input.ownerUserId ?? (null as unknown as string),
      p_application_consent_at: input.claimedAt,
      p_attachment_count: 0,
      p_data_processing_consent_at: input.claimedAt,
      p_email_lookup: createIntakeBlindIndex(
        payload.privateContact.email,
        "intake:talent:email",
        this.keyring,
      ),
      p_encrypted_payload: encryptedPayload,
      p_encryption_key_version: this.keyring.activeVersion,
      p_experience_band: payload.experienceBand,
      p_idempotency_key_hash: input.keyHash,
      p_locale: locale,
      p_policy_version: input.policyVersion,
      p_public_profile_consent: payload.publicProfileConsent,
      p_skill_areas: payload.skillAreas,
      p_submission_id: input.submissionId,
    });
    if (error) {
      if (duplicate(error)) return { status: "duplicate" as const };
      throw error;
    }
    return { status: "created" as const, row: data };
  }

  async list(kind: PersistedIntakeKind, status?: IntakeReviewStatus) {
    if (!canReview(this.principal)) throw new IntakeRepositoryAccessError();
    let query = this.client
      .from(table(kind))
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return (data as IntakeRow[]).map((row) => summary(kind, row));
  }

  async getProject(id: string) {
    return this.getSensitive("project", id, ProjectIntakeSchema);
  }

  async getTalent(id: string) {
    return this.getSensitive("talent", id, TalentIntakeSchema);
  }

  async findByEmail(kind: PersistedIntakeKind, normalizedEmail: string) {
    if (!canReview(this.principal)) throw new IntakeRepositoryAccessError();
    const lookup = createIntakeBlindIndex(normalizedEmail, `intake:${kind}:email`, this.keyring);
    const { data, error } = await this.client
      .from(table(kind))
      .select("*")
      .eq("email_lookup", lookup)
      .is("archived_at", null)
      .limit(50);
    if (error) throw error;
    return (data as IntakeRow[]).map((row) => summary(kind, row));
  }

  async updateReview(kind: PersistedIntakeKind, id: string, input: IntakeReviewUpdate) {
    if (!canReview(this.principal)) throw new IntakeRepositoryAccessError();
    const current = await this.raw(kind, id);
    if (!current || !canRead(this.principal, current)) throw new IntakeRepositoryAccessError();
    const notes = current.encrypted_internal_notes
      ? (JSON.parse(
          decryptIntakeValue(
            current.encrypted_internal_notes,
            `intake:${kind}:${current.submission_id}:notes`,
            this.keyring,
          ),
        ) as Array<{ actorId: string; createdAt: string; text: string }>)
      : [];
    const note = input.note?.trim().slice(0, 2000);
    if (note && this.principal)
      notes.push({
        actorId: this.principal.actorId,
        createdAt: new Date().toISOString(),
        text: note,
      });
    const encryptedNotes = notes.length
      ? encryptIntakeValue(
          JSON.stringify(notes),
          `intake:${kind}:${current.submission_id}:notes`,
          this.keyring,
        )
      : null;
    const { error } = await this.client.rpc("update_intake_review", {
      p_after_digest: digest({
        kind,
        id,
        status: input.status,
        assignedReviewerId: input.assignedReviewerId ?? null,
        hasNotes: notes.length > 0,
      }),
      p_assigned_reviewer_id: input.assignedReviewerId ?? (null as unknown as string),
      p_encrypted_internal_notes: encryptedNotes ?? (null as unknown as string),
      p_intake_id: id,
      p_kind: kind,
      p_status: input.status,
    });
    if (error) throw error;
    return this.getSummary(kind, id);
  }

  private async getSummary(kind: PersistedIntakeKind, id: string) {
    const row = await this.raw(kind, id);
    if (!row || !canRead(this.principal, row)) throw new IntakeRepositoryAccessError();
    return summary(kind, row);
  }

  private async raw(kind: PersistedIntakeKind, id: string) {
    const { data, error } = await this.client
      .from(table(kind))
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as IntakeRow | null;
  }

  private async getSensitive<T>(
    kind: PersistedIntakeKind,
    id: string,
    schema: { parse(value: unknown): T },
  ) {
    const row = await this.raw(kind, id);
    if (!row || !canRead(this.principal, row)) throw new IntakeRepositoryAccessError();
    try {
      return schema.parse(
        JSON.parse(
          decryptIntakeValue(
            row.encrypted_payload,
            `intake:${kind}:${row.submission_id}:payload`,
            this.keyring,
          ),
        ),
      );
    } catch {
      throw new IntakeRepositoryAccessError();
    }
  }
}

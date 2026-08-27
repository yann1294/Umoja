import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateIntakeFile } from "@umoja/appwrite/intake-security";
import type { Database } from "../../../../supabase/database.types";
import type { PersistedIntakeKind } from "./contracts";
import {
  decryptIntakeFile,
  decryptIntakeValue,
  encryptIntakeFile,
  encryptIntakeValue,
  type IntakeEncryptionKeyring,
} from "./encryption";
import { IntakeRepositoryAccessError } from "./repository";

const BUCKET = "applicant-private";
const ENCRYPTED_CONTENT_TYPE = "application/octet-stream";

type Client = SupabaseClient<Database>;
type FileRow = Database["public"]["Tables"]["intake_files"]["Row"];
type FileAuthorization = (
  value: Readonly<{
    operation: "upload" | "download" | "delete";
    kind: PersistedIntakeKind;
    intakeId: string;
    applicantId: string | null;
    fileId?: string;
  }>,
) => Promise<boolean>;

const mediaTypesByExtension: Readonly<Record<string, string>> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  webp: "image/webp",
};

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeName(value: string) {
  const leaf = value.split(/[\\/]/).pop()?.normalize("NFKC").trim() ?? "download";
  return leaf.replace(/[\u0000-\u001f\u007f";]+/g, "_").slice(0, 180) || "download";
}

function parent(row: FileRow) {
  if (row.project_intake_id) return { kind: "project" as const, intakeId: row.project_intake_id };
  if (row.talent_intake_id) return { kind: "talent" as const, intakeId: row.talent_intake_id };
  throw new IntakeRepositoryAccessError();
}

export function prepareSupabaseApplicantFile(
  input: Readonly<{ name: string; mediaType: string; bytes: Uint8Array }>,
  submissionId: string,
  keyring: IntakeEncryptionKeyring,
) {
  const validation = validateIntakeFile({
    name: input.name,
    size: input.bytes.byteLength,
    bytes: input.bytes,
  });
  if (!validation.valid || mediaTypesByExtension[validation.extension] !== input.mediaType)
    throw new IntakeRepositoryAccessError();
  const fileId = randomUUID();
  const objectPath = `${randomUUID()}/${randomUUID()}.umojaenc`;
  const context = `intake:file:${submissionId}:${fileId}`;
  const bytes = encryptIntakeFile(input.bytes, context, keyring);
  const encryptedMetadata = encryptIntakeValue(
    JSON.stringify({ originalName: safeName(input.name) }),
    `${context}:metadata`,
    keyring,
  );
  return {
    bytes,
    contentDigest: sha256(bytes),
    encryptedMetadata,
    fileId,
    mediaType: input.mediaType,
    objectPath,
    originalSize: input.bytes.byteLength,
  };
}

/** Trusted service boundary. The client must be server-only and authorization runs before I/O. */
export class SupabaseApplicantPrivateStorage {
  constructor(
    private readonly client: Client,
    private readonly keyring: IntakeEncryptionKeyring,
    private readonly authorize: FileAuthorization,
  ) {}

  async upload(
    kind: PersistedIntakeKind,
    intake: Readonly<{ id: string; submissionId: string; applicantId: string | null }>,
    input: Readonly<{ name: string; mediaType: string; bytes: Uint8Array }>,
  ) {
    if (
      !(await this.authorize({
        operation: "upload",
        kind,
        intakeId: intake.id,
        applicantId: intake.applicantId,
      }))
    )
      throw new IntakeRepositoryAccessError();
    const prepared = prepareSupabaseApplicantFile(input, intake.submissionId, this.keyring);
    const upload = await this.client.storage
      .from(BUCKET)
      .upload(prepared.objectPath, prepared.bytes, {
        contentType: ENCRYPTED_CONTENT_TYPE,
        upsert: false,
      });
    if (upload.error) throw upload.error;
    const registered = await this.client.rpc("register_intake_file", {
      p_content_digest: prepared.contentDigest,
      p_encrypted_metadata: prepared.encryptedMetadata,
      p_encrypted_size: prepared.bytes.byteLength,
      p_encryption_key_version: this.keyring.activeVersion,
      p_file_id: prepared.fileId,
      p_intake_id: intake.id,
      p_kind: kind,
      p_media_type: prepared.mediaType,
      p_object_path: prepared.objectPath,
      p_original_size: prepared.originalSize,
    });
    if (registered.error) {
      await this.client.storage.from(BUCKET).remove([prepared.objectPath]);
      throw registered.error;
    }
    return {
      id: registered.data.id,
      mediaType: prepared.mediaType,
      originalSize: prepared.originalSize,
    };
  }

  async download(fileId: string) {
    const row = await this.get(fileId);
    const source = parent(row);
    if (
      !(await this.authorize({
        operation: "download",
        ...source,
        applicantId: row.applicant_id,
        fileId,
      }))
    )
      throw new IntakeRepositoryAccessError();
    const intake = await this.intake(source.kind, source.intakeId);
    const result = await this.client.storage.from(BUCKET).download(row.object_path);
    if (result.error) throw result.error;
    const encrypted = new Uint8Array(await result.data.arrayBuffer());
    if (sha256(encrypted) !== row.content_digest) throw new IntakeRepositoryAccessError();
    const context = `intake:file:${intake.submission_id}:${fileId}`;
    try {
      const metadata = JSON.parse(
        decryptIntakeValue(row.encrypted_metadata, `${context}:metadata`, this.keyring),
      ) as { originalName: string };
      return {
        bytes: decryptIntakeFile(encrypted, context, this.keyring),
        mediaType: row.media_type,
        name: safeName(metadata.originalName),
      };
    } catch {
      throw new IntakeRepositoryAccessError();
    }
  }

  async remove(fileId: string) {
    const row = await this.get(fileId);
    const source = parent(row);
    if (
      !(await this.authorize({
        operation: "delete",
        ...source,
        applicantId: row.applicant_id,
        fileId,
      }))
    )
      throw new IntakeRepositoryAccessError();
    const archived = await this.client.rpc("archive_intake_file", {
      p_after_digest: sha256(new TextEncoder().encode(`archived:${fileId}`)),
      p_file_id: fileId,
    });
    if (archived.error) throw archived.error;
    const removal = await this.client.storage.from(BUCKET).remove([archived.data]);
    if (removal.error) throw removal.error;
  }

  private async get(id: string) {
    const { data, error } = await this.client
      .from("intake_files")
      .select("*")
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle();
    if (error || !data) throw new IntakeRepositoryAccessError();
    return data;
  }

  private async intake(kind: PersistedIntakeKind, id: string) {
    const source = kind === "project" ? "project_intakes" : "talent_intakes";
    const { data, error } = await this.client
      .from(source)
      .select("submission_id")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) throw new IntakeRepositoryAccessError();
    return data;
  }
}

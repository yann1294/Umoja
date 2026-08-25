import "server-only";

import { ID, Models, Query, type TablesDB } from "node-appwrite";
import { createAppwriteEncryptionKeyringFromEnvironment, decryptAppwriteValue, encryptAppwriteValue } from "@/lib/appwrite/encryption";
import { getAppwriteConfig } from "@/lib/appwrite/config";
import { createRuntimeServices } from "@/lib/appwrite/admin";

export type IntakeReviewKind = "project" | "talent";
export type IntakeSummary = Readonly<{
  id: string; kind: IntakeReviewKind; status: string; locale: "en" | "fr";
  createdAt: string; updatedAt: string; assignedReviewerId?: string; categories: string[];
}>;

type Row = Models.Row & Record<string, unknown>;
const config = () => getAppwriteConfig();
const tableFor = (kind: IntakeReviewKind) =>
  kind === "project" ? config().tables.projectIntakes : config().tables.talentIntakes;

function summary(kind: IntakeReviewKind, row: Row): IntakeSummary {
  return {
    id: row.$id, kind, status: String(row.status), locale: row.locale === "fr" ? "fr" : "en",
    createdAt: String(row.createdAt), updatedAt: String(row.updatedAt),
    assignedReviewerId: row.assignedReviewerId ? String(row.assignedReviewerId) : undefined,
    categories: (kind === "project" ? row.serviceAreas : row.skillAreas) as string[] ?? [],
  };
}

export async function listIntakeSummaries(tables: TablesDB, state?: string) {
  const requests = (["project", "talent"] as const).map(async (kind) => {
    const result = await tables.listRows<Row>({
      databaseId: config().databaseId, tableId: tableFor(kind),
      queries: [
        ...(state ? [Query.equal("status", [state])] : []),
        Query.orderDesc("createdAt"), Query.limit(50),
      ],
    });
    return result.rows.map((row) => summary(kind, row));
  });
  return (await Promise.all(requests)).flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getIntakeForReview(tables: TablesDB, kind: IntakeReviewKind, id: string) {
  const row = await tables.getRow<Row>({ databaseId: config().databaseId, tableId: tableFor(kind), rowId: id });
  const keyring = createAppwriteEncryptionKeyringFromEnvironment(process.env);
  const payload = JSON.parse(decryptAppwriteValue(String(row.encryptedPayload), `intake:${kind}:${String(row.submissionId)}:payload`, keyring));
  const notes = row.encryptedInternalNotes
    ? JSON.parse(decryptAppwriteValue(String(row.encryptedInternalNotes), `intake:${kind}:${String(row.submissionId)}:notes`, keyring))
    : [];
  return { summary: summary(kind, row), payload, notes };
}

export async function updateIntakeReview(
  tables: TablesDB, kind: IntakeReviewKind, id: string, input: Readonly<{ status: string; assignedReviewerId?: string; note?: string; actorId: string }>,
) {
  const existing = await tables.getRow<Row>({ databaseId: config().databaseId, tableId: tableFor(kind), rowId: id });
  const keyring = createAppwriteEncryptionKeyringFromEnvironment(process.env);
  const notes = existing.encryptedInternalNotes
    ? JSON.parse(decryptAppwriteValue(String(existing.encryptedInternalNotes), `intake:${kind}:${String(existing.submissionId)}:notes`, keyring))
    : [];
  if (input.note?.trim()) notes.push({ actorId: input.actorId, createdAt: new Date().toISOString(), text: input.note.trim().slice(0, 2000) });
  const updatedAt = new Date().toISOString();
  await tables.updateRow({ databaseId: config().databaseId, tableId: tableFor(kind), rowId: id, data: {
    status: input.status, assignedReviewerId: input.assignedReviewerId || null, updatedAt,
    encryptedInternalNotes: notes.length ? encryptAppwriteValue(JSON.stringify(notes), `intake:${kind}:${String(existing.submissionId)}:notes`, keyring) : null,
  }});
  // Reviewers can update their assigned workflow rows, while the protected audit table
  // intentionally accepts writes through the server runtime boundary only.
  await createRuntimeServices().tables.createRow({ databaseId: config().databaseId, tableId: config().tables.auditLogs, rowId: ID.unique(), data: {
    actorId: input.actorId, action: "intake.review.updated", targetType: `${kind}_intake`, targetId: id,
    requestId: null, beforeDigest: null, afterDigest: null, metadata: JSON.stringify({ status: input.status, hasNote: Boolean(input.note?.trim()) }), createdAt: updatedAt,
  }});
}

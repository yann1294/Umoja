import {
  IntakeSchemas,
  type ContactIntake,
  type IntakeKind,
  type IntakeSubmissionResult,
  type ProjectIntake,
  type TalentIntake,
} from "@umoja/validation";
import { createHash } from "node:crypto";

type PayloadByKind = {
  contact: ContactIntake;
  project: ProjectIntake;
  talent: TalentIntake;
};

const receivedFingerprints = new Set<string>();
const referenceSequences: Record<IntakeKind, number> = { contact: 0, project: 0, talent: 0 };

function contactEmail(kind: IntakeKind, payload: PayloadByKind[IntakeKind]) {
  if (kind === "project") return (payload as ProjectIntake).contact.email;
  if (kind === "talent") return (payload as TalentIntake).privateContact.email;
  return (payload as ContactIntake).email;
}

function fieldErrors(issues: readonly { message: string; path: PropertyKey[] }[]) {
  return issues.reduce<Record<string, string[]>>((errors, issue) => {
    const path = issue.path.join(".") || "root";
    errors[path] = [...(errors[path] ?? []), issue.message];
    return errors;
  }, {});
}

/**
 * Temporary server boundary. It validates input and remembers only a one-way
 * duplicate fingerprint for the lifetime of this process. Payloads are never persisted.
 */
export async function submitMockIntake<K extends IntakeKind>(
  kind: K,
  input: unknown,
): Promise<IntakeSubmissionResult> {
  const parsed = IntakeSchemas[kind].safeParse(input);
  if (!parsed.success) {
    return {
      status: "validation_error",
      fieldErrors: fieldErrors(parsed.error.issues),
      persisted: false,
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 350));
  const email = contactEmail(kind, parsed.data as PayloadByKind[IntakeKind]);
  const fingerprint = createHash("sha256")
    .update(`${kind}:${email.trim().toLowerCase()}`)
    .digest("hex");
  if (receivedFingerprints.has(fingerprint)) return { status: "duplicate", persisted: false };

  receivedFingerprints.add(fingerprint);
  referenceSequences[kind] += 1;
  return {
    status: "success",
    reference: `MOCK-${kind.toUpperCase()}-${String(referenceSequences[kind]).padStart(4, "0")}`,
    persisted: false,
  };
}

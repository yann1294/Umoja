import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  honeypotWasFilled,
  normalizeEmail,
  normalizePhone,
  normalizeUrl,
  type IntakeIdempotencyStore,
  type IntakeRateLimiter,
} from "@umoja/appwrite/intake-security";
import {
  IntakeSchemas,
  type ContactIntake,
  type IntakeKind,
  type ProjectIntake,
  type TalentIntake,
} from "@umoja/validation";

type PayloadByKind = { contact: ContactIntake; project: ProjectIntake; talent: TalentIntake };

function normalize<K extends IntakeKind>(kind: K, payload: PayloadByKind[K]): PayloadByKind[K] {
  if (kind === "project") {
    const value = payload as ProjectIntake;
    return {
      ...value,
      contact: {
        ...value.contact,
        email: normalizeEmail(value.contact.email),
        phone: normalizePhone(value.contact.phone),
      },
      organization: { ...value.organization, website: normalizeUrl(value.organization.website) },
    } as PayloadByKind[K];
  }
  if (kind === "talent") {
    const value = payload as TalentIntake;
    return {
      ...value,
      privateContact: {
        ...value.privateContact,
        email: normalizeEmail(value.privateContact.email),
        phone: normalizePhone(value.privateContact.phone),
      },
      portfolioItems: value.portfolioItems.map((item) => ({
        ...item,
        url: normalizeUrl(item.url),
      })),
    } as PayloadByKind[K];
  }
  const value = payload as ContactIntake;
  return { ...value, email: normalizeEmail(value.email) } as PayloadByKind[K];
}

function emailFor(kind: IntakeKind, payload: PayloadByKind[IntakeKind]) {
  if (kind === "project") return (payload as ProjectIntake).contact.email;
  if (kind === "talent") return (payload as TalentIntake).privateContact.email;
  return (payload as ContactIntake).email;
}

export async function prepareIntakeSubmission<K extends IntakeKind>(
  options: Readonly<{
    kind: K;
    input: unknown;
    honeypot?: unknown;
    remoteKey: string;
    rateLimiter: IntakeRateLimiter;
    idempotencyStore: IntakeIdempotencyStore;
    policyVersion: string;
  }>,
) {
  if (honeypotWasFilled(options.honeypot)) return { status: "rejected" as const };
  const decision = await options.rateLimiter.check(
    createHash("sha256").update(options.remoteKey).digest("hex"),
  );
  if (!decision.allowed)
    return { status: "rate_limited" as const, retryAfterSeconds: decision.retryAfterSeconds };
  const parsed = IntakeSchemas[options.kind].safeParse(options.input);
  if (!parsed.success) return { status: "validation_error" as const, issues: parsed.error.issues };
  const payload = normalize(options.kind, parsed.data as PayloadByKind[K]);
  const keyHash = createHash("sha256")
    .update(`${options.kind}:${emailFor(options.kind, payload)}`)
    .digest("hex");
  const claim = await options.idempotencyStore.claim(
    keyHash,
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  if (claim === "duplicate") return { status: "duplicate" as const };
  return {
    status: "ready" as const,
    submissionId: randomUUID(),
    keyHash,
    payload,
    policyVersion: options.policyVersion,
    claimedAt: new Date().toISOString(),
  };
}

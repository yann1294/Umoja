import type { ProjectIntake, TalentIntake } from "@umoja/validation";

export type PersistedIntakeKind = "project" | "talent";
export type IntakeReviewStatus =
  "new" | "triage" | "in_review" | "contacted" | "accepted" | "closed" | "duplicate";

export type PreparedIntakeSubmission<T extends ProjectIntake | TalentIntake> = Readonly<{
  submissionId: string;
  keyHash: string;
  payload: T;
  policyVersion: string;
  claimedAt: string;
  ownerUserId?: string;
}>;

export type IntakeSummary = Readonly<{
  id: string;
  submissionId: string;
  kind: PersistedIntakeKind;
  status: IntakeReviewStatus;
  locale: "en" | "fr";
  createdAt: string;
  updatedAt: string;
  assignedReviewerId?: string;
  categories: readonly string[];
  attachmentCount: number;
}>;

export type IntakeReviewUpdate = Readonly<{
  status: IntakeReviewStatus;
  assignedReviewerId?: string;
  note?: string;
}>;

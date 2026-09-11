import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { UMOJA_ROLES, type UmojaRole } from "@/lib/auth/policy";

export const invitationInputSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    locale: z.enum(["en", "fr"]),
    intendedRole: z.enum(UMOJA_ROLES).nullable(),
    membershipTier: z.enum(["applicant", "extended"]),
    membershipStatus: z.enum(["pending", "active"]),
  })
  .superRefine((value, context) => {
    if (value.intendedRole === "admin" || value.intendedRole === "core") {
      context.addIssue({ code: "custom", path: ["intendedRole"], message: "governance-role" });
    }
    if (value.membershipTier === "applicant" && value.intendedRole !== null) {
      context.addIssue({ code: "custom", path: ["intendedRole"], message: "applicant-role" });
    }
  });

export type InvitationInput = z.infer<typeof invitationInputSchema>;

export function invitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, digest: invitationTokenDigest(token) };
}

export function invitationTokenDigest(token: string) {
  const parsed = z
    .string()
    .regex(/^[A-Za-z0-9_-]{43}$/)
    .parse(token);
  return createHash("sha256").update(parsed, "utf8").digest("hex");
}

export function invitationAuditDigest(...parts: readonly string[]) {
  return createHash("sha256")
    .update(`umoja:account-invitation:v1\0${parts.join("\0")}`, "utf8")
    .digest("hex");
}

export type InvitationLifecycle = "pending" | "expired" | "accepted" | "revoked";

export function invitationLifecycle(
  value: {
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
  },
  now = new Date(),
): InvitationLifecycle {
  if (value.accepted_at) return "accepted";
  if (value.revoked_at) return "revoked";
  return new Date(value.expires_at) <= now ? "expired" : "pending";
}

export function permittedInvitationRole(value: string | null): UmojaRole | null {
  if (value === null) return null;
  const role = z.enum(UMOJA_ROLES).parse(value);
  if (role === "admin" || role === "core") throw new Error("governance-role");
  return role;
}

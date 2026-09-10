import "server-only";

import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { accountInvitationEmail } from "@/lib/email/invitation-template";
import { createTransactionalEmailClient } from "@/lib/email/client";
import {
  createIntakeBlindIndex,
  createIntakeEncryptionKeyringFromEnvironment,
  decryptIntakeValue,
  encryptIntakeValue,
} from "@/lib/intake/encryption";
import { logError } from "@/lib/observability/structured-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSupabasePostAuthenticationContinuation,
  requireSupabaseWorkspaceCapability,
  supabasePasswordSchema,
} from "@/lib/supabase/auth";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInvitationAcrossBoundaries } from "./acceptance";
import {
  clearInvitationContext,
  invitationContextFromRequest,
  parseInvitationContext,
  UMOJA_INVITATION_COOKIE,
} from "./context";
import {
  invitationAuditDigest,
  invitationInputSchema,
  invitationLifecycle,
  invitationToken,
} from "./core";

type InvitationRow = {
  id: string;
  email_lookup: string;
  encrypted_email: string;
  encryption_key_version: string;
  locale: string;
  intended_role: string | null;
  intended_membership_tier: string;
  intended_membership_status: string;
  invited_by: string;
  token_digest: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
  revoked_at: string | null;
  last_sent_at: string | null;
  resend_count: number;
  delivery_state: "pending" | "sent" | "failed" | "suppressed";
  delivery_provider: "log" | "brevo" | null;
  created_at: string;
};

const PASSWORD_INPUT = z
  .object({ password: supabasePasswordSchema, confirmation: z.string().max(256) })
  .refine((v) => v.password === v.confirmation);
const EXPIRY_MILLISECONDS = 24 * 60 * 60 * 1000;
const emailContext = (lookup: string) => `account-invitation:${lookup}:email`;

function emailLookup(email: string) {
  return createIntakeBlindIndex(
    email,
    "account-invitation:email",
    createIntakeEncryptionKeyringFromEnvironment(process.env),
  );
}

function decryptEmail(row: Pick<InvitationRow, "email_lookup" | "encrypted_email">) {
  return decryptIntakeValue(
    row.encrypted_email,
    emailContext(row.email_lookup),
    createIntakeEncryptionKeyringFromEnvironment(process.env),
  );
}

function acceptanceUrl(locale: "en" | "fr", token: string) {
  const url = new URL("/api/supabase-auth/invite/exchange", getSupabaseEnvironment().APP_URL);
  url.searchParams.set("locale", locale);
  url.searchParams.set("token", token);
  return url.toString();
}

async function recordDelivery(
  id: string,
  provider: "log" | "brevo",
  state: "sent" | "failed" | "suppressed",
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("record_account_invitation_delivery", {
    p_invitation_id: id,
    p_delivery_state: state,
    p_delivery_provider: provider,
    p_after_digest: invitationAuditDigest(id, "delivery", state, provider),
  });
  if (error) throw new Error("invitation-delivery-state-unavailable");
}

async function deliver(row: InvitationRow, token: string) {
  const locale = row.locale === "fr" ? "fr" : "en";
  const email = decryptEmail(row);
  const template = accountInvitationEmail(locale, acceptanceUrl(locale, token));
  const client = createTransactionalEmailClient();
  try {
    const receipt = await client.send({
      to: email,
      ...template,
      purpose: "account-invitation",
      locale,
    });
    await recordDelivery(
      row.id,
      receipt.provider,
      receipt.provider === "log" ? "suppressed" : "sent",
    );
  } catch {
    const provider = process.env.UMOJA_EMAIL_PROVIDER === "brevo" ? "brevo" : "log";
    await recordDelivery(row.id, provider, "failed").catch(() => undefined);
    throw new Error("invitation-delivery-unavailable");
  }
}

export async function issueUmojaInvitation(value: unknown) {
  const input = invitationInputSchema.parse(value);
  await requireSupabaseWorkspaceCapability("admin.operations", input.locale);
  const admin = createSupabaseAdminClient();
  for (let page = 1; page <= 10; page += 1) {
    const users = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (users.error) throw new Error("invitation-account-check-unavailable");
    if (users.data.users.some((user) => user.email?.trim().toLowerCase() === input.email)) {
      throw new Error("invitation-account-exists-use-recovery");
    }
    if (users.data.users.length < 1000) break;
    if (page === 10) throw new Error("invitation-account-check-unavailable");
  }
  const keyring = createIntakeEncryptionKeyringFromEnvironment(process.env);
  const lookup = emailLookup(input.email);
  const encryptedEmail = encryptIntakeValue(input.email, emailContext(lookup), keyring);
  const createdToken = invitationToken();
  const expiresAt = new Date(Date.now() + EXPIRY_MILLISECONDS).toISOString();
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("create_account_invitation", {
    p_email_lookup: lookup,
    p_encrypted_email: encryptedEmail,
    p_encryption_key_version: keyring.activeVersion,
    p_locale: input.locale,
    p_intended_role: input.intendedRole,
    p_intended_membership_tier: input.membershipTier,
    p_intended_membership_status: input.membershipStatus,
    p_token_digest: createdToken.digest,
    p_expires_at: expiresAt,
    p_after_digest: invitationAuditDigest(
      lookup,
      input.locale,
      input.membershipTier,
      input.membershipStatus,
      input.intendedRole ?? "applicant",
    ),
  });
  if (error || !data) throw new Error("invitation-create-unavailable");
  await deliver(data as unknown as InvitationRow, createdToken.token);
  return { id: (data as unknown as InvitationRow).id };
}

export async function resendUmojaInvitation(id: string, locale: "en" | "fr") {
  await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const invitationId = z.uuid().parse(id);
  const token = invitationToken();
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("prepare_account_invitation_resend", {
    p_invitation_id: invitationId,
    p_token_digest: token.digest,
    p_expires_at: new Date(Date.now() + EXPIRY_MILLISECONDS).toISOString(),
    p_after_digest: invitationAuditDigest(invitationId, "resend"),
  });
  if (error || !data) throw new Error("invitation-resend-unavailable");
  await deliver(data as unknown as InvitationRow, token.token);
}

export async function revokeUmojaInvitation(id: string, locale: "en" | "fr") {
  await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const invitationId = z.uuid().parse(id);
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("revoke_account_invitation", {
    p_invitation_id: invitationId,
    p_after_digest: invitationAuditDigest(invitationId, "revoke"),
  });
  if (error) throw new Error("invitation-revoke-unavailable");
}

export async function listUmojaInvitations(locale: "en" | "fr") {
  await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("account_invitations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("invitation-list-unavailable");
  return ((data ?? []) as unknown as InvitationRow[]).map((row) => ({
    id: row.id,
    email: decryptEmail(row),
    locale: row.locale,
    intended_role: row.intended_role,
    intended_membership_tier: row.intended_membership_tier,
    intended_membership_status: row.intended_membership_status,
    expires_at: row.expires_at,
    delivery_state: row.delivery_state,
    resend_count: row.resend_count,
    lifecycle: invitationLifecycle(row),
  }));
}

async function invitationByContext(context: { id: string; digest: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("account_invitations")
    .select("*")
    .eq("id", context.id)
    .eq("token_digest", context.digest)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as InvitationRow;
  return invitationLifecycle(row) === "pending" ? row : null;
}

export async function validateRawInvitationToken(token: string) {
  const { invitationTokenDigest } = await import("./core");
  const digest = invitationTokenDigest(token);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("account_invitations")
    .select("*")
    .eq("token_digest", digest)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as InvitationRow;
  return invitationLifecycle(row) === "pending" ? { row, digest } : null;
}

export async function hasValidUmojaInvitation() {
  const value = (await cookies()).get(UMOJA_INVITATION_COOKIE)?.value;
  const context = parseInvitationContext(value);
  if (!context) return false;
  return Boolean(await invitationByContext(context));
}

export async function completeUmojaInvitation(
  request: Request,
  response: NextResponse,
  input: unknown,
) {
  const context = invitationContextFromRequest(request);
  if (!context) return null;
  const invitation = await invitationByContext(context);
  if (!invitation) throw new Error("invitation-unavailable");
  const values = PASSWORD_INPUT.parse(input);
  const email = decryptEmail(invitation);
  const admin = createSupabaseAdminClient();
  await acceptInvitationAcrossBoundaries({
    email,
    expectedEmailLookup: invitation.email_lookup,
    password: values.password,
    createEmailLookup: emailLookup,
    async createAuthUser(credentials) {
      const created = await admin.auth.admin.createUser({
        ...credentials,
        email_confirm: true,
        user_metadata: {
          umoja_invite_locale: invitation.locale,
          umoja_invite_source: "application",
        },
      });
      if (created.error || !created.data.user) throw new Error("invitation-account-unavailable");
      return { id: created.data.user.id, email: created.data.user.email ?? null };
    },
    async acceptDatabase(userId) {
      const accepted = await admin.rpc("accept_account_invitation", {
        p_invitation_id: invitation.id,
        p_token_digest: context.digest,
        p_user_id: userId,
        p_after_digest: invitationAuditDigest(invitation.id, userId, "accepted"),
      });
      if (accepted.error) throw new Error("invitation-database-unavailable");
    },
    async deleteAuthUser(userId) {
      const cleanup = await admin.auth.admin.deleteUser(userId);
      if (cleanup.error) throw new Error("invitation-compensation-unavailable");
    },
    onCompensationFailure(userId) {
      logError("invitation-auth-compensation-failed", {
        invitationId: invitation.id,
        userId,
      });
    },
  });
  const client = createSupabaseRouteClient(request, response);
  const session = await client.auth.signInWithPassword({ email, password: values.password });
  clearInvitationContext(response);
  if (session.error || !session.data.user) return `/${invitation.locale}/sign-in?account=created`;
  return getSupabasePostAuthenticationContinuation(
    client,
    session.data.user,
    invitation.locale === "fr" ? "fr" : "en",
  );
}

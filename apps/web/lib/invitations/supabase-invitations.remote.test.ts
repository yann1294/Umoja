import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../../../supabase/database.types";
import {
  createIntakeBlindIndex,
  createIntakeEncryptionKeyringFromEnvironment,
  encryptIntakeValue,
} from "@/lib/intake/encryption";

const enabled = process.env.SUPABASE_INVITATION_REMOTE_TESTS === "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "test";
const secret = process.env.SUPABASE_SECRET_KEY ?? "test";
const suite = enabled ? describe.sequential : describe.skip;
const password = `Umoja-${randomUUID()}-aA9`;
const ids: string[] = [];
const invitationIds: string[] = [];
let service: SupabaseClient<Database>;
let operator: SupabaseClient<Database>;
let operatorId = "";

function token() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, digest: createHash("sha256").update(raw).digest("hex") };
}

function audit(...parts: string[]) {
  return createHash("sha256").update(parts.join("\0")).digest("hex");
}

async function authUser(label: string) {
  const result = await service.auth.admin.createUser({
    email: `invitation-${label}-${randomUUID()}@example.test`,
    password,
    email_confirm: true,
  });
  if (result.error || !result.data.user?.email) throw result.error ?? new Error("fixture-user");
  ids.push(result.data.user.id);
  return result.data.user;
}

async function createInvitation(options: {
  email: string;
  locale?: "en" | "fr";
  role?: "extended" | null;
  tier?: "applicant" | "extended" | "core";
  status?: "pending" | "active";
}) {
  const keyring = createIntakeEncryptionKeyringFromEnvironment(process.env);
  const normalized = options.email.toLowerCase();
  const lookup = createIntakeBlindIndex(normalized, "account-invitation:email", keyring);
  const createdToken = token();
  const result = await operator.rpc("create_account_invitation", {
    p_email_lookup: lookup,
    p_encrypted_email: encryptIntakeValue(
      normalized,
      `account-invitation:${lookup}:email`,
      keyring,
    ),
    p_encryption_key_version: keyring.activeVersion,
    p_locale: options.locale ?? "en",
    p_intended_role: options.role ?? null,
    p_intended_membership_tier: options.tier ?? "applicant",
    p_intended_membership_status: options.status ?? "pending",
    p_token_digest: createdToken.digest,
    p_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    p_after_digest: audit(lookup, "created"),
  });
  if (result.data?.id) invitationIds.push(result.data.id);
  return { ...result, token: createdToken, lookup };
}

suite("remote account invitation lifecycle", () => {
  beforeAll(async () => {
    service = createClient<Database>(url, secret, { auth: { persistSession: false } });
    const admin = await authUser("operator");
    operatorId = admin.id;
    await service.from("user_roles").insert({ user_id: admin.id, role: "admin" });
    await service
      .from("membership_history")
      .insert({ user_id: admin.id, tier: "applicant", effective_from: new Date().toISOString() });
    operator = createClient<Database>(url, publishable, { auth: { persistSession: false } });
    const session = await operator.auth.signInWithPassword({ email: admin.email!, password });
    if (session.error) throw session.error;
  });

  afterAll(async () => {
    if (!enabled || !service) return;
    if (invitationIds.length) {
      await service.from("audit_logs").delete().in("target_id", invitationIds);
      await service.from("account_invitations").delete().in("id", invitationIds);
    }
    for (const id of ids.reverse()) await service.auth.admin.deleteUser(id);
  });

  it("creates, lists, rotates, rate-limits and revokes a digest-only invitation", async () => {
    const recipient = await authUser("resend-target");
    const created = await createInvitation({ email: recipient.email!, locale: "fr" });
    expect(created.error).toBeNull();
    expect(created.data?.encrypted_email).not.toContain(recipient.email!);
    expect(created.data?.token_digest).toBe(created.token.digest);

    const delivery = await service.rpc("record_account_invitation_delivery", {
      p_invitation_id: created.data!.id,
      p_delivery_state: "sent",
      p_delivery_provider: "brevo",
      p_after_digest: audit(created.data!.id, "sent"),
    });
    expect(delivery.error).toBeNull();
    const blocked = await operator.rpc("prepare_account_invitation_resend", {
      p_invitation_id: created.data!.id,
      p_token_digest: token().digest,
      p_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      p_after_digest: audit(created.data!.id, "blocked-resend"),
    });
    expect(blocked.error).not.toBeNull();
    await service
      .from("account_invitations")
      .update({ last_sent_at: new Date(Date.now() - 360_000).toISOString() })
      .eq("id", created.data!.id);
    const replacement = token();
    const resent = await operator.rpc("prepare_account_invitation_resend", {
      p_invitation_id: created.data!.id,
      p_token_digest: replacement.digest,
      p_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      p_after_digest: audit(created.data!.id, "resent"),
    });
    expect(resent.error).toBeNull();
    expect(resent.data?.token_digest).toBe(replacement.digest);
    const revoked = await operator.rpc("revoke_account_invitation", {
      p_invitation_id: created.data!.id,
      p_after_digest: audit(created.data!.id, "revoked"),
    });
    expect(revoked.error).toBeNull();
    expect(revoked.data?.revoked_at).not.toBeNull();
  });

  it("atomically accepts once and assigns Extended without Core promotion", async () => {
    const recipient = await authUser("accepted-target");
    const created = await createInvitation({
      email: recipient.email!,
      role: "extended",
      tier: "extended",
      status: "active",
    });
    const accepted = await service.rpc("accept_account_invitation", {
      p_invitation_id: created.data!.id,
      p_token_digest: created.token.digest,
      p_user_id: recipient.id,
      p_after_digest: audit(created.data!.id, recipient.id, "accepted"),
    });
    expect(accepted.error).toBeNull();
    const [roles, memberships] = await Promise.all([
      service.from("user_roles").select("role").eq("user_id", recipient.id).is("revoked_at", null),
      service
        .from("membership_history")
        .select("tier")
        .eq("user_id", recipient.id)
        .is("effective_to", null),
    ]);
    expect(roles.data).toEqual([{ role: "extended" }]);
    expect(memberships.data).toEqual([{ tier: "extended" }]);
    const replay = await service.rpc("accept_account_invitation", {
      p_invitation_id: created.data!.id,
      p_token_digest: created.token.digest,
      p_user_id: recipient.id,
      p_after_digest: audit(created.data!.id, "replay"),
    });
    expect(replay.error).not.toBeNull();
  });

  it("rejects Core intent, expiry and disabled targets", async () => {
    const governance = await createInvitation({
      email: `core-${randomUUID()}@example.test`,
      tier: "core",
    });
    expect(governance.error).not.toBeNull();
    const expiredTarget = await authUser("expired-target");
    const expired = await createInvitation({ email: expiredTarget.email! });
    await service
      .from("account_invitations")
      .update({
        created_at: new Date(Date.now() - 172_800_000).toISOString(),
        expires_at: new Date(Date.now() - 86_400_000).toISOString(),
      })
      .eq("id", expired.data!.id);
    const expiredAcceptance = await service.rpc("accept_account_invitation", {
      p_invitation_id: expired.data!.id,
      p_token_digest: expired.token.digest,
      p_user_id: expiredTarget.id,
      p_after_digest: audit(expired.data!.id, "expired"),
    });
    expect(expiredAcceptance.error).not.toBeNull();

    const disabledTarget = await authUser("disabled-target");
    const disabled = await createInvitation({ email: disabledTarget.email! });
    await service.auth.admin.updateUserById(disabledTarget.id, { ban_duration: "876000h" });
    const disabledAcceptance = await service.rpc("accept_account_invitation", {
      p_invitation_id: disabled.data!.id,
      p_token_digest: disabled.token.digest,
      p_user_id: disabledTarget.id,
      p_after_digest: audit(disabled.data!.id, "disabled"),
    });
    expect(disabledAcceptance.error).not.toBeNull();
  });

  it("does not expose invitation rows to an unrelated authenticated account", async () => {
    const unrelated = await authUser("unrelated");
    const client = createClient<Database>(url, publishable, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: unrelated.email!, password });
    const result = await client.from("account_invitations").select("id");
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(operatorId).not.toBe("");
  });
});

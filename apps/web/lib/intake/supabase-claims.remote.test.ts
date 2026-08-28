import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProjectIntake, TalentIntake } from "@umoja/validation";
import type { ServerPrincipal } from "@/lib/auth/principal";
import type { Database } from "../../../../supabase/database.types";
import { createIntakeBlindIndex, createIntakeEncryptionKeyringFromEnvironment } from "./encryption";
import { IntakeRepositoryAccessError } from "./repository";
import { SupabaseIntakeClaimBoundary } from "./supabase-claims";
import { SupabaseEncryptedIntakeRepository } from "./supabase-repository";

const enabled = process.env.RUN_SUPABASE_REMOTE_INTAKE === "1";
const remote = describe.runIf(enabled);

function environment() {
  const file = Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator),
          line
            .slice(separator + 1)
            .trim()
            .replace(/^("|')|("|')$/g, ""),
        ];
      }),
  );
  return { ...process.env, ...file };
}

const env = enabled ? environment() : process.env;
const service = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1",
  env.SUPABASE_SECRET_KEY ?? "test",
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const publicClient = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1",
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "test",
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const keyring = enabled ? createIntakeEncryptionKeyringFromEnvironment(env) : (null as never);
const marker = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const users: User[] = [];
const intakeIds: string[] = [];
const claimIds: string[] = [];
let admin: User;
let intended: User;
let other: User;
let disabled: User;
let projectOne = "";
let projectTwo = "";
let talentOne = "";
let boundary: SupabaseIntakeClaimBoundary;

const project = (suffix: string): ProjectIntake => ({
  contact: {
    preferredName: `Synthetic-${marker}`,
    email: `${suffix}-${marker}@example.test`,
    phone: "+254700000000",
  },
  organization: { name: `Synthetic-${marker}`, country: "Kenya", website: "" },
  need: {
    title: `Synthetic-${marker}`,
    description: `Synthetic private description ${marker} with sufficient validation length.`,
    serviceAreas: ["Engineering"],
  },
  budgetBand: "Synthetic",
  timing: { desiredStart: "Soon", targetDate: "2027-01-01" },
  attachments: [],
  projectConsent: true,
});
const talent: TalentIntake = {
  preferredName: `Synthetic-${marker}`,
  privateContact: { email: `talent-${marker}@example.test`, phone: "+233200000000" },
  country: "Ghana",
  timezone: "Africa/Accra",
  skillAreas: ["Engineering"],
  experienceBand: "Senior",
  portfolioItems: [],
  availability: { weeklyCapacity: "20", nextAvailableDate: "2027-01-01", workMode: "Remote" },
  languages: ["English"],
  publicProfileConsent: false,
  applicationConsent: true,
  dataProcessingConsent: true,
};

async function createUser(label: string) {
  const result = await service.auth.admin.createUser({
    email: `claim-${label}-${marker}@example.test`,
    email_confirm: true,
    password,
  });
  if (result.error || !result.data.user)
    throw new Error(`claim-setup-user:${result.error?.status}`);
  users.push(result.data.user);
  return result.data.user;
}

async function createAnonymousIntakes() {
  const repository = new SupabaseEncryptedIntakeRepository(service, keyring, null, true);
  for (const [suffix, value] of [
    ["one", project("one")],
    ["two", project("two")],
  ] as const) {
    const submissionId = randomUUID();
    const result = await repository.createProject(
      {
        claimedAt: new Date().toISOString(),
        keyHash: createIntakeBlindIndex(value.contact.email, "intake:project:idempotency", keyring),
        payload: value,
        policyVersion: "2026-08",
        submissionId,
      },
      "en",
    );
    if (result.status !== "created") throw new Error("claim-setup-project");
    intakeIds.push(result.row.id);
    if (suffix === "one") projectOne = result.row.id;
    else projectTwo = result.row.id;
  }
  const talentResult = await repository.createTalent(
    {
      claimedAt: new Date().toISOString(),
      keyHash: createIntakeBlindIndex(
        talent.privateContact.email,
        "intake:talent:idempotency",
        keyring,
      ),
      payload: talent,
      policyVersion: "2026-08",
      submissionId: randomUUID(),
    },
    "fr",
  );
  if (talentResult.status !== "created") throw new Error("claim-setup-talent");
  talentOne = talentResult.row.id;
  intakeIds.push(talentOne);
}

async function cleanup() {
  if (claimIds.length) {
    await service.from("audit_logs").delete().in("target_id", claimIds);
    await service.from("intake_claim_capabilities").delete().in("id", claimIds);
  }
  if (intakeIds.length) {
    await service.from("audit_logs").delete().in("target_id", intakeIds);
    await service.from("project_intakes").delete().in("id", intakeIds);
    await service.from("talent_intakes").delete().in("id", intakeIds);
  }
  for (const user of users) {
    await service.from("user_roles").delete().eq("user_id", user.id);
    await service.from("membership_history").delete().eq("user_id", user.id);
    await service.auth.admin.deleteUser(user.id);
  }
}

remote("dormant Supabase intake claim boundary", () => {
  beforeAll(async () => {
    try {
      admin = await createUser("admin");
      intended = await createUser("intended");
      other = await createUser("other");
      disabled = await createUser("disabled");
      const role = await service.from("user_roles").insert({ role: "admin", user_id: admin.id });
      if (role.error) throw new Error(`claim-setup-role:${role.error.code}`);
      const membership = await service.from("membership_history").insert({
        effective_from: new Date().toISOString(),
        tier: "core",
        user_id: admin.id,
      });
      if (membership.error) throw new Error(`claim-setup-membership:${membership.error.code}`);
      const principal: ServerPrincipal = {
        actorId: admin.id,
        email: admin.email ?? "",
        emailVerified: true,
        membershipActive: true,
        mfaVerified: false,
        roles: ["admin"],
      };
      boundary = new SupabaseIntakeClaimBoundary(service, principal);
      await createAnonymousIntakes();
    } catch (error) {
      await cleanup();
      throw error;
    }
  }, 120_000);

  afterAll(cleanup, 120_000);

  it("denies browser execution and fails closed across kind, submission and user bindings", async () => {
    const capability = await boundary.issue("project", projectOne, intended.id);
    claimIds.push(capability.claimId);
    const direct = await publicClient.rpc("consume_intake_claim", {
      p_actor_id: intended.id,
      p_after_digest: "0".repeat(64),
      p_claim_id: capability.claimId,
      p_intake_id: projectOne,
      p_kind: "project",
      p_token_digest: "0".repeat(64),
    });
    expect(direct.error).not.toBeNull();
    for (const attempt of [
      { actor: other.id, kind: "project" as const, intakeId: projectOne, token: capability.token },
      {
        actor: intended.id,
        kind: "project" as const,
        intakeId: projectTwo,
        token: capability.token,
      },
      { actor: intended.id, kind: "talent" as const, intakeId: talentOne, token: capability.token },
      {
        actor: intended.id,
        kind: "project" as const,
        intakeId: projectOne,
        token: `${capability.token}x`,
      },
    ])
      await expect(
        boundary.consume(attempt.token, attempt.kind, attempt.intakeId, {
          disabled: false,
          emailVerified: true,
          id: attempt.actor,
        }),
      ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
  });

  it("revokes replaced and explicit claims and rejects expired or disabled recipients", async () => {
    const replaced = await boundary.issue("project", projectTwo, intended.id);
    claimIds.push(replaced.claimId);
    const replacement = await boundary.issue("project", projectTwo, intended.id);
    claimIds.push(replacement.claimId);
    await expect(
      boundary.consume(replaced.token, "project", projectTwo, {
        disabled: false,
        emailVerified: true,
        id: intended.id,
      }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    await boundary.revoke(replacement.claimId);
    await expect(
      boundary.consume(replacement.token, "project", projectTwo, {
        disabled: false,
        emailVerified: true,
        id: intended.id,
      }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);

    const expired = await boundary.issue("talent", talentOne, intended.id);
    claimIds.push(expired.claimId);
    await service
      .from("intake_claim_capabilities")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", expired.claimId);
    await expect(
      boundary.consume(expired.token, "talent", talentOne, {
        disabled: false,
        emailVerified: true,
        id: intended.id,
      }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);

    const disabledCapability = await boundary.issue("project", projectTwo, disabled.id);
    claimIds.push(disabledCapability.claimId);
    await service.auth.admin.updateUserById(disabled.id, { ban_duration: "876000h" });
    await expect(
      boundary.consume(disabledCapability.token, "project", projectTwo, {
        disabled: true,
        emailVerified: true,
        id: disabled.id,
      }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
  });

  it("consumes exactly once and assigns only the bound verified user", async () => {
    const capability = await boundary.issue("project", projectOne, intended.id);
    claimIds.push(capability.claimId);
    await boundary.consume(capability.token, "project", projectOne, {
      disabled: false,
      emailVerified: true,
      id: intended.id,
    });
    await expect(
      boundary.consume(capability.token, "project", projectOne, {
        disabled: false,
        emailVerified: true,
        id: intended.id,
      }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    const row = await service
      .from("project_intakes")
      .select("applicant_id")
      .eq("id", projectOne)
      .single();
    expect(row.data?.applicant_id).toBe(intended.id);
    const audit = await service
      .from("audit_logs")
      .select("action,before_digest,after_digest")
      .eq("target_id", capability.claimId);
    expect(audit.data?.map((value) => value.action)).toEqual([
      "intake.claim.issued",
      "intake.claim.consumed",
    ]);
    expect(JSON.stringify(audit.data)).not.toContain(capability.token);
  });
});

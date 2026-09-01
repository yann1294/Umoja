import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProjectIntake, TalentIntake } from "@umoja/validation";
import type { ServerPrincipal } from "@/lib/auth/principal";
import type { Database } from "../../../../supabase/database.types";
import { createIntakeBlindIndex, createIntakeEncryptionKeyringFromEnvironment } from "./encryption";
import { IntakeRepositoryAccessError } from "./errors";
import { SupabaseApplicantPrivateStorage } from "./supabase-private-files";
import { SupabaseEncryptedIntakeRepository } from "./supabase-repository";

const runRemote = process.env.RUN_SUPABASE_REMOTE_INTAKE === "1";
const remote = describe.runIf(runRemote);

type Role = "admin" | "reviewer" | "cms-editor" | "project-manager" | "core" | "extended";
type SyntheticUser = Readonly<{
  id: string;
  email: string;
  role: Role;
  token: string;
  client: SupabaseClient<Database>;
  principal: ServerPrincipal;
}>;

function loadEnvironment() {
  const values = Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator).trim(),
          line
            .slice(separator + 1)
            .trim()
            .replace(/^("|')|("|')$/g, ""),
        ];
      }),
  );
  return { ...process.env, ...values };
}

const environment = runRemote ? loadEnvironment() : process.env;
const url = environment.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = environment.SUPABASE_SECRET_KEY ?? "";
const keyring = runRemote
  ? createIntakeEncryptionKeyringFromEnvironment(environment)
  : (null as never);
const service = createClient<Database>(url || "http://127.0.0.1", secretKey || "test", {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
    storageKey: `intake-service-${runRemote ? randomUUID() : "disabled"}`,
  },
});
const anonymous = createClient<Database>(url || "http://127.0.0.1", publishableKey || "test", {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
    storageKey: `intake-anon-${runRemote ? randomUUID() : "disabled"}`,
  },
});

const run = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const users: SyntheticUser[] = [];
const intakeIds: string[] = [];
const fileIds: string[] = [];
const storagePaths: string[] = [];
let owner: SyntheticUser;
let reviewer: SyntheticUser;
let admin: SyntheticUser;
let unrelated: SyntheticUser;
let disabled: SyntheticUser;
let removed: SyntheticUser;
let cmsEditor: SyntheticUser;
let projectManager: SyntheticUser;
let projectId = "";
let talentId = "";
let projectSubmissionId = "";
let talentSubmissionId = "";

const project: ProjectIntake = {
  contact: {
    preferredName: `Synthetic-${run}`,
    email: `project-${run}@example.test`,
    phone: "+254700000000",
  },
  organization: {
    name: `Synthetic-${run}`,
    country: "Kenya",
    website: "https://example.test/",
  },
  need: {
    title: `Synthetic-${run}`,
    description: `Synthetic confidential narrative ${run} with enough detail for validation.`,
    serviceAreas: ["Product engineering"],
  },
  budgetBand: "Synthetic private band",
  timing: { desiredStart: "Soon", targetDate: "2027-01-01" },
  attachments: [],
  projectConsent: true,
};
const talent: TalentIntake = {
  preferredName: `Synthetic-${run}`,
  privateContact: { email: `talent-${run}@example.test`, phone: "+233200000000" },
  country: "Ghana",
  timezone: "Africa/Accra",
  skillAreas: ["Engineering"],
  experienceBand: "Senior",
  portfolioItems: [{ title: `Synthetic-${run}`, url: "https://example.test/work" }],
  availability: {
    weeklyCapacity: "20 hours",
    nextAvailableDate: "2027-02-01",
    workMode: "Remote",
  },
  languages: ["English", "French"],
  publicProfileConsent: false,
  applicationConsent: true,
  dataProcessingConsent: true,
};

function actor(user: SyntheticUser | null, operation: "upload" | "download" | "delete") {
  return async (request: Readonly<{ applicantId: string | null; operation: string }>) => {
    if (!user || request.operation !== operation) return false;
    if (operation === "delete") return user.role === "admin";
    return request.applicantId === user.id || user.role === "reviewer" || user.role === "admin";
  };
}

async function createUser(role: Role, membership: "applicant" | "core" = "core") {
  const email = `intake-${role}-${run}-${users.length}@example.test`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw new Error(`setup:user:${created.error?.status}`);
  const id = created.data.user.id;
  const roleResult = await service.from("user_roles").insert({ role, user_id: id });
  if (roleResult.error) throw new Error(`setup:role:${roleResult.error.code}`);
  const membershipResult = await service.from("membership_history").insert({
    effective_from: new Date().toISOString(),
    tier: membership,
    user_id: id,
  });
  if (membershipResult.error) throw new Error(`setup:membership:${membershipResult.error.code}`);
  const authenticationClient = createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
      storageKey: `intake-sign-in-${randomUUID()}`,
    },
  });
  const signed = await authenticationClient.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session)
    throw new Error(`setup:session:${signed.error?.status}`);
  const token = signed.data.session.access_token;
  const client = createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
      storageKey: `intake-user-${randomUUID()}`,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const principal: ServerPrincipal = {
    actorId: id,
    email,
    emailVerified: true,
    membershipActive: true,
    mfaVerified: false,
    roles: [role],
  };
  const value = { id, email, role, token, client, principal };
  users.push(value);
  return value;
}

async function cleanup() {
  for (const path of storagePaths) await service.storage.from("applicant-private").remove([path]);
  if (fileIds.length) await service.from("intake_files").delete().in("id", fileIds);
  if (intakeIds.length) {
    await service
      .from("audit_logs")
      .delete()
      .in("target_id", [...intakeIds, ...fileIds]);
    await service.from("project_intakes").delete().in("id", intakeIds);
    await service.from("talent_intakes").delete().in("id", intakeIds);
  }
  for (const user of users) {
    await service.from("user_roles").delete().eq("user_id", user.id);
    await service.from("membership_history").delete().eq("user_id", user.id);
    await service.auth.admin.deleteUser(user.id);
  }
}

async function verifyCleanup() {
  const userIds = users.map((user) => user.id);
  const targets = [...intakeIds, ...fileIds];
  if (fileIds.length)
    expect((await service.from("intake_files").select("id").in("id", fileIds)).data ?? []).toEqual(
      [],
    );
  if (intakeIds.length) {
    expect(
      (await service.from("project_intakes").select("id").in("id", intakeIds)).data ?? [],
    ).toEqual([]);
    expect(
      (await service.from("talent_intakes").select("id").in("id", intakeIds)).data ?? [],
    ).toEqual([]);
  }
  if (targets.length)
    expect(
      (await service.from("audit_logs").select("id").in("target_id", targets)).data ?? [],
    ).toEqual([]);
  if (userIds.length) {
    expect(
      (await service.from("user_roles").select("user_id").in("user_id", userIds)).data ?? [],
    ).toEqual([]);
    expect(
      (await service.from("membership_history").select("user_id").in("user_id", userIds)).data ??
        [],
    ).toEqual([]);
  }
  for (const objectPath of storagePaths)
    expect((await service.storage.from("applicant-private").download(objectPath)).data).toBeNull();
}

remote("Supabase encrypted intake and applicant-private authorization", () => {
  beforeAll(async () => {
    try {
      owner = await createUser("extended", "applicant");
      reviewer = await createUser("reviewer");
      admin = await createUser("admin");
      unrelated = await createUser("core");
      disabled = await createUser("reviewer");
      removed = await createUser("reviewer");
      cmsEditor = await createUser("cms-editor");
      projectManager = await createUser("project-manager");
      const endMembership = await service
        .from("membership_history")
        .update({ effective_to: new Date().toISOString() })
        .eq("user_id", removed.id);
      if (endMembership.error) throw new Error(`setup:membership-end:${endMembership.error.code}`);
      const repository = new SupabaseEncryptedIntakeRepository(service, keyring, null, true);
      projectSubmissionId = randomUUID();
      talentSubmissionId = randomUUID();
      const projectKey = createIntakeBlindIndex(
        project.contact.email,
        "intake:project:idempotency",
        keyring,
      );
      const projectResult = await repository.createProject(
        {
          claimedAt: new Date().toISOString(),
          keyHash: projectKey,
          ownerUserId: owner.id,
          payload: project,
          policyVersion: "2026-08",
          submissionId: projectSubmissionId,
        },
        "en",
      );
      if (projectResult.status !== "created") throw new Error("setup:project-duplicate");
      projectId = projectResult.row.id;
      intakeIds.push(projectId);
      const talentResult = await repository.createTalent(
        {
          claimedAt: new Date().toISOString(),
          keyHash: createIntakeBlindIndex(
            talent.privateContact.email,
            "intake:talent:idempotency",
            keyring,
          ),
          ownerUserId: owner.id,
          payload: talent,
          policyVersion: "2026-08",
          submissionId: talentSubmissionId,
        },
        "fr",
      );
      if (talentResult.status !== "created") throw new Error("setup:talent-duplicate");
      talentId = talentResult.row.id;
      intakeIds.push(talentId);
      const disabledResult = await service.auth.admin.updateUserById(disabled.id, {
        ban_duration: "876000h",
      });
      if (disabledResult.error) throw new Error(`setup:disable:${disabledResult.error.status}`);
    } catch (error) {
      await cleanup();
      throw error;
    }
  }, 120_000);

  afterAll(async () => {
    await cleanup();
    await verifyCleanup();
  }, 120_000);

  it("keeps plaintext out of rows, enforces ownership, and preserves idempotency", async () => {
    const stored = await service.from("project_intakes").select("*").eq("id", projectId).single();
    expect(stored.error).toBeNull();
    const serialized = JSON.stringify(stored.data);
    for (const value of [
      project.contact.email,
      project.contact.preferredName,
      project.organization.name,
      project.need.description,
    ])
      expect(serialized).not.toContain(value);
    expect(stored.data?.encrypted_payload).toMatch(/^v1\./);
    expect(stored.data?.email_lookup).toMatch(/^v1\./);
    expect(stored.data).toMatchObject({
      applicant_id: null,
      consent_at: expect.any(String),
      policy_version: "2026-08",
    });

    const ownerRead = await owner.client.from("project_intakes").select("id").eq("id", projectId);
    expect(ownerRead.data).toEqual([]);
    const unrelatedRead = await unrelated.client
      .from("project_intakes")
      .select("id")
      .eq("id", projectId);
    expect(unrelatedRead.data).toEqual([]);
    const anonRead = await anonymous.from("project_intakes").select("id").eq("id", projectId);
    expect(anonRead.data ?? []).toEqual([]);
    const disabledRead = await disabled.client
      .from("project_intakes")
      .select("id")
      .eq("id", projectId);
    expect(disabledRead.data ?? []).toEqual([]);
    for (const denied of [owner, cmsEditor, projectManager, removed]) {
      expect(
        (await denied.client.from("project_intakes").select("id").eq("id", projectId)).data ?? [],
      ).toEqual([]);
    }

    const duplicate = await new SupabaseEncryptedIntakeRepository(
      service,
      keyring,
      null,
      true,
    ).createProject(
      {
        claimedAt: new Date().toISOString(),
        keyHash: stored.data!.idempotency_key_hash,
        ownerUserId: owner.id,
        payload: project,
        policyVersion: "2026-08",
        submissionId: randomUUID(),
      },
      "en",
    );
    expect(duplicate).toEqual({ status: "duplicate" });

    const forbiddenArgs = {
      p_after_digest: "0".repeat(64),
      p_applicant_id: owner.id,
      p_attachment_count: 0,
      p_consent_at: new Date().toISOString(),
      p_email_lookup: stored.data!.email_lookup,
      p_encrypted_payload: stored.data!.encrypted_payload,
      p_encryption_key_version: stored.data!.encryption_key_version,
      p_idempotency_key_hash: createIntakeBlindIndex(
        `forbidden-${run}@example.test`,
        "intake:project:idempotency",
        keyring,
      ),
      p_locale: "en",
      p_policy_version: "2026-08",
      p_public_reference: "UP-TESTDENIED01",
      p_service_areas: ["Product engineering"],
      p_submission_id: randomUUID(),
    };
    const anonymousCreate = await anonymous.rpc("create_encrypted_project_intake", forbiddenArgs);
    if (anonymousCreate.data?.id) intakeIds.push(anonymousCreate.data.id);
    expect(anonymousCreate.error).not.toBeNull();
    const ownerCreate = await owner.client.rpc("create_encrypted_project_intake", forbiddenArgs);
    if (ownerCreate.data?.id) intakeIds.push(ownerCreate.data.id);
    expect(ownerCreate.error).not.toBeNull();
  }, 30_000);

  it("authorizes reviewer/admin decryption, lookup and constrained transitions", async () => {
    const reviewerRepository = new SupabaseEncryptedIntakeRepository(
      reviewer.client,
      keyring,
      reviewer.principal,
    );
    const adminRepository = new SupabaseEncryptedIntakeRepository(
      admin.client,
      keyring,
      admin.principal,
    );
    await expect(reviewerRepository.getProject(projectId)).rejects.toBeInstanceOf(
      IntakeRepositoryAccessError,
    );
    await expect(adminRepository.getTalent(talentId)).resolves.toEqual(talent);
    await expect(
      new SupabaseEncryptedIntakeRepository(
        unrelated.client,
        keyring,
        unrelated.principal,
      ).getProject(projectId),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    const exact = await reviewerRepository.findByEmail("project", project.contact.email);
    expect(exact.map((value) => value.id)).toContain(projectId);
    expect(await reviewerRepository.findByEmail("project", "different@example.test")).toEqual([]);

    const triaged = await adminRepository.updateReview("project", projectId, {
      assignedReviewerId: reviewer.id,
      note: `Synthetic note ${run}`,
      status: "triage",
    });
    expect(triaged).toMatchObject({ assignedReviewerId: reviewer.id, status: "triage" });
    await expect(reviewerRepository.getProject(projectId)).resolves.toEqual(project);
    await expect(
      new SupabaseEncryptedIntakeRepository(
        unrelated.client,
        keyring,
        unrelated.principal,
      ).updateReview("project", projectId, { status: "closed" }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    await expect(
      reviewerRepository.updateReview("project", projectId, {
        assignedReviewerId: reviewer.id,
        status: "accepted",
      }),
    ).rejects.toBeTruthy();
    await expect(
      adminRepository.updateReview("talent", talentId, {
        assignedReviewerId: disabled.id,
        status: "triage",
      }),
    ).rejects.toBeTruthy();

    const audits = await admin.client
      .from("audit_logs")
      .select("*")
      .eq("target_id", projectId)
      .order("created_at");
    expect(audits.error).toBeNull();
    expect(audits.data?.some((entry) => entry.action === "intake.review.updated")).toBe(true);
    const auditText = JSON.stringify(audits.data);
    expect(auditText).not.toContain(project.contact.email);
    expect(auditText).not.toContain(`Synthetic note ${run}`);
    const reviewerAudits = await reviewer.client
      .from("audit_logs")
      .select("action")
      .eq("target_id", projectId);
    expect(reviewerAudits.error).toBeNull();
    expect(reviewerAudits.data?.length).toBeGreaterThan(0);
    expect(
      (await owner.client.from("audit_logs").select("id").eq("target_id", projectId)).data,
    ).toEqual([]);
    expect(
      (await disabled.client.from("audit_logs").select("id").eq("target_id", projectId)).data ?? [],
    ).toEqual([]);

    const directTransition = await unrelated.client.rpc("update_intake_review", {
      p_after_digest: "0".repeat(64),
      p_assigned_reviewer_id: unrelated.id,
      p_encrypted_internal_notes: null as unknown as string,
      p_intake_id: projectId,
      p_kind: "project",
      p_status: "closed",
    });
    expect(directTransition.error).not.toBeNull();
  }, 30_000);

  it("encrypts applicant files and denies every direct private Storage client", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 1, 2]);
    const trustedUpload = new SupabaseApplicantPrivateStorage(
      service,
      keyring,
      async ({ operation }) => operation === "upload",
    );
    const uploaded = await trustedUpload.upload(
      "project",
      { applicantId: null, id: projectId, submissionId: projectSubmissionId },
      { bytes: pdf, mediaType: "application/pdf", name: `synthetic-${run}.pdf` },
    );
    fileIds.push(uploaded.id);
    const metadata = await service.from("intake_files").select("*").eq("id", uploaded.id).single();
    expect(metadata.error).toBeNull();
    storagePaths.push(metadata.data!.object_path);
    expect(metadata.data!.object_path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.umojaenc$/);
    expect(JSON.stringify(metadata.data)).not.toContain(`synthetic-${run}.pdf`);
    expect(metadata.data?.scan_status).toBe("quarantined");

    const forbiddenRegistration = {
      p_content_digest: metadata.data!.content_digest,
      p_encrypted_metadata: metadata.data!.encrypted_metadata,
      p_encrypted_size: metadata.data!.encrypted_size,
      p_encryption_key_version: metadata.data!.encryption_key_version,
      p_file_id: randomUUID(),
      p_intake_id: projectId,
      p_kind: "project",
      p_media_type: metadata.data!.media_type,
      p_object_path: `${randomUUID()}/${randomUUID()}.umojaenc`,
      p_original_size: metadata.data!.original_size,
    };
    expect(
      (await anonymous.rpc("register_intake_file", forbiddenRegistration)).error,
    ).not.toBeNull();
    expect(
      (await owner.client.rpc("register_intake_file", forbiddenRegistration)).error,
    ).not.toBeNull();
    expect(
      (
        await owner.client.rpc("archive_intake_file", {
          p_after_digest: "0".repeat(64),
          p_file_id: uploaded.id,
        })
      ).error,
    ).not.toBeNull();

    for (const client of [
      anonymous,
      owner.client,
      reviewer.client,
      admin.client,
      disabled.client,
      removed.client,
      cmsEditor.client,
      projectManager.client,
    ]) {
      const listing = await client.storage.from("applicant-private").list();
      expect(listing.data ?? []).toEqual([]);
      const download = await client.storage
        .from("applicant-private")
        .download(metadata.data!.object_path);
      expect(download.data).toBeNull();
      const rows = await client.from("intake_files").select("*").eq("id", uploaded.id);
      expect(rows.data).toBeNull();
      const probePath = `${randomUUID()}/${randomUUID()}.umojaenc`;
      const directUpload = await client.storage
        .from("applicant-private")
        .upload(probePath, new Uint8Array([1, 2, 3]), {
          contentType: "application/octet-stream",
        });
      expect(directUpload.error).not.toBeNull();
      const directUpdate = await client.storage
        .from("applicant-private")
        .update(metadata.data!.object_path, new Uint8Array([4, 5, 6]), {
          contentType: "application/octet-stream",
        });
      expect(directUpdate.error).not.toBeNull();
      await client.storage.from("applicant-private").remove([metadata.data!.object_path]);
      expect(
        (await service.storage.from("applicant-private").download(metadata.data!.object_path))
          .error,
      ).toBeNull();
    }

    await expect(
      new SupabaseApplicantPrivateStorage(service, keyring, actor(reviewer, "download")).download(
        uploaded.id,
      ),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    const syntheticScan = await service
      .from("intake_files")
      .update({ scan_status: "clean", scanned_at: new Date().toISOString() })
      .eq("id", uploaded.id);
    expect(syntheticScan.error).toBeNull();

    for (const allowed of [reviewer, admin]) {
      const boundary = new SupabaseApplicantPrivateStorage(
        service,
        keyring,
        actor(allowed, "download"),
      );
      await expect(boundary.download(uploaded.id)).resolves.toMatchObject({
        bytes: pdf,
        mediaType: "application/pdf",
        name: `synthetic-${run}.pdf`,
      });
    }
    for (const denied of [null, owner, unrelated]) {
      const boundary = new SupabaseApplicantPrivateStorage(
        service,
        keyring,
        actor(denied, "download"),
      );
      await expect(boundary.download(uploaded.id)).rejects.toBeInstanceOf(
        IntakeRepositoryAccessError,
      );
    }
    // A fresh server-principal refresh resolves a banned account to null; stale JWT possession
    // does not become authority at this privileged boundary.
    const disabledBoundary = new SupabaseApplicantPrivateStorage(
      service,
      keyring,
      actor(null, "download"),
    );
    await expect(disabledBoundary.download(uploaded.id)).rejects.toBeInstanceOf(
      IntakeRepositoryAccessError,
    );

    await expect(
      new SupabaseApplicantPrivateStorage(service, keyring, actor(owner, "delete")).remove(
        uploaded.id,
      ),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    await new SupabaseApplicantPrivateStorage(service, keyring, actor(admin, "delete")).remove(
      uploaded.id,
    );
    const archived = await service
      .from("intake_files")
      .select("archived_at")
      .eq("id", uploaded.id)
      .single();
    expect(archived.data?.archived_at).toEqual(expect.any(String));
    expect(
      (await service.storage.from("applicant-private").download(metadata.data!.object_path)).error,
    ).not.toBeNull();
  }, 90_000);

  it("fails closed for MIME/signature mismatch and ciphertext tampering", async () => {
    const boundary = new SupabaseApplicantPrivateStorage(
      service,
      keyring,
      async ({ operation }) => operation === "upload" || operation === "download",
    );
    await expect(
      boundary.upload(
        "talent",
        { applicantId: null, id: talentId, submissionId: talentSubmissionId },
        {
          bytes: new Uint8Array([1, 2, 3, 4]),
          mediaType: "application/pdf",
          name: "invalid.pdf",
        },
      ),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);

    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);
    const uploaded = await boundary.upload(
      "talent",
      { applicantId: null, id: talentId, submissionId: talentSubmissionId },
      { bytes: pdf, mediaType: "application/pdf", name: "synthetic-proof.pdf" },
    );
    fileIds.push(uploaded.id);
    const metadata = await service.from("intake_files").select("*").eq("id", uploaded.id).single();
    storagePaths.push(metadata.data!.object_path);
    await service
      .from("intake_files")
      .update({ scan_status: "clean", scanned_at: new Date().toISOString() })
      .eq("id", uploaded.id);
    const encrypted = await service.storage
      .from("applicant-private")
      .download(metadata.data!.object_path);
    const tampered = new Uint8Array(await encrypted.data!.arrayBuffer());
    tampered[tampered.length - 1] ^= 1;
    const replacement = await service.storage
      .from("applicant-private")
      .update(metadata.data!.object_path, tampered, { contentType: "application/octet-stream" });
    expect(replacement.error).toBeNull();
    await expect(boundary.download(uploaded.id)).rejects.toBeInstanceOf(
      IntakeRepositoryAccessError,
    );

    const talentRow = await service
      .from("talent_intakes")
      .select("encrypted_payload")
      .eq("id", talentId)
      .single();
    const envelope = talentRow.data!.encrypted_payload;
    const envelopeParts = envelope.split(".");
    const modifiedTag = Buffer.from(envelopeParts[2]!, "base64url");
    modifiedTag[0] ^= 1;
    envelopeParts[2] = modifiedTag.toString("base64url");
    const changed = envelopeParts.join(".");
    expect(
      (
        await service
          .from("talent_intakes")
          .update({ encrypted_payload: changed })
          .eq("id", talentId)
      ).error,
    ).toBeNull();
    await expect(
      new SupabaseEncryptedIntakeRepository(admin.client, keyring, admin.principal).getTalent(
        talentId,
      ),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
  }, 30_000);
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(process.cwd(), "../../supabase/migrations/20260910100000_account_invitations.sql"),
  "utf8",
);

describe("account invitation migration contract", () => {
  it("stores encrypted addresses and token digests without plaintext token or email columns", () => {
    expect(migration).toContain("encrypted_email text not null");
    expect(migration).toContain("email_lookup text not null");
    expect(migration).toContain("token_digest text not null unique");
    expect(migration).not.toMatch(/\braw_token\b|\bemail text\b/i);
  });

  it("enforces operations RLS, bounded resend and governance-safe assignments", () => {
    expect(migration).toContain("alter table public.account_invitations enable row level security");
    expect(migration).toContain("private.active_membership(auth.uid())");
    expect(migration).toContain("invitation.resend_count >= 5");
    expect(migration).toContain("interval '5 minutes'");
    expect(migration).toContain("p_intended_membership_tier in ('core', 'lead')");
    expect(migration).toContain("p_intended_role in ('admin', 'core')");
  });

  it("consumes the invitation and creates membership, role and audit state in one database RPC", () => {
    const acceptance = migration.slice(
      migration.indexOf("create function public.accept_account_invitation"),
    );
    expect(acceptance).toContain("for update");
    expect(acceptance).toContain("insert into public.membership_history");
    expect(acceptance).toContain("insert into public.user_roles");
    expect(acceptance).toContain("account.invitation.accepted");
    expect(acceptance).toContain("grant execute on function public.accept_account_invitation");
    expect(acceptance).toContain("to service_role");
  });
});

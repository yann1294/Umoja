import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const rollbackScript = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-audit-rollback.sql"),
  "utf8",
);
const concurrencyScript = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-concurrency.mjs"),
  "utf8",
);
const rollbackFixtureScript = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-rollback-fixture.mjs"),
  "utf8",
);

describe("Prompt 12 diagnostic tooling", () => {
  it("passes psql values to PostgreSQL before entering procedural bodies", () => {
    const dollarQuotedBodies = [...rollbackScript.matchAll(/\$([a-z_]+)\$([\s\S]*?)\$\1\$/g)].map(
      (match) => match[2],
    );
    expect(dollarQuotedBodies.length).toBeGreaterThan(0);
    for (const body of dollarQuotedBodies)
      expect(body).not.toMatch(/(?<!:):(?:'[a-z_][a-z0-9_]*'|[a-z_][a-z0-9_]*)/i);
    expect(rollbackScript).toContain("CREATE TEMP TABLE prompt12_parameters");
  });

  it("asserts exact rollback state before releasing savepoints", () => {
    expect(rollbackScript).not.toMatch(/ROLLBACK TO SAVEPOINT/i);
    expect(rollbackScript).toContain("prompt12_private_before");
    expect(rollbackScript).toContain("prompt12_feedback_before");
    expect(rollbackScript).toContain("prompt12_moderation_audit_before");
    expect(rollbackScript).toContain("sqlstate = 'U1201'");
    expect(rollbackScript.indexOf("$child_assertion$")).toBeLessThan(
      rollbackScript.indexOf("RELEASE SAVEPOINT child_case"),
    );
    expect(rollbackScript.indexOf("$profile_assertion$")).toBeLessThan(
      rollbackScript.indexOf("RELEASE SAVEPOINT profile_case"),
    );
    expect(rollbackScript.indexOf("$moderation_assertion$")).toBeLessThan(
      rollbackScript.indexOf("RELEASE SAVEPOINT moderation_case"),
    );
  });

  it("never logs response bodies and suppresses unsafe cleanup after timeout", () => {
    expect(concurrencyScript).not.toMatch(
      /console\.(?:log|error)\([^\n]*(?:payload|response|body)/,
    );
    expect(concurrencyScript).not.toContain("response.text(");
    expect(concurrencyScript).toContain("cleanupSafe = false");
    expect(concurrencyScript).toContain("intentionally_skipped_database_completion_unknown");
    expect(concurrencyScript).toContain("native_https_dedicated_socket");
    expect(rollbackFixtureScript).not.toContain("access_token:");
    expect(rollbackFixtureScript).toContain("exactSyntheticUsersRemoved");
  });
});

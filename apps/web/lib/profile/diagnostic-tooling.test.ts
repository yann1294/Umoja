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
const concurrencyObserver = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-concurrency-observe.sql"),
  "utf8",
);
const directConcurrencyScript = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-direct-concurrency.mjs"),
  "utf8",
);
const monitorSetup = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-concurrency-monitor-setup.sql"),
  "utf8",
);
const monitorTeardown = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-concurrency-monitor-teardown.sql"),
  "utf8",
);
const rollbackFixtureScript = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-rollback-fixture.mjs"),
  "utf8",
);
const zoomFixtureScript = fs.readFileSync(
  path.join(repositoryRoot, "scripts/supabase-profile-zoom-fixture.mjs"),
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
    expect(concurrencyScript).toContain("native_http2_shared_session");
    expect(concurrencyScript).toContain("transportPhases");
    expect(concurrencyScript).toContain("requestBodySentMs");
    expect(concurrencyScript).toContain("responseHeadersMs");
    expect(concurrencyObserver).not.toMatch(/\b(?:a|c)\.query\s*(?:,|AS\b)/i);
    expect(concurrencyObserver).toContain("\\watch i=0.25 c=120");
    expect(concurrencyObserver).not.toContain("m=0");
    expect(directConcurrencyScript).toContain("SET LOCAL ROLE authenticated");
    expect(directConcurrencyScript).toContain("request.jwt.claims");
    expect(directConcurrencyScript).toContain("controlled_40001");
    expect(directConcurrencyScript).toContain("databaseOperationsFinished");
    expect(monitorSetup).toContain("default_transaction_read_only = on");
    expect(monitorSetup).toContain("CONNECTION LIMIT 1");
    expect(monitorSetup).toContain("GRANT pg_read_all_stats");
    expect(monitorTeardown).toContain("DROP ROLE umoja_prompt12_monitor");
    expect(rollbackFixtureScript).not.toContain("access_token:");
    expect(rollbackFixtureScript).not.toContain("createCipheriv");
    expect(rollbackFixtureScript).toContain("getIntakeCryptographyEnvironment");
    expect(rollbackFixtureScript).toContain("createIntakeEncryptionKeyring");
    expect(rollbackFixtureScript).toContain("encryptIntakeValue");
    expect(rollbackFixtureScript).toContain("exactSyntheticUsersRemoved");
    expect(zoomFixtureScript).not.toContain("console.log(tokenPayload");
    expect(zoomFixtureScript).toContain('credentialFileMode: "0600"');
    expect(zoomFixtureScript).toContain("exactSyntheticUsersRemoved");
  });
});

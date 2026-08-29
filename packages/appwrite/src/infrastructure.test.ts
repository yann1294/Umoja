import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "../..");
const config = JSON.parse(fs.readFileSync(path.join(root, "appwrite.config.json"), "utf8"));

describe("versioned infrastructure", () => {
  it("defines all required private-by-default resources", () => {
    expect(config.project.name).toBe("umoja-development");
    expect(config.database.tables.map((table: { id: string }) => table.id)).toEqual(
      expect.arrayContaining([
        "cms_pages",
        "cms_revisions",
        "project_intakes",
        "talent_intakes",
        "audit_logs",
      ]),
    );
    expect(JSON.stringify(config)).not.toMatch(/(?:create|update|delete)\(\\?"any/);
    expect(config.buckets.every((bucket: { fileSecurity: boolean }) => bucket.fileSecurity)).toBe(
      true,
    );
    expect(config.storage).toEqual({
      sharedFreePlanBucket: true,
      cmsMedia: "cms_media",
      intakeFiles: "cms_media",
    });
    expect(config.buckets).toHaveLength(1);
    expect(config.buckets[0].$permissions ?? config.buckets[0].permissions).toEqual([]);
    expect(config.buckets[0].encryption).toBe(true);
    expect(
      config.database.tables.flatMap((table: { columns: Array<{ encrypt?: boolean }> }) =>
        table.columns.filter((column) => column.encrypt),
      ),
    ).toEqual([]);
    for (const tableId of ["project_intakes", "talent_intakes"]) {
      const table = config.database.tables.find((item: { id: string }) => item.id === tableId);
      const keys = table.columns.map((column: { key: string }) => column.key);
      expect(keys).toEqual(
        expect.arrayContaining([
          "emailLookup",
          "encryptionKeyVersion",
          "encryptedPayload",
          "encryptedInternalNotes",
        ]),
      );
      expect(keys).not.toEqual(
        expect.arrayContaining(["contactEmail", "contactPhone", "internalNotes"]),
      );
      expect(
        table.indexes.some((index: { columns: string[] }) =>
          index.columns.includes("encryptedPayload"),
        ),
      ).toBe(false);
    }
  });

  it("keeps the rollback SDK isolated from the canonical web runtime", () => {
    const browser = fs.readFileSync(path.join(root, "packages/appwrite/src/browser.ts"), "utf8");
    expect(browser).not.toContain("node-appwrite");
    expect(browser).not.toMatch(/APPWRITE_(?:SSR|SERVER|BOOTSTRAP)_API_KEY/);
    expect(browser).not.toContain("encryption");
    const formerRuntimeDirectory = path.join(root, "apps/web/lib/appwrite");
    expect(
      fs.existsSync(formerRuntimeDirectory) ? fs.readdirSync(formerRuntimeDirectory) : [],
    ).toEqual([]);
  });

  it("does not expose a public signup handler", () => {
    expect(fs.existsSync(path.join(root, "apps/web/app/api/auth/sign-up/route.ts"))).toBe(false);
    expect(fs.existsSync(path.join(root, "apps/web/app/api/auth/sign-in/route.ts"))).toBe(false);
    expect(fs.existsSync(path.join(root, "apps/web/app/api/supabase-auth/sign-in/route.ts"))).toBe(
      true,
    );
  });
});

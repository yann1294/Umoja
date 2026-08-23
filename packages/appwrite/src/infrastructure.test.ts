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
  });

  it("keeps server SDKs out of the browser boundary", () => {
    const browser = fs.readFileSync(path.join(root, "packages/appwrite/src/browser.ts"), "utf8");
    const admin = fs.readFileSync(path.join(root, "apps/web/lib/appwrite/admin.ts"), "utf8");
    expect(browser).not.toContain("node-appwrite");
    expect(browser).not.toMatch(/APPWRITE_(?:SSR|SERVER|BOOTSTRAP)_API_KEY/);
    expect(admin).toMatch(/^import "server-only";/);
  });

  it("does not expose a public signup handler", () => {
    expect(fs.existsSync(path.join(root, "apps/web/app/api/auth/sign-up/route.ts"))).toBe(false);
    expect(fs.existsSync(path.join(root, "apps/web/app/api/auth/sign-in/route.ts"))).toBe(true);
  });
});

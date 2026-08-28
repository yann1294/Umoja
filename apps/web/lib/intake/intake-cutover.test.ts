import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());
const switched = [
  "app/api/intake/[kind]/route.ts",
  "app/[locale]/admin/intake/page.tsx",
  "app/[locale]/admin/intake/actions.ts",
  "app/[locale]/admin/intake/[kind]/[id]/page.tsx",
  "app/api/intake/admin/[kind]/[id]/files/[fileId]/route.ts",
];

describe("atomic intake provider boundary", () => {
  it("contains no Appwrite identity, data, storage, environment or crypto dependency", () => {
    for (const relative of switched) {
      const source = fs.readFileSync(path.join(root, relative), "utf8");
      expect(source, relative).not.toMatch(/appwrite|node-appwrite/i);
    }
  });
});

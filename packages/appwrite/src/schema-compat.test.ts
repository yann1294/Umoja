import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Operational ESM helper intentionally has no TypeScript declaration file.
import { columnMismatches, indexMismatches } from "../scripts/schema-compat.mjs";

const root = path.resolve(process.cwd(), "../..");
const config = JSON.parse(fs.readFileSync(path.join(root, "appwrite.config.json"), "utf8"));

describe("resumable Appwrite schema compatibility", () => {
  it("accepts the twelve existing compatible cms_pages columns", () => {
    const expected = config.database.tables.find(
      (table: { id: string }) => table.id === "cms_pages",
    ).columns;
    const existing = expected.slice(0, 12).map((column: Record<string, unknown>) => ({
      ...column,
      type: column.type === "enum" ? "string" : column.type,
      array: column.array ?? false,
      encrypt: false,
      status: "available",
    }));
    expect(existing).toHaveLength(12);
    for (const [index, actual] of existing.entries())
      expect(columnMismatches(expected[index], actual)).toEqual([]);
    expect(expected.slice(existing.length).map((column: { key: string }) => column.key)).toEqual([
      "previewTokenHash",
      "publishedAt",
      "createdAt",
      "updatedAt",
    ]);
  });

  it("reports incompatible native encryption instead of recreating a column", () => {
    expect(
      columnMismatches(
        { key: "value", type: "string", size: 128, required: false },
        { key: "value", type: "string", size: 128, required: false, array: false, encrypt: true },
      ),
    ).toContain("encrypt");
  });

  it("defines an explicit safe prefix for the composite CMS slug index", () => {
    const table = config.database.tables.find((item: { id: string }) => item.id === "cms_pages");
    const index = table.indexes.find(
      (item: { key: string }) => item.key === "published_locale_slug",
    );
    expect(index.lengths).toEqual([9, 2, 180]);
  });

  it("normalizes Appwrite lowercase index order read-back", () => {
    expect(
      indexMismatches(
        { type: "key", columns: ["status", "createdAt"], orders: ["ASC", "DESC"] },
        { type: "key", columns: ["status", "createdAt"], orders: ["asc", "desc"] },
      ),
    ).toEqual([]);
  });
});

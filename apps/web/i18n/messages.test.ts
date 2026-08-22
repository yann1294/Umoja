import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import fr from "../messages/fr.json";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object") throw new Error(`Invalid message at ${prefix}`);

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation catalogues", () => {
  it("keeps English and French structurally equivalent and complete", () => {
    const englishKeys = leafPaths(en).sort();
    const frenchKeys = leafPaths(fr).sort();

    expect(frenchKeys).toEqual(englishKeys);
    expect(englishKeys.length).toBeGreaterThan(0);
    expect(Object.values(en).length).toBe(Object.values(fr).length);
  });
});

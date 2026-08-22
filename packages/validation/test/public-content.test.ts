import { describe, expect, it } from "vitest";

import { PublicProfileSchema } from "../src/public-content";

const illustrativeProfile = {
  slug: "illustrative-profile",
  publicName: { en: "Illustrative profile", fr: "Profil illustratif" },
  region: { en: "Published after consent", fr: "Publié après consentement" },
  skills: [{ en: "Product delivery", fr: "Réalisation produit" }],
  seniority: { en: "Confirmed after review", fr: "Confirmé après validation" },
  availability: { en: "Shared by choice", fr: "Partagée volontairement" },
  bio: { en: "Template content only.", fr: "Contenu de gabarit uniquement." },
  illustrativeLabel: { en: "Illustrative template", fr: "Gabarit illustratif" },
  illustrative: true,
} as const;

describe("PublicProfileSchema", () => {
  it("accepts the intentionally limited public profile projection", () => {
    expect(PublicProfileSchema.parse(illustrativeProfile)).toEqual(illustrativeProfile);
  });

  it.each(["legalName", "email", "phone", "address", "rate", "assessment", "contact"])(
    "rejects private field %s at the public-content boundary",
    (privateField) => {
      const result = PublicProfileSchema.safeParse({
        ...illustrativeProfile,
        [privateField]: "must never reach public page props",
      });

      expect(result.success).toBe(false);
    },
  );
});

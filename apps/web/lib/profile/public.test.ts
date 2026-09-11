import { describe, expect, it } from "vitest";
import {
  normalizePublicTalentLinks,
  publicTalentInitials,
  publicTalentProfileFromLegacyProjection,
} from "./public";

describe("public talent projection helpers", () => {
  it("keeps only labelled http(s) public links", () => {
    expect(
      normalizePublicTalentLinks([
        { label: "Website", url: "https://example.test/profile" },
        { label: "GitHub", url: " http://github.test/umoja " },
        { label: "Email", url: "mailto:private@example.test" },
        { label: "Script", url: "javascript:alert(1)" },
        { label: "", url: "https://example.test/blank-label" },
        "not-a-link",
      ]),
    ).toEqual([
      { label: "Website", url: "https://example.test/profile" },
      { label: "GitHub", url: "http://github.test/umoja" },
    ]);
  });

  it("uses stable initials without exposing private fallback data", () => {
    expect(publicTalentInitials("Amina Diop")).toBe("AD");
    expect(publicTalentInitials("")).toBe("U");
  });

  it("renders legacy public projections as minimal safe profiles until migrations are applied", () => {
    expect(
      publicTalentProfileFromLegacyProjection({
        public_slug: "approved-talent",
        professional_name: "Approved Talent",
        locale: "en",
        country_code: "GH",
        public_bio: "Consent-led biography.",
      }),
    ).toMatchObject([
      {
        slug: "approved-talent",
        name: "Approved Talent",
        countryCode: "GH",
        skills: [],
        languages: [],
        portfolio: [],
        availability: null,
      },
    ]);
  });
});

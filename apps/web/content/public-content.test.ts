import { describe, expect, it } from "vitest";

import {
  AFRICIT_SLUGS,
  CASE_STUDY_SLUGS,
  getCaseStudy,
  getEditorialPage,
  getPublicProfile,
  getService,
  getServices,
  PROFILE_SLUGS,
  SERVICE_SLUGS,
} from "./public-content";

describe("public content route data", () => {
  it("backs every static detail route with bilingual typed content", () => {
    expect(getServices()).toHaveLength(5);
    for (const slug of SERVICE_SLUGS)
      expect(getService(slug)?.title).toMatchObject({
        en: expect.any(String),
        fr: expect.any(String),
      });
    for (const slug of CASE_STUDY_SLUGS) expect(getCaseStudy(slug)?.illustrative).toBe(true);
    for (const slug of PROFILE_SLUGS) expect(getPublicProfile(slug)?.illustrative).toBe(true);
    for (const slug of [
      ...AFRICIT_SLUGS,
      "organizations",
      "africit",
      "about",
      "model",
      "governance",
      "manifesto",
    ])
      expect(getEditorialPage(slug)).toBeDefined();
  });

  it("keeps the public profile projection free of private fields", () => {
    const profile = getPublicProfile(PROFILE_SLUGS[0]);
    expect(profile).toBeDefined();
    expect(Object.keys(profile!)).not.toEqual(
      expect.arrayContaining(["email", "phone", "legalName", "address", "rate", "assessment"]),
    );
  });
});

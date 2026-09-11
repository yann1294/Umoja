import { describe, expect, it } from "vitest";
import { availabilityState, publicProfileSerializer } from "./service";

describe("profile safety boundaries", () => {
  it("expires availability after thirty days and treats missing values as unknown", () => {
    const now = new Date("2026-08-30T00:00:00Z");
    expect(availabilityState("2026-08-31T00:00:00Z", now)).toBe("fresh");
    expect(availabilityState("2026-08-29T00:00:00Z", now)).toBe("stale");
    expect(availabilityState(null, now)).toBe("unknown");
  });

  it("does not serialize private or unapproved profile data", () => {
    const bundle = {
      profile: {
        publication_state: "submitted",
        visibility: "public",
        public_consent_at: "2026-08-30T00:00:00Z",
        archived_at: null,
      },
      skills: [],
      languages: [],
      portfolio: [],
      availability: null,
    } as never;
    expect(publicProfileSerializer(bundle)).toBeNull();
  });

  it("serializes only approved and consented public profile details", () => {
    const result = publicProfileSerializer({
      profile: {
        publication_state: "approved",
        visibility: "public",
        public_consent_at: "2026-08-30T00:00:00Z",
        archived_at: null,
        public_slug: "amina-diop",
        professional_name: "Amina Diop",
        locale: "fr",
        country_code: "SN",
        public_bio: "Product engineer building accessible services.",
      },
      skills: [
        { level: 5, skills: { canonical_name: "React" } },
        { level: 4, skills: { canonical_name: "Supabase" } },
      ],
      languages: [
        {
          language_code: "fr",
          proficiency: "native",
          public_consent_at: "2026-08-30T00:00:00Z",
          languages: { display_label_en: "French" },
        },
        {
          language_code: "en",
          proficiency: "professional",
          public_consent_at: null,
          languages: { display_label_en: "English" },
        },
      ],
      portfolio: [
        {
          title: "Clinic workflow",
          role_summary: "Led product engineering.",
          external_url: "https://example.test/work",
          category: "Product",
          publication_state: "approved",
          public_consent_at: "2026-08-30T00:00:00Z",
        },
        {
          title: "Private client migration",
          role_summary: "Contains private context.",
          external_url: null,
          category: "Engineering",
          publication_state: "submitted",
          public_consent_at: "2026-08-30T00:00:00Z",
        },
      ],
      availability: {
        expires_at: "2026-09-15T00:00:00Z",
        work_mode: "remote",
        next_available_on: "2026-10-01",
        public_consent_at: "2026-08-30T00:00:00Z",
      },
    } as never);

    expect(result).toMatchObject({
      slug: "amina-diop",
      name: "Amina Diop",
      countryCode: "SN",
      skills: [
        { name: "React", level: 5 },
        { name: "Supabase", level: 4 },
      ],
      languages: [{ code: "fr", proficiency: "native", label: "French" }],
      portfolio: [{ title: "Clinic workflow", url: "https://example.test/work" }],
      availability: { workMode: "remote", nextAvailableOn: "2026-10-01" },
    });
    expect(result?.portfolio).toHaveLength(1);
    expect(result?.languages).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("Private client migration");
  });

  it("does not serialize current availability without explicit public consent", () => {
    const result = publicProfileSerializer({
      profile: {
        publication_state: "approved",
        visibility: "public",
        public_consent_at: "2026-08-30T00:00:00Z",
        archived_at: null,
        public_slug: "private-availability",
        professional_name: "Private Availability",
        locale: "en",
        country_code: "KE",
        public_bio: "Approved public biography.",
      },
      skills: [],
      languages: [],
      portfolio: [],
      availability: {
        expires_at: "2026-09-15T00:00:00Z",
        work_mode: "remote",
        next_available_on: "2026-10-01",
        public_consent_at: null,
      },
    } as never);

    expect(result?.availability).toEqual({ state: "unknown" });
  });
});

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
});

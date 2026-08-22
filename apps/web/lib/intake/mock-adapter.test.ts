import { describe, expect, it } from "vitest";

import { submitMockIntake } from "./mock-adapter";

const message = {
  preferredName: "Mock visitor",
  email: "adapter-test@example.com",
  organization: "",
  subject: "A clear question",
  message: "This is enough context for the mock contact adapter.",
  contactConsent: true,
};

describe("mock intake adapter", () => {
  it("validates at the server boundary and never claims persistence", async () => {
    const invalid = await submitMockIntake("contact", { ...message, email: "invalid" });
    expect(invalid).toMatchObject({ status: "validation_error", persisted: false });

    const accepted = await submitMockIntake("contact", message);
    expect(accepted).toMatchObject({ status: "success", persisted: false });
    if (accepted.status === "success") expect(accepted.reference).toMatch(/^MOCK-CONTACT-/);

    const duplicate = await submitMockIntake("contact", message);
    expect(duplicate).toEqual({ status: "duplicate", persisted: false });
  });
});

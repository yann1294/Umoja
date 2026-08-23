import { describe, expect, it } from "vitest";

import { ContactIntakeSchema, ProjectIntakeSchema, TalentIntakeSchema } from "../src";

const validProject = {
  contact: { preferredName: "Amina", email: "amina@example.com", phone: "" },
  organization: { name: "Illustrative organization", country: "Senegal", website: "" },
  need: {
    title: "Service platform",
    description: "We need to understand and deliver a bilingual service platform responsibly.",
    serviceAreas: ["Product engineering"],
  },
  budgetBand: "Still defining",
  timing: { desiredStart: "Within 1–3 months", targetDate: "" },
  attachments: [{ name: "brief.pdf", mimeType: "application/pdf", size: 1024 }],
  projectConsent: true,
};

const validTalent = {
  preferredName: "Kofi",
  privateContact: { email: "kofi@example.com", phone: "" },
  country: "Ghana",
  timezone: "Africa/Accra",
  skillAreas: ["Software engineering"],
  experienceBand: "Independent contributor",
  portfolioItems: [{ title: "Illustrative portfolio", url: "" }],
  availability: { weeklyCapacity: "11–20 hours", nextAvailableDate: "", workMode: "Remote" },
  languages: ["English", "French"],
  publicProfileConsent: false,
  applicationConsent: true,
  dataProcessingConsent: true,
};

describe("intake boundaries", () => {
  it("accepts complete project metadata without file contents", () => {
    expect(ProjectIntakeSchema.parse(validProject).attachments[0]).toEqual({
      name: "brief.pdf",
      mimeType: "application/pdf",
      size: 1024,
    });
  });

  it("keeps public-profile consent optional and separate from required talent consents", () => {
    expect(TalentIntakeSchema.parse(validTalent).publicProfileConsent).toBe(false);
    expect(
      TalentIntakeSchema.safeParse({ ...validTalent, applicationConsent: false }).success,
    ).toBe(false);
    expect(
      TalentIntakeSchema.safeParse({ ...validTalent, dataProcessingConsent: false }).success,
    ).toBe(false);
  });

  it("rejects fields outside the shared server/client payload", () => {
    expect(
      ProjectIntakeSchema.safeParse({ ...validProject, legalIdentityDocument: "secret" }).success,
    ).toBe(false);
  });

  it("requires useful contact context and response consent", () => {
    expect(
      ContactIntakeSchema.safeParse({
        preferredName: "Nia",
        email: "bad",
        organization: "",
        subject: "Hi",
        message: "short",
        contactConsent: false,
      }).success,
    ).toBe(false);
  });
});

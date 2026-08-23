import { z } from "zod";

const requiredText = z.string().trim().min(1, "required").max(200, "tooLong");
const optionalText = z.string().trim().max(200, "tooLong");
const email = z.string().trim().min(1, "required").email("email").max(254, "tooLong");
const optionalUrl = z.union([z.literal(""), z.url({ message: "url" }).max(500, "tooLong")]);
const consent = z.boolean().refine((value) => value, "consent");

export const IntakeFileMetadataSchema = z.strictObject({
  name: requiredText,
  mimeType: z.string().trim().max(120, "tooLong"),
  size: z.number().int().nonnegative().max(10_000_000, "fileTooLarge"),
});

export type IntakeFileMetadata = z.infer<typeof IntakeFileMetadataSchema>;

const PrivateContactSchema = z.strictObject({
  preferredName: requiredText,
  email,
  phone: optionalText,
});

const OrganizationSchema = z.strictObject({
  name: requiredText,
  country: requiredText,
  website: optionalUrl,
});

export const ProjectIntakeSchema = z.strictObject({
  contact: PrivateContactSchema,
  organization: OrganizationSchema,
  need: z.strictObject({
    title: requiredText,
    description: z.string().trim().min(40, "needDetail").max(4_000, "tooLong"),
    serviceAreas: z.array(requiredText).min(1, "chooseOne").max(5),
  }),
  budgetBand: requiredText,
  timing: z.strictObject({
    desiredStart: requiredText,
    targetDate: z.union([z.literal(""), z.iso.date({ message: "date" })]),
  }),
  attachments: z.array(IntakeFileMetadataSchema).max(3, "tooManyFiles"),
  projectConsent: consent,
});

export type ProjectIntake = z.infer<typeof ProjectIntakeSchema>;

export const TalentIntakeSchema = z.strictObject({
  preferredName: requiredText,
  privateContact: z.strictObject({ email, phone: optionalText }),
  country: requiredText,
  timezone: requiredText,
  skillAreas: z.array(requiredText).min(1, "chooseOne").max(6),
  experienceBand: requiredText,
  portfolioItems: z
    .array(
      z.strictObject({
        title: requiredText,
        url: optionalUrl,
      }),
    )
    .max(3),
  availability: z.strictObject({
    weeklyCapacity: requiredText,
    nextAvailableDate: z.union([z.literal(""), z.iso.date({ message: "date" })]),
    workMode: requiredText,
  }),
  languages: z.array(requiredText).min(1, "chooseOne").max(8),
  publicProfileConsent: z.boolean(),
  applicationConsent: consent,
  dataProcessingConsent: consent,
});

export type TalentIntake = z.infer<typeof TalentIntakeSchema>;

export const ContactIntakeSchema = z.strictObject({
  preferredName: requiredText,
  email,
  organization: optionalText,
  subject: requiredText,
  message: z.string().trim().min(20, "messageDetail").max(2_000, "tooLong"),
  contactConsent: consent,
});

export type ContactIntake = z.infer<typeof ContactIntakeSchema>;

export const IntakeKindSchema = z.enum(["project", "talent", "contact"]);
export type IntakeKind = z.infer<typeof IntakeKindSchema>;

export const IntakeSchemas = {
  project: ProjectIntakeSchema,
  talent: TalentIntakeSchema,
  contact: ContactIntakeSchema,
} as const;

export type IntakePayload = ProjectIntake | TalentIntake | ContactIntake;

export type IntakeSubmissionResult =
  | Readonly<{ status: "success"; reference: string; persisted: false }>
  | Readonly<{ status: "duplicate"; persisted: false }>
  | Readonly<{
      status: "validation_error";
      fieldErrors: Record<string, string[]>;
      persisted: false;
    }>;

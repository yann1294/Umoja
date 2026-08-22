import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = z.string().trim().min(1);

export const LocalizedTextSchema = z.strictObject({
  en: text,
  fr: text,
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const ServiceCategorySchema = z.strictObject({
  slug,
  title: LocalizedTextSchema,
  summary: LocalizedTextSchema,
  description: LocalizedTextSchema,
  capabilities: z.array(LocalizedTextSchema).min(2),
  approach: z.array(LocalizedTextSchema).min(2),
  illustrativeLabel: LocalizedTextSchema,
});

export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;

export const PublicCaseStudySchema = z.strictObject({
  slug,
  title: LocalizedTextSchema,
  summary: LocalizedTextSchema,
  challenge: LocalizedTextSchema,
  contribution: LocalizedTextSchema,
  result: LocalizedTextSchema,
  status: LocalizedTextSchema,
  lessons: LocalizedTextSchema,
  illustrativeLabel: LocalizedTextSchema,
  illustrative: z.literal(true),
});

export type PublicCaseStudy = z.infer<typeof PublicCaseStudySchema>;

/**
 * The only shape a public profile page may receive. This strict schema intentionally
 * has no legal name, email, phone, address, rate, assessment, or HR fields.
 */
export const PublicProfileSchema = z.strictObject({
  slug,
  publicName: LocalizedTextSchema,
  region: LocalizedTextSchema,
  skills: z.array(LocalizedTextSchema).min(1),
  seniority: LocalizedTextSchema,
  availability: LocalizedTextSchema,
  bio: LocalizedTextSchema,
  illustrativeLabel: LocalizedTextSchema,
  illustrative: z.literal(true),
});

export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const EditorialPageSchema = z.strictObject({
  slug,
  eyebrow: LocalizedTextSchema,
  title: LocalizedTextSchema,
  summary: LocalizedTextSchema,
  sections: z
    .array(
      z.strictObject({
        title: LocalizedTextSchema,
        body: LocalizedTextSchema,
      }),
    )
    .min(2),
});

export type EditorialPage = z.infer<typeof EditorialPageSchema>;

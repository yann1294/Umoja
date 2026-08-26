import "server-only";

import { z } from "zod";

const schema = z
  .object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  APP_URL: z.url().optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  })
  .refine((value) => value.APP_URL ?? value.NEXT_PUBLIC_SITE_URL, {
    message: "APP_URL or NEXT_PUBLIC_SITE_URL is required.",
  })
  .transform((value) => ({
    ...value,
    APP_URL: value.APP_URL ?? value.NEXT_PUBLIC_SITE_URL!,
  }));

export type SupabaseEnvironment = z.infer<typeof schema>;

export function getSupabaseEnvironment(source = process.env): SupabaseEnvironment {
  return schema.parse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY,
    APP_URL: source.APP_URL,
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL,
  });
}

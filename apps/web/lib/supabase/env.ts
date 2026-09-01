import "server-only";

import { z } from "zod";
import { getApplicationEnvironment } from "@/lib/config/environment";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type SupabaseEnvironment = z.infer<typeof schema> & Readonly<{ APP_URL: string }>;

export function getSupabaseEnvironment(source = process.env): SupabaseEnvironment {
  const provider = schema.parse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY,
  });
  return { ...provider, APP_URL: getApplicationEnvironment(source).APP_URL };
}

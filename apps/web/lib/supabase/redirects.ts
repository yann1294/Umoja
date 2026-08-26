import "server-only";

import { z } from "zod";
import { getSupabaseEnvironment } from "./env";

const localeSchema = z.enum(["en", "fr"]);
const flowSchema = z.enum(["verification", "invite", "recovery"]);
export type SupabaseAuthFlow = z.infer<typeof flowSchema>;
type CallbackContext = Readonly<{
  locale: "en" | "fr";
  flow: SupabaseAuthFlow;
  target: URL;
}>;

function finalPath(locale: z.infer<typeof localeSchema>, flow: SupabaseAuthFlow) {
  if (flow === "verification") return `/${locale}/verify-email?verified=1`;
  if (flow === "invite") return `/${locale}/accept-invite?accepted=1`;
  return `/${locale}/recover-password?recovery=1`;
}

/** Builds the only redirect target supplied to Supabase Auth. */
export function supabaseAuthCallbackUrl(locale: "en" | "fr", flow: SupabaseAuthFlow) {
  const callback = new URL("/api/supabase-auth/callback", getSupabaseEnvironment().APP_URL);
  callback.searchParams.set("locale", localeSchema.parse(locale));
  callback.searchParams.set("flow", flowSchema.parse(flow));
  return callback.toString();
}

/** Rejects attacker-controlled targets and returns a clean, token-free final route. */
export function parseSupabaseAuthCallback(requestUrl: string): CallbackContext | null {
  const appUrl = new URL(getSupabaseEnvironment().APP_URL);
  const request = new URL(requestUrl);
  if (request.origin !== appUrl.origin) return null;
  const locale = localeSchema.safeParse(request.searchParams.get("locale"));
  const flow = flowSchema.safeParse(request.searchParams.get("flow"));
  if (!locale.success || !flow.success) return null;
  return { locale: locale.data, flow: flow.data, target: new URL(finalPath(locale.data, flow.data), appUrl) };
}

export function resolveSupabaseAuthCallback(requestUrl: string) {
  return parseSupabaseAuthCallback(requestUrl)?.target ?? null;
}

/** Safe operational signal: never include an Auth code, token, email, or full URL. */
export function logSupabaseAuthCallbackOutcome(input: {
  flow: SupabaseAuthFlow | "invalid";
  locale: "en" | "fr" | "invalid";
  codePresent: boolean;
  exchange: "not-attempted" | "succeeded" | "failed";
  finalRoute: string | "none";
}) {
  console.info("supabase-auth-callback", JSON.stringify(input));
}

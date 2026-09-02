import "server-only";

import { z } from "zod";
import { getSupabaseEnvironment } from "./env";
import { logInfo } from "@/lib/observability/structured-log";

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
  if (flow === "invite") return `/${locale}/accept-invite`;
  return `/${locale}/recover-password`;
}

export function supabaseAuthFinalTarget(locale: "en" | "fr", flow: SupabaseAuthFlow) {
  return new URL(finalPath(localeSchema.parse(locale), flow), getSupabaseEnvironment().APP_URL);
}

export function supabaseAuthInvalidTarget(locale: "en" | "fr", flow: SupabaseAuthFlow) {
  const page =
    flow === "verification"
      ? "verify-email"
      : flow === "invite"
        ? "accept-invite"
        : "recover-password";
  return new URL(`/${locale}/${page}?state=invalid`, getSupabaseEnvironment().APP_URL);
}

/** Chooses only a localized, flow-specific failure page; all other URL material is discarded. */
export function supabaseAuthFailureTargetFromRequest(requestUrl: string) {
  const request = new URL(requestUrl);
  const locale = request.searchParams.get("locale") === "fr" ? "fr" : "en";
  const flow = flowSchema.safeParse(request.searchParams.get("flow"));
  return flow.success
    ? supabaseAuthInvalidTarget(locale, flow.data)
    : new URL(`/${locale}/sign-in?auth=invalid`, getSupabaseEnvironment().APP_URL);
}

/** Builds the only redirect target supplied to Supabase Auth. */
export function supabaseAuthCallbackUrl(locale: "en" | "fr", flow: SupabaseAuthFlow) {
  const callback = new URL("/api/supabase-auth/callback", getSupabaseEnvironment().APP_URL);
  callback.searchParams.set("locale", localeSchema.parse(locale));
  callback.searchParams.set("flow", flowSchema.parse(flow));
  return callback.toString();
}

/** Context URL used by token-hash email templates; Supabase appends no secret to application state. */
export function supabaseAuthConfirmationUrl(locale: "en" | "fr", flow: SupabaseAuthFlow) {
  const confirmation = new URL("/api/supabase-auth/confirm", getSupabaseEnvironment().APP_URL);
  confirmation.searchParams.set("locale", localeSchema.parse(locale));
  confirmation.searchParams.set("flow", flowSchema.parse(flow));
  return confirmation.toString();
}

export function parseSupabaseAuthConfirmation(requestUrl: string) {
  const request = new URL(requestUrl);
  // The deployment proxy may expose an internal request origin. Never use it as a destination;
  // accept only this fixed handler path and build every redirect from canonical APP_URL below.
  if (request.pathname !== "/api/supabase-auth/confirm") return null;
  const flow = flowSchema.safeParse(request.searchParams.get("flow"));
  const tokenHash = z.string().min(16).max(2048).safeParse(request.searchParams.get("token_hash"));
  const suppliedType = z
    .enum(["signup", "email", "invite", "recovery"])
    .safeParse(request.searchParams.get("type"));
  if (!flow.success || !tokenHash.success || !suppliedType.success) return null;
  const locale = localeSchema.safeParse(request.searchParams.get("locale"));
  if (!locale.success && flow.data !== "invite") return null;
  const validType =
    (flow.data === "verification" && ["signup", "email"].includes(suppliedType.data)) ||
    (flow.data === "invite" && suppliedType.data === "invite") ||
    (flow.data === "recovery" && suppliedType.data === "recovery");
  if (!validType) return null;
  return {
    locale: locale.success ? locale.data : "en",
    flow: flow.data,
    tokenHash: tokenHash.data,
    type: suppliedType.data,
  } as const;
}

/** Rejects attacker-controlled targets and returns a clean, token-free final route. */
export function parseSupabaseAuthCallback(requestUrl: string): CallbackContext | null {
  const request = new URL(requestUrl);
  if (request.pathname !== "/api/supabase-auth/callback") return null;
  const locale = localeSchema.safeParse(request.searchParams.get("locale"));
  const flow = flowSchema.safeParse(request.searchParams.get("flow"));
  if (!locale.success || !flow.success) return null;
  return {
    locale: locale.data,
    flow: flow.data,
    target: supabaseAuthFinalTarget(locale.data, flow.data),
  };
}

export function resolveSupabaseInviteLocale(
  metadata: Record<string, unknown> | null | undefined,
  fallback: "en" | "fr" = "en",
) {
  return metadata?.umoja_invite_locale === "fr"
    ? "fr"
    : metadata?.umoja_invite_locale === "en"
      ? "en"
      : fallback;
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
  logInfo("supabase-auth-callback", input);
}

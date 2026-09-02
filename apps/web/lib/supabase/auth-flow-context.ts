import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseEnvironment } from "./env";

export const SUPABASE_AUTH_FLOW_COOKIE = "umoja-auth-flow";
export const SUPABASE_AUTH_FLOW_TTL_SECONDS = 30 * 60;

export type SupabasePasswordFlow = "invite" | "recovery";

const contextSchema = z.object({
  version: z.literal(1),
  flow: z.enum(["invite", "recovery"]),
  subject: z.uuid(),
  expiresAt: z.number().int().positive(),
});

export type SupabaseAuthFlowContext = z.infer<typeof contextSchema>;

function signature(value: string) {
  return createHmac("sha256", getSupabaseEnvironment().SUPABASE_SECRET_KEY)
    .update("umoja-auth-flow-context:v1\0")
    .update(value)
    .digest("base64url");
}

export function createSupabaseAuthFlowContext(
  subject: string,
  flow: SupabasePasswordFlow,
  now = new Date(),
) {
  const payload = Buffer.from(
    JSON.stringify({
      version: 1,
      flow,
      subject,
      expiresAt: Math.floor(now.getTime() / 1000) + SUPABASE_AUTH_FLOW_TTL_SECONDS,
    } satisfies SupabaseAuthFlowContext),
  ).toString("base64url");
  const signed = `v1.${payload}`;
  return `${signed}.${signature(signed)}`;
}

export function parseSupabaseAuthFlowContext(
  value: string | null | undefined,
  expectedFlow: SupabasePasswordFlow,
  now = new Date(),
): SupabaseAuthFlowContext | null {
  if (!value) return null;
  const [version, payload, suppliedSignature, extra] = value.split(".");
  if (version !== "v1" || !payload || !suppliedSignature || extra) return null;
  const signed = `${version}.${payload}`;
  const expectedSignature = signature(signed);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const parsed = contextSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (!parsed.success || parsed.data.flow !== expectedFlow) return null;
    if (parsed.data.expiresAt <= Math.floor(now.getTime() / 1000)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(getSupabaseEnvironment().APP_URL).protocol === "https:",
    path: "/",
    maxAge,
  };
}

export function setSupabaseAuthFlowCookie(
  response: NextResponse,
  subject: string,
  flow: SupabasePasswordFlow,
) {
  response.cookies.set(
    SUPABASE_AUTH_FLOW_COOKIE,
    createSupabaseAuthFlowContext(subject, flow),
    cookieOptions(SUPABASE_AUTH_FLOW_TTL_SECONDS),
  );
}

export function clearSupabaseAuthFlowCookie(response: NextResponse) {
  response.cookies.set(SUPABASE_AUTH_FLOW_COOKIE, "", cookieOptions(0));
}

export function authFlowCookieFromRequest(request: Request) {
  const raw = request.headers.get("cookie") ?? "";
  for (const entry of raw.split(/;\s*/)) {
    const separator = entry.indexOf("=");
    if (separator < 1) continue;
    if (entry.slice(0, separator) === SUPABASE_AUTH_FLOW_COOKIE) {
      return entry.slice(separator + 1);
    }
  }
  return null;
}

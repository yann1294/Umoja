import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { NextResponse } from "next/server";
import { getSupabaseEnvironment } from "@/lib/supabase/env";

export const UMOJA_INVITATION_COOKIE = "umoja-invitation-context";
const MAX_AGE_SECONDS = 30 * 60;
const payloadSchema = z.object({
  id: z.uuid(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  exp: z.number().int(),
});

function signature(payload: string) {
  return createHmac("sha256", getSupabaseEnvironment().SUPABASE_SECRET_KEY)
    .update(`umoja:invitation-context:v1\0${payload}`, "utf8")
    .digest("base64url");
}

export function createInvitationContext(id: string, digest: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ id, digest, exp: now + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `v1.${payload}.${signature(payload)}`;
}

export function parseInvitationContext(value: string | null | undefined, now = Date.now()) {
  try {
    const [version, payload, supplied, extra] = (value ?? "").split(".");
    if (version !== "v1" || !payload || !supplied || extra) return null;
    const expected = signature(payload);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    )
      return null;
    const parsed = payloadSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    return parsed.exp > now ? parsed : null;
  } catch {
    return null;
  }
}

export function setInvitationContext(response: NextResponse, id: string, digest: string) {
  response.cookies.set(UMOJA_INVITATION_COOKIE, createInvitationContext(id, digest), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(getSupabaseEnvironment().APP_URL).protocol === "https:",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearInvitationContext(response: NextResponse) {
  response.cookies.set(UMOJA_INVITATION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(getSupabaseEnvironment().APP_URL).protocol === "https:",
    path: "/",
    maxAge: 0,
  });
}

export function invitationContextFromRequest(request: Request) {
  const raw = request.headers.get("cookie") ?? "";
  const match = raw.split(/;\s*/).find((entry) => entry.startsWith(`${UMOJA_INVITATION_COOKIE}=`));
  return parseInvitationContext(match?.slice(UMOJA_INVITATION_COOKIE.length + 1));
}

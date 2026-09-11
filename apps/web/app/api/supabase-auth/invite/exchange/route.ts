import { NextResponse } from "next/server";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { setInvitationContext } from "@/lib/invitations/context";
import { validateRawInvitationToken } from "@/lib/invitations/service";
import { getSupabaseEnvironment } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const requestedLocale = new URL(request.url).searchParams.get("locale") === "fr" ? "fr" : "en";
  let invitation = null;
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    invitation = await validateRawInvitationToken(token);
  } catch {
    invitation = null;
  }
  const locale = invitation?.row.locale === "fr" ? "fr" : requestedLocale;
  const destination = new URL(
    `/${locale}/accept-invite${invitation ? "" : "?state=invalid"}`,
    getSupabaseEnvironment().APP_URL,
  );
  const response = NextResponse.redirect(destination, {
    status: 303,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
  if (invitation) setInvitationContext(response, invitation.row.id, invitation.digest);
  return response;
}

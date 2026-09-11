import { NextResponse } from "next/server";
import { invitationCreateUnavailableReason } from "@/lib/invitations/errors";
import { issueUmojaInvitation } from "@/lib/invitations/service";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { isCanonicalMutationRequest } from "@/lib/http/same-origin";
import { logWarn } from "@/lib/observability/structured-log";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  try {
    if (!isCanonicalMutationRequest(request)) throw new Error("untrusted-origin");
    const input = await request.json();
    await issueUmojaInvitation(input);
    return NextResponse.json({ success: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    const reason = invitationCreateUnavailableReason(error);
    logWarn("invitation-create-unavailable", { reason });
    return NextResponse.json(
      { error: "Invitation unavailable.", reason },
      { status: 403, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}

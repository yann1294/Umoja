import { NextResponse } from "next/server";
import { issueUmojaInvitation } from "@/lib/invitations/service";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { isCanonicalMutationRequest } from "@/lib/http/same-origin";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  try {
    if (!isCanonicalMutationRequest(request)) throw new Error("untrusted-origin");
    const input = await request.json();
    await issueUmojaInvitation(input);
    return NextResponse.json({ success: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Invitation unavailable." },
      { status: 403, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}

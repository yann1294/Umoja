import { NextResponse } from "next/server";
import { z } from "zod";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { isCanonicalMutationRequest } from "@/lib/http/same-origin";
import { resendUmojaInvitation, revokeUmojaInvitation } from "@/lib/invitations/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isCanonicalMutationRequest(request)) throw new Error("untrusted-origin");
    const { id } = await context.params;
    const input = z
      .object({ action: z.enum(["resend", "revoke"]), locale: z.enum(["en", "fr"]) })
      .parse(await request.json());
    if (input.action === "resend") await resendUmojaInvitation(id, input.locale);
    else await revokeUmojaInvitation(id, input.locale);
    return NextResponse.json({ success: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Invitation action unavailable." },
      { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}

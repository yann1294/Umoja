import { NextResponse } from "next/server";
import { z } from "zod";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { safeAuthReturnPath } from "@/lib/supabase/auth-return-path";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  code: z.string().regex(/^\d{6}$/),
  locale: z.enum(["en", "fr"]),
  next: z.string().optional(),
});

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  try {
    const input = schema.parse(await request.json());
    const client = createSupabaseRouteClient(request, response);
    const [{ data: userData }, { data: factors }] = await Promise.all([
      client.auth.getUser(),
      client.auth.mfa.listFactors(),
    ]);
    if (!userData.user) throw new Error("mfa-rejected");
    const factor = factors?.totp?.find(({ status }) => status === "verified");
    if (!factor) throw new Error("mfa-rejected");
    const verified = await client.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: input.code,
    });
    if (verified.error) throw new Error("mfa-rejected");
    response.headers.set("X-Umoja-Next", safeAuthReturnPath(input.next, input.locale));
    return response;
  } catch {
    return NextResponse.json(
      { error: "Additional verification unavailable." },
      { status: 401, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}

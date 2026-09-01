import { NextResponse } from "next/server";
import { issueSupabaseInvite } from "@/lib/supabase/auth";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  try {
    const input = await request.json();
    await issueSupabaseInvite(input.email, input.roles, input.locale === "fr" ? "fr" : "en");
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Invitation unavailable." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
}

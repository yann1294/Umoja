import { NextResponse } from "next/server";
import { resetSupabasePassword } from "@/lib/supabase/auth";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  try {
    await resetSupabasePassword((await request.json()).password);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Invitation unavailable." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

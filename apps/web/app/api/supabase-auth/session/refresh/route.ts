import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  const response = NextResponse.json(
    { refreshed: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  const { data } = await createSupabaseRouteClient(request, response).auth.getUser();
  if (!data.user) {
    return NextResponse.json(
      { error: "Session unavailable." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return response;
}

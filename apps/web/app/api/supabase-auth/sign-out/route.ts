import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  await createSupabaseRouteClient(request, response).auth.signOut();
  return response;
}

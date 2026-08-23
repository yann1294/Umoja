import { NextResponse } from "next/server";
import { requestEmailVerification } from "@/lib/appwrite/auth";
import { safeRouteError } from "@/lib/appwrite/http";

export async function POST(request: Request) {
  try {
    const input = await request.json().catch(() => ({}));
    await requestEmailVerification(input?.locale === "fr" ? "fr" : "en");
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeRouteError(error);
  }
}

import { NextResponse } from "next/server";
import { requestPasswordRecovery } from "@/lib/appwrite/auth";
import { safeRouteError } from "@/lib/appwrite/http";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const locale = input?.locale === "fr" ? "fr" : "en";
    await requestPasswordRecovery(input, locale);
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeRouteError(error);
  }
}

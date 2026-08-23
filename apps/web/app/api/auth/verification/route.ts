import { NextResponse } from "next/server";
import { requestEmailVerification } from "@/lib/appwrite/auth";
import { safeRouteError } from "@/lib/appwrite/http";

export async function POST() {
  try {
    await requestEmailVerification();
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeRouteError(error);
  }
}

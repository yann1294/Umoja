import { NextResponse } from "next/server";
import { confirmEmailVerification } from "@/lib/appwrite/auth";
import { safeRouteError } from "@/lib/appwrite/http";

export async function POST(request: Request) {
  try {
    await confirmEmailVerification(await request.json());
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeRouteError(error);
  }
}

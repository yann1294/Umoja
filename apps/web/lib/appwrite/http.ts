import { NextResponse } from "next/server";
import { SafeAppwriteError } from "@umoja/appwrite/errors";

export function safeRouteError(error: unknown) {
  if (error instanceof SafeAppwriteError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { error: "validation_failed", message: "The request could not be processed." },
    { status: 400 },
  );
}

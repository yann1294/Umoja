import { IntakeKindSchema } from "@umoja/validation";

import { submitMockIntake } from "@/lib/intake/mock-adapter";
import { persistPublicIntake } from "@/lib/intake/submission-service";

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ kind: string }> }>,
) {
  const { kind: rawKind } = await context.params;
  const kind = IntakeKindSchema.safeParse(rawKind);
  if (!kind.success) return Response.json({ error: "unknown_intake_kind" }, { status: 404 });

  try {
    const payload = await request.json();
    const locale = request.headers.get("x-umoja-locale") === "fr" ? "fr" : "en";
    const result =
      kind.data === "contact"
        ? await submitMockIntake(kind.data, payload)
        : await persistPublicIntake(
            kind.data,
            payload,
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local",
            locale,
          );
    const status =
      result.status === "validation_error" ? 400 : result.status === "duplicate" ? 409 : 200;
    return Response.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ status: "network_error", persisted: false }, { status: 503 });
  }
}

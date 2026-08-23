import { IntakeKindSchema } from "@umoja/validation";

import { submitMockIntake } from "@/lib/intake/mock-adapter";

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ kind: string }> }>,
) {
  const { kind: rawKind } = await context.params;
  const kind = IntakeKindSchema.safeParse(rawKind);
  if (!kind.success) return Response.json({ error: "unknown_intake_kind" }, { status: 404 });

  try {
    const result = await submitMockIntake(kind.data, await request.json());
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

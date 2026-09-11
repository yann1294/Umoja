import "server-only";

import { getApplicationEnvironment } from "@/lib/config/environment";

export function isCanonicalMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  return origin === getApplicationEnvironment().APP_URL;
}

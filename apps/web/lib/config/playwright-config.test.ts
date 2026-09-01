import { describe, expect, it } from "vitest";

import playwrightConfig, { PLAYWRIGHT_BASE_URL } from "../../../../playwright.config";

describe("Playwright application origin", () => {
  it("uses one canonical origin for the browser and web server", () => {
    const webServer = Array.isArray(playwrightConfig.webServer)
      ? playwrightConfig.webServer[0]
      : playwrightConfig.webServer;

    expect(playwrightConfig.use?.baseURL).toBe(PLAYWRIGHT_BASE_URL);
    expect(webServer?.url).toBe(PLAYWRIGHT_BASE_URL);
    expect(webServer?.env).toMatchObject({
      APP_URL: PLAYWRIGHT_BASE_URL,
      DESIGN_SYSTEM_ENABLED: "true",
    });
  });
});

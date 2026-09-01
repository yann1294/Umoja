import { defineConfig } from "@playwright/test";

import { RESPONSIVE_VIEWPORTS } from "./tests/e2e/viewports";

const port = 4173;
export const PLAYWRIGHT_BASE_URL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{projectName}/{arg}-{platform}{ext}",
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    browserName: "chromium",
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: RESPONSIVE_VIEWPORTS.map(({ name, viewport }) => ({
    name,
    use: { viewport },
    // Remote authorization fixtures create disposable Auth users and mutate shared synthetic rows.
    // Run them once; the non-mutating route suites retain the complete responsive matrix.
    testIgnore:
      name === "width-1280"
        ? undefined
        : [
            "**/supabase-cms-auth.spec.ts",
            "**/supabase-cms-media-policy.spec.ts",
            "**/supabase-intake-runtime.spec.ts",
            "**/supabase-profile-lifecycle.spec.ts",
          ],
  })),
  webServer: {
    command: `pnpm build && pnpm --filter @umoja/web start --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...process.env,
      APP_URL: PLAYWRIGHT_BASE_URL,
      DESIGN_SYSTEM_ENABLED: "true",
    },
    url: PLAYWRIGHT_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

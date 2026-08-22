import { defineConfig } from "@playwright/test";

import { RESPONSIVE_VIEWPORTS } from "./tests/e2e/viewports";

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;

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
    baseURL,
    browserName: "chromium",
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: RESPONSIVE_VIEWPORTS.map(({ name, viewport }) => ({
    name,
    use: { viewport },
  })),
  webServer: {
    command: `pnpm build && pnpm --filter @umoja/web start --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

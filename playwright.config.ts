import { defineConfig } from "@playwright/test"
import { AUTH_FILE } from "./e2e/visual/env"
import type { Mode } from "./e2e/visual/fixtures"

/**
 * Local visual safety net against the running local stack (frontend + backend + database).
 * Screenshots contain real data, so baselines, reports, traces and the saved session stay on this
 * machine under e2e/.auth and e2e/.visual (gitignored). How to use it: e2e/visual/README.md.
 */
export default defineConfig<{ mode: Mode }>({
  testDir: "e2e/visual",
  outputDir: "e2e/.visual/results",
  snapshotPathTemplate: "e2e/.visual/baselines/{projectName}/{arg}{ext}",
  reporter: [["list"], ["html", { outputFolder: "e2e/.visual/report", open: "never" }]],
  // Two at a time: the local backend serves every request for real.
  workers: 2,
  timeout: 120_000,
  expect: { toHaveScreenshot: { animations: "disabled", caret: "hide" } },
  use: {
    baseURL: process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 900 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "login", testMatch: /login\.setup\.ts/ },
    { name: "light", testMatch: /visual\.spec\.ts/, use: { storageState: AUTH_FILE, colorScheme: "light", mode: "light" } },
    { name: "dark", testMatch: /visual\.spec\.ts/, use: { storageState: AUTH_FILE, colorScheme: "dark", mode: "dark" } },
  ],
})

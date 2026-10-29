import { test } from "@playwright/test"
import { AUTH_FILE } from "./env"

// `pnpm visual:login`: opens the sign-in page; sign in by hand and the session is saved for the
// visual runs. No credentials are stored anywhere — only the session the app itself creates.
test("sign in once", async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto("/auth")
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 300_000 })
  await page.waitForLoadState("networkidle")
  await page.context().storageState({ path: AUTH_FILE })
})

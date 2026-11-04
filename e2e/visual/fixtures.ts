import AxeBuilder from "@axe-core/playwright"
import { test as base, expect, type Page, type TestInfo } from "@playwright/test"
import { frozenNow } from "./env"

export type Mode = "light" | "dark"

/**
 * Runs in the page before any app script, on every navigation. Self-contained: Playwright
 * serialises it, so it may only use its argument.
 */
function prepareWindow({ mode }: { mode: Mode }) {
  // Theme: the keys index.html and ColorModeProvider read. Surface pinned so an org setting can't flip it.
  let appearance: Record<string, unknown> = {}
  try {
    appearance = JSON.parse(localStorage.getItem("wt-appearance") ?? "{}") ?? {}
  } catch {
    // a corrupt value is replaced below
  }
  localStorage.setItem("wt-appearance", JSON.stringify({ ...appearance, preference: mode, surfacePref: "material" }))
  for (const key of ["wt-mui-color-mode", "kt_theme_mode_value", "kt_theme_mode_menu"]) localStorage.setItem(key, mode)
  localStorage.setItem("wt-pwa-install-dismissed", "1")
  // ApexCharts animates in JS, which screenshot `animations: "disabled"` cannot stop.
  type ApexGlobal = Record<string, unknown> & { chart?: Record<string, unknown> }
  const w = window as Window & { Apex?: ApexGlobal }
  w.Apex = { ...w.Apex, chart: { ...w.Apex?.chart, animations: { enabled: false } } }
  // Seeded, so random fallbacks (e.g. a lead colour) repeat between runs.
  let seed = 42
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

export const test = base.extend<{ mode: Mode }>({
  mode: ["light", { option: true }],
  page: async ({ page, mode }, use) => {
    await page.clock.setFixedTime(frozenNow())
    await page.addInitScript(prepareWindow, { mode })
    await use(page)
  },
})

export { expect }

// The app's loading states: aria-busy (e.g. the table skeleton), pulses, MUI skeletons and spinners,
// indeterminate bars. Determinate progress bars are content, not loading.
const LOADERS =
  '[aria-busy="true"], .animate-pulse, .MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-indeterminate, .spinner-border'

/** Waits until the screen stops changing: route chunk loaded, network quiet, fonts loaded, no loaders. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle")
  if (new URL(page.url()).pathname.startsWith("/auth")) {
    throw new Error("Not signed in: the saved session has expired. Run `pnpm visual:login`, then retry.")
  }
  // The route Suspense fallback (react-topbar-progress-indicator) draws on a <canvas> on <body>.
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("body > canvas:not([data-slot])")].some(
        (c) => getComputedStyle(c).display !== "none" && c.getBoundingClientRect().height > 0,
      ),
    undefined,
    { timeout: 60_000 },
  )
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator(LOADERS)).toHaveCount(0, { timeout: 60_000 })
  await page.waitForLoadState("networkidle")
}

// Content that moves on its own however stable the app is: uploaded GIFs and videos, confetti.
// Hidden for the shot (a mask overlay can end up under a dialog's backdrop).
const SELF_ANIMATING_CSS = 'img[src*=".gif" i], video, canvas[data-slot="celebrate"] { visibility: hidden !important; }'

/** The one screenshot rule for every screen: the page as shown, self-animating media hidden. */
export async function snapshot(page: Page, name: string) {
  await page.addStyleTag({ content: SELF_ANIMATING_CSS })
  await expect(page).toHaveScreenshot(name)
}

const AXE_BUDGET_MS = 30_000

/**
 * Report-only for now (ADR-001: report first, then blocking): counts go on the test, details in the
 * report. Capped, because axe can run for minutes on a very large table; a skipped audit never fails
 * the visual check.
 */
export async function auditA11y(page: Page, testInfo: TestInfo) {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), AXE_BUDGET_MS))
  const result = await Promise.race([new AxeBuilder({ page }).analyze().catch(() => null), timeout])
  if (!result) {
    testInfo.annotations.push({ type: "axe", description: `skipped: no result within ${AXE_BUDGET_MS / 1000}s` })
    return
  }
  const { violations } = result
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical")
  testInfo.annotations.push({
    type: "axe",
    description: `${serious.length} serious/critical of ${violations.length}: ${serious.map((v) => v.id).join(", ") || "none"}`,
  })
  await testInfo.attach("axe-violations.json", { body: JSON.stringify(violations, null, 2), contentType: "application/json" })
}

import { auditA11y, settle, snapshot, test } from "./fixtures"
import { SCREENS } from "./screens"

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    for (const state of screen.states) {
      test(state.name, async ({ page }, testInfo) => {
        await page.goto(state.path ?? screen.path, { waitUntil: "domcontentloaded" })
        await settle(page)
        if (state.prepare) {
          await state.prepare(page)
          await settle(page)
        }
        await snapshot(page, `${screen.id}--${state.id}.png`)
        await auditA11y(page, testInfo)
      })
    }
  })
}

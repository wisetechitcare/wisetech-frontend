# Visual safety net (local)

Before/after screenshots of the button-heavy screens (every `WtButton` variant plus raw MUI,
react-bootstrap and Bootstrap buttons), light and dark, against **your running local stack**.
Each screen also gets a report-only axe audit.

**Real data never leaves your machine.** Baselines, reports, traces and the saved session live in
`e2e/.visual` and `e2e/.auth`, both gitignored. Never commit or share them.

## Use

1. Start the backend and the frontend (`pnpm dev`, port 5173; another URL: set `VISUAL_BASE_URL`).
2. `pnpm visual:login` — sign in once in the window that opens. Repeat when the session expires.
3. On the code **before** your change: `pnpm visual:baseline`
4. Make the change, then `pnpm visual:check` — any pixel difference fails.
5. `pnpm visual:report` — side-by-side and diff images for every failure.

Take both halves of a pair **the same day**: the browser clock is frozen at 10:00 IST, but the
backend's clock and your data are live. After a fresh baseline, `visual:check` with no change must
pass; if a screen differs, something on it is unstable — fix that before trusting the net.

## Rules

- **Read-only.** States only navigate or open a dialog/sheet that makes no request. Never submit,
  delete, archive, approve, reject or reset — this runs against your real database.
- **One table.** Add a screen or state in `screens.ts`; the single spec runs every entry.
- Shared rules (theme, frozen clock, seeded randomness, chart animations off, masks for uploaded
  GIFs/videos, the capped axe audit) live in `fixtures.ts` — change them there, not per screen.

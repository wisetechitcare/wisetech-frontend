# WiseTech Frontend

HRMS web client (Metronic-based admin theme). React 18 + TypeScript + Vite. Pairs with `../wisetech-backend`.

## Commands
- Dev: `pnpm run dev` (Vite) · LAN: `pnpm run dev:host`
- Build: `pnpm run build` (`tsc && vite build`) — **the build typechecks; it fails on any TS error.**
- Typecheck only: `pnpm exec tsc --noEmit` — **primary verification gate; the project typechecks clean (0 errors), keep it that way.**
- Lint: `pnpm run lint` (config in `.eslintrc.cjs`) · auto-fix: `pnpm run lint:fix`. The config is deliberately lean — style noise (`no-explicit-any`, unused vars, etc.) is OFF; only genuine-bug rules are errors (`react-hooks/rules-of-hooks`, unsafe optional chaining, `no-debugger`). `src/_metronic/**` is ignored as vendored. There are ~61 pre-existing real-bug errors in ~29 legacy files; don't add new ones.
- Preview prod build: `pnpm run preview`

## Architecture
- Entry `src/main.tsx`. App code under `src/app/` (pages in `src/app/pages/`), shared `components/`, `hooks/`, `contexts/`.
- Theme/scaffolding is `src/_metronic/` (vendored Metronic) — treat as third-party; prefer composing over editing it.
- State: Redux Toolkit (`src/redux/`) + React Query (`@tanstack/react-query`) for server state. Use React Query for data fetching/caching; Redux for client/UI state.
- API calls go through `src/services/` (axios). Don't call axios directly from components — add/extend a service.
- Path aliases (in `vite.config.ts` + tsconfig): `@ @app @pages @components @hooks @services @utils @redux @models @constants @metronic`.

## UI standard — READ THIS BEFORE WRITING ANY UI

**The standard is MUI + Tailwind, composed from the shared kit. This is not a preference to weigh against what a file already does — it is the target for all new and edited UI.** Ant Design, Mantine, react-bootstrap and raw Bootstrap markup are legacy; never reach for them, and convert what you touch.

The bar for every component: **reusable, responsive, accessible, theme-aware (light AND dark), enterprise-grade.** If you find yourself styling something per-screen, you are doing it wrong — build it once in the kit and consume it.

### This is lint-enforced — you cannot merge a violation
`.eslintrc.cjs` fails the build on banned primitives. Don't add `eslint-disable` to get around it; fix the code or the rule is pointless.
- **`no-restricted-imports`** (always error, everywhere except the kit): importing `Switch` from `@mui/material`.
- **`no-restricted-syntax`** (error): native `type="date"|"datetime-local"|"time"|"month"`, `<style>` blocks, Bootstrap component classes (`form-switch`, `form-control`, `btn btn-`, `card-body`, `badge badge-`), `toLocaleDateString()`.
- **The ratchet** (`.eslint-ui-baseline.cjs`, auto-generated): 286 legacy files predate these rules and would make the build permanently red, so they emit *warnings* instead. **Every file not in that list errors.** New code can't regress; the list can only shrink. Regenerate after a burn-down pass with `pnpm run lint:ui:baseline`, and delete paths as you fix them — never add one.
- Severity is split across two rules on purpose: the ratchet downgrades `no-restricted-syntax` for baselined files, so the raw-`Switch` ban lives in `no-restricted-imports` where the ratchet can't reach it.

Current burn-down: **0 errors, ~1375 warnings.** The warnings are the migration backlog, not noise.

### The shared kit is the first stop

**READ `src/app/modules/common/components/ui/README.md` FIRST.** It is the
component index — what exists, what to use instead of building, which of the two
kits (MUI vs Tailwind twin) a screen belongs on, and the two Metronic/Tailwind
traps that silently break styling. Searching one folder and finding nothing is
how this codebase ended up with four close buttons and three dropdowns; the
index is there so that search is one lookup.

`src/app/modules/common/components/ui/` (barrel: `@app/modules/common/components/ui`) — plus the MUI-free Tailwind twin in `ui/tw/`, and shared inputs in `src/app/modules/common/inputs/`.
**Search the kit before building anything.** If the right component doesn't exist, BUILD IT IN THE KIT (generic, documented, responsive, theme-aware) and consume it from the feature — do not inline it in a page.

Canonical primitives — use these, don't reinvent or fork:
| Need | Use | Never |
|---|---|---|
| Date | `WtDateField` | `<input type="date">`, `<TextField type="date">` |
| Date + time | `WtDateTimeField` | `type="datetime-local"` |
| Time | `TimeWheelField` | `<input type="time">` |
| Wizard / steps | `WtStepper` | hand-rolled circles, Metronic `.stepper` SCSS |
| Buttons | `WtButton` / `WtIconButton` | `<button className="btn btn-primary">` |
| Toggle | `WtSwitch` / `WtSwitchField` | raw `<Switch>`, `.form-switch` |
| Modal | `GlassDialog` + `GlassHeader` | react-bootstrap `<Modal>` |
| Card / surface | `GlassCard` / `GlassSurface` | `<div className="card">` |
| List / collection layout | `AutoGrid` (auto-fit tile grid) | stretched single-column rows, hand-rolled `gridTemplateColumns` breakpoints |
| List / page header | `ListHeader` (title + subtitle + actions) | copy-pasted `Stack direction="row" justifyContent="space-between"` toolbars |
| Chip / badge | `ToneChip` | `<span className="badge">` |
| Single-select modal | `OptionPickerDialog` | bespoke option lists |
| Drag-to-reorder | `ReorderableGroup` + `DragHandle` | up/down arrow buttons |
| Employee picker | `EmployeeSelectionDialog` | bespoke pickers |

**Why native inputs are banned:** `<input type="date">` renders the *browser's* picker. It is unstyleable, formats in the OS locale (`dd-mm-yyyy` vs `mm/dd/yyyy`), and stays light-on-white in dark mode because the calendar popup is browser chrome. `WtDateField` wraps `@mui/x-date-pickers`, so it inherits the theme, is correct in dark mode, and renders the company date format.

### Dates — company standard is `YYYY.MM.DD`
Official format guide: **`2025.12.03`** ✅ · `2025-12-03` ❌ (dashes) · `03.12.2025` ❌ (day first).
Single source of truth: `src/utils/dateFormats.ts`.
- **Display** (anything a human reads — fields, tables, cards, exports, PDFs): `formatDate()` / `formatDateTime()` / `DATE_FORMATS.DISPLAY`. Never `toLocaleDateString()` and never an inline format string.
- **Wire** (network/DB): ISO `DATE_FORMATS.WIRE` (`YYYY-MM-DD`). This must stay ISO — the backend parses it. Don't "fix" wire values to dots.

### Styling rules
- Layout/spacing: Tailwind utilities or MUI `sx`. **No new `.css` files, no `<style>` blocks, no inline `style={{}}`, no Bootstrap layout classes** (`row`, `col-*`, `d-flex`, `px-5`, `mt-7`, `fw-bold`, `text-muted`, `form-control`, `btn`).
  - Exception: `KTIcon`'s `fs-*` classes are the icon font's own sizing API — keep those.
- Colors: MUI theme (`text.primary`, `background.paper`, `divider`, `action.hover`) or kit tokens. **Never hardcode `#fff`/`#000`/greys** — that is what breaks dark mode. For accent tiles use `toneSurface(trio, dark)`.
- Dark mode: the palette SSOT is `src/app/theme/githubDark.ts` (GitHub/VS Code dark). CSS consumes it via `var(--gh-*)`. Any dark rule keys off `[data-bs-theme="dark"]` — **never `@media (prefers-color-scheme: dark)`**, which follows the OS instead of the in-app toggle.
- Responsive is mandatory: every surface must work from 360px to ultrawide. Use MUI breakpoint objects (`{ xs, sm, md }`) / Tailwind prefixes, `minmax(0, 1fr)` in grids, and `minWidth: 0` on flex children so text can truncate.
- **Density — fill the width, no dead whitespace** (a repeated review finding — treat as a default, not a per-task ask): a list of a few fields spread across a full-width row leaves a big empty gutter and reads poorly. Instead: cap the page at `maxWidth ~1600, mx: "auto"`, lay collections out with **`AutoGrid`** (auto-fit tiles that fill wide screens and collapse to one column on mobile), and pack each card — title + muted meta pills + a 2-line clamped description + a bottom-pinned action row (`flex:1` spacer for equal-height tiles). Wrap any wide `Table` in an `overflowX: "auto"` container with a `minWidth` so mobile scrolls instead of the page. Every list view starts with `<ListHeader …/>`. Reference implementation: `pages/employee/recruitment/RequisitionsView.tsx`.

## Conventions
- TypeScript strict. No `any`; type API responses (`src/models/`, `src/types/`). Zod/Yup available for runtime validation — validate external data.
- Forms: Formik or react-hook-form (both present) — match whatever the surrounding page already uses; don't mix within one form.
- Notifications: prefer the kit's `toast` / `confirmDialog` / `alertDialog` (`ui/feedback.ts`). react-toastify / sonner / sweetalert2 all exist from earlier eras; don't add new direct usages.
- Heavy libs (PDF, charts, maps, xlsx) are code-split via `manualChunks` in `vite.config.ts`. Prefer lazy-loading heavy routes/components; don't import a vendor bundle into a hot common path.

## Billing module (planned, not yet built)
Plan: [../BILLING/INDEX.md](../BILLING/INDEX.md). The project Billing tab already exists as a placeholder — `pages/employee/entity/detail/sections/BillingSection.tsx`, registered in `detail/facets.ts` and rendered from `EntityDetailPage.tsx`. It predates the UI standard (raw divs, hardcoded hex), so **replace it wholesale rather than extending it**.

## Dependencies & CI
- **Security floors** for transitive packages live in `pnpm-workspace.yaml` → `overrides` (9 entries, each pinned to the lowest patched version from its advisory). After any dependency change run `pnpm audit --audit-level high` — CI blocks on high/critical, and reports moderate/low without blocking.
- **The webpack toolchain was removed** (2026-08-10): `webpack`, `webpack-cli`, `css-loader`, `mini-css-extract-plugin`, `sass-loader`, `@types/sass-loader`, the two RTL plugins, `remove-files-webpack-plugin`, `del`. No config file, script, or import referenced any of them — leftover Metronic scaffolding, and the only path to a high-severity `svgo` advisory. Builds are Vite-only. **`sass` stays** (Vite compiles the Metronic `.scss`). Don't reintroduce them.
- **CI** — [.github/workflows/ci.yml](.github/workflows/ci.yml), on PR to `main` and push to `main`: guard self-test → secret/hygiene scan on changed files → eslint on changed files → build (`tsc && vite build`) → dependency audit. Same checks as the hooks below, but unbypassable — make it a required status check.

## Git hooks (husky + lint-staged)
Installed by `pnpm install` (`prepare: husky` → `core.hooksPath=.husky/_`). Bypass with `--no-verify` only when you mean to turn off *every* check; for one intentional line, put `guard:allow` in a comment on it instead.
- **pre-commit** (<5s) — `lint-staged`, which stashes unstaged work first so a partially-staged file is checked exactly as it will land. Runs [scripts/hooks/guard.mjs](scripts/hooks/guard.mjs) on every staged file (secret filenames, ~10 credential patterns, merge-conflict markers, `debugger`, `.only(`, >2 MB files) and `eslint --quiet` on staged `.ts/.tsx`.
- **commit-msg** — Conventional Commits (`feat(scope): subject`); `Merge`/`Revert`/`fixup!` exempt.
- **pre-push** (~90s) — blocks direct pushes to `main`/`master`/`develop`, then `tsc --noEmit` + `eslint --quiet` on files changed vs `origin/main` (same rule as CI — a whole-repo lint gate would trip the legacy warning backlog).
- **post-merge / post-checkout** — print a hint when `pnpm-lock.yaml` moved. Never auto-installs.
- `pnpm run hooks:test` runs the guard's own assertions.

## Before saying a change is done
Run `pnpm exec tsc --noEmit` (or a full `pnpm run build`) — it must pass clean. Run `pnpm run lint` on files you touched (warnings are informational; don't introduce new errors).

## Auto-verify hook
A `PostToolUse` hook (`../.claude/settings.local.json` → `../.claude/hooks/typecheck.sh`) runs after any Edit/Write to a `.ts`/`.tsx` file in this project, in the background: whole-project `pnpm exec tsc --noEmit` plus `pnpm exec eslint --quiet` on just the edited file. Any type error or lint **error** (warnings excluded) is surfaced automatically.

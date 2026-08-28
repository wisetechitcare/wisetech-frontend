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

## Billing module (partly built)
Plan: [../BILLING/INDEX.md](../BILLING/INDEX.md). The project Billing tab already exists as a placeholder — `pages/employee/entity/detail/sections/BillingSection.tsx`, registered in `detail/facets.ts` and rendered from `EntityDetailPage.tsx`. It predates the UI standard (raw divs, hardcoded hex), so **replace it wholesale rather than extending it**.

<<<<<<< HEAD
## Billing Operations (built)
Design doc: [../BILLING_OPERATIONS.md](../BILLING_OPERATIONS.md). Pages under `pages/billing/operations/`, client in `services/billingOperations.ts`.

- **Monitoring, not editing.** Project/client/deliverable/amount data is read-only on these screens. The only write is the status transition, and its dropdown is populated from the server's `allowedTransitions` — never hardcode the status list in the UI.
- **Server-side filter/sort/pagination.** Don't switch the list to client-side paging: the totals have to be right across pages, that's the whole point of the screen.
- Each KPI tile is a saved query — clicking filters the table beneath it. Statistics share the list's scoping so the two can't disagree.
- Reuses `BillingTable`, `BillingTimeline`, `BillingStatsCard`, `BillingStatusBadge`, `BillingPageHeader`. New status tones go in `BILLING_STATUS_TONES`, not in the page.

## Payment Collection (built)
Design doc: [../PAYMENT_COLLECTION.md](../PAYMENT_COLLECTION.md). Pages under `pages/billing/payments/`, client in `services/payments.ts`.

- **A "payment" row in the list IS a Billing Operation** — there's no separate payment-collection entity to fetch. Don't build a second data model for it.
- **Every payment is its own transaction.** `RecordPaymentDialog` records ONE receipt and closes; recording payment 2 of 3 is opening it again. Never build a multi-line batch form here.
- The overpayment checkbox only appears once amount actually exceeds outstanding (compared in paise, not floats) — don't show it unconditionally.
- `readyForInvoice` and `invoiceNumber: null` are already on every payload — the Tax Invoice phase filters on the former and fills the latter. No shape change needed there.

## Proforma Management (built)
Design doc: [../PROFORMA_MANAGEMENT.md](../PROFORMA_MANAGEMENT.md). Pages under `pages/billing/proformas/`, client in `services/proformas.ts`.

- **Two URLs, two jobs:** `/billing/proformas/:id` is the read-only repository record (revision chain, compare, activity); `/billing/proformas/:id/edit` is the document editor. Don't merge them.
- The tree groups revisions under their parent and **pages by document, not version** — one proforma with six revisions must not eat a page.
- Status buttons come from the server's `allowedStatuses` per version. Never hardcode the lifecycle in the UI.
- "Archived" is a switch, not a status option — the list is a deliberate either/or so the count is trustworthy.
- The Document tab renders the version's **stored HTML** via `DocumentSheet`. Never re-render a version for display.

## Billing Document Engine (built — Proforma + Tax Invoice live)
Design doc: [../BILLING_DOCUMENT_ENGINE.md](../BILLING_DOCUMENT_ENGINE.md) (this phase); [../DOCUMENT_ENGINE.md](../DOCUMENT_ENGINE.md) (original). Editor pages under `pages/billing/documents/`, client in `services/documents.ts`; repository pages under `pages/billing/proformas/`, client in `services/proformas.ts` (also serves the generic `/billing/documents` mount).

- **`DocumentSheet` injects server-rendered HTML and patches it — it does not re-implement the template.** The same HTML string is what the PDF and Word export print, so a React version of the layout would immediately drift. Never build one.
- Live editing writes `textContent` on `[data-field]` spans the server emitted. `textContent`, never `innerHTML` — typed text must never be parsed as markup.
- The left panel (`DocumentPropertiesPanel`) is **built from the template's `fieldPolicy`**, not hardcoded. A template that adds a field gets an input for free; `fieldMeta.ts` only supplies the label/grouping (with a title-case fallback).
- The A4 sheet is a fixed 210mm scaled by transform. Don't make it responsive — it is page geometry, not a layout.
- Proforma is a `kind`, not a route. The list and editor work unchanged for Tax Invoice and the rest — **generating a Tax Invoice reuses `openDocument({ kind: "TAX_INVOICE", subjectId })`, the exact call Proforma uses**; see the button on `PaymentDetailPage.tsx`'s Invoice panel, gated on `readyForInvoice`. Don't build a second generation flow for a new kind.
- **`NON_REVISABLE_KINDS` in `DocumentEditorPage.tsx` mirrors the backend's `revisable: false` registry entries** — UI-only hint (hides the Revise button), the server is the actual enforcement. Keep the two lists in sync when a new non-revisable kind goes live.
- `downloadWord()` (`services/proformas.ts`) streams a binary blob (`responseType: "blob"`), unlike `accessProforma`'s PDF path which returns a JSON presigned URL — don't conflate the two response shapes.
=======
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
>>>>>>> a167b739d1f4de34d7c3a952e654ab5b9cc5d194

## Before saying a change is done
Run `pnpm exec tsc --noEmit` (or a full `pnpm run build`) — it must pass clean. Run `pnpm run lint` on files you touched (warnings are informational; don't introduce new errors).

## Auto-verify hook
<<<<<<< HEAD
A `PostToolUse` hook (`../.claude/settings.local.json` → `../.claude/hooks/typecheck.sh`) runs after any Edit/Write to a `.ts`/`.tsx` file in this project, in the background: whole-project `npx tsc --noEmit` plus `npx eslint --quiet` on just the edited file. Any type error or lint **error** (warnings excluded) is surfaced automatically.

## Project Financial Workspace (built)
Project → Billing. Pages under `pages/employee/entity/detail/sections/billing/`, client in `services/projectBilling.ts`. `sections/BillingSection.tsx` is now a 3-line adapter that passes `lead.id` in.

- **A CONSUMER of Billing, never a copy.** One call to `/billing/projects/:id/workspace` returns every number pre-computed; documents are served by Billing's own access endpoint; **every write navigates INTO Billing**. Don't add a mutation here.
- **The Billing tab is URL-addressable (`?tab=billing`)** — `EntityDetailPage` syncs `activeTab` to a search param (written with `replace`, so flipping tabs doesn't stack history). This is load-bearing: it's the return address handed to Billing. Don't revert it to plain `useState`.
- **Return context** (`hooks/useReturnContext.ts`): the ORIGIN states where Back goes via `withReturnContext()`; the destination resolves it with `useReturnContext(fallback)`, falling back to its own parent. Wired into the Proforma/Payment/Request/Operation detail pages — arriving from a Billing list behaves exactly as before. Carried in `history.state`, not the URL: it's navigation bookkeeping, and a `?returnTo=` would make every detail link unshareable.
- **Sections 3 (Timeline) and 10 (Activity Feed) are ONE dataset** — `ActivityFeed` renders both via a `variant`. Two components would be two places for the same list to go stale.
- Proformas reuse `ProformaTreeRow` verbatim for revision grouping; the other three tables are `BillingTable` + a column set. Financial Summary is `BillingSummaryCard`. Nothing here re-implements a Billing primitive.
- **Drill-down**: `ProformasPage`/`PaymentCollectionPage`/`InvoicesPage` now read `?projectId=` and show `ProjectFilterBanner` when filtered — a silent filter is the fastest way to make people distrust a list.
- ⚠️ `capabilities` from the server is **advisory** (backend has no action-level write gates yet). It drives disabled states only — don't treat a hidden button as security.
=======
A `PostToolUse` hook (`../.claude/settings.local.json` → `../.claude/hooks/typecheck.sh`) runs after any Edit/Write to a `.ts`/`.tsx` file in this project, in the background: whole-project `pnpm exec tsc --noEmit` plus `pnpm exec eslint --quiet` on just the edited file. Any type error or lint **error** (warnings excluded) is surfaced automatically.
>>>>>>> a167b739d1f4de34d7c3a952e654ab5b9cc5d194

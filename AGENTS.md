# WiseTech Frontend

HRMS web client (Metronic-based admin theme). React 18 + TypeScript + Vite. Pairs with `../wisetech-backend`.

**Team handbook:** [docs/HANDBOOK.md](docs/HANDBOOK.md) · **Strict DRY:** [docs/DRY.md](docs/DRY.md) · **Tenancy:** [docs/multi-tenancy.md](docs/multi-tenancy.md)

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

## Rule zero — reuse before you write. This applies to everyone, every task.

**1. Cross-check the codebase before writing anything.** Not just UI — services, hooks, utils,
schemas, queries, scripts. Grep for the concept, for similar names, for the canonical pattern.
If the search is wide, map it properly before typing.

**2. If it does not exist, build it GLOBAL and reusable FIRST, then consume it.** Never inline a
one-off in a page intending to extract it later. Later does not come, and the second copy is
written by someone who never knew the first existed.

**3. If a shared thing is missing what you need, add it to the shared thing.** Do not work around
it locally — that is precisely how the second implementation gets written.

**4. No messy code, and nothing done blindly.** Verify against the tree. A claim in a doc, a
comment, or a green typecheck is not proof; check the thing itself.

> **This has been got wrong, and it is worth knowing how.** A recruitment drill-down was once
> built on a hand-written `<Table>` while the shared table engine sat one search away and was
> read past. Users silently lost sorting, column prefs and export. Searching is not enough; act
> on what the search returns. Today that engine is kit **`DataTable` only**.
>
> The root cause was an index gap: the kit README covered `ui/` only, while the engine lives one
> level up in `components/`. **When a search fails, fix the index too, not just the code.**

## Design system — FINAL (ADR-001) + Storybook MCP

**The design system is final and is the default for all UI.** It is **ADR-001** (`docs/DESIGN_SYSTEM_DECISION.md`):
the WiseTech kit as owned code from **shadcn/ui, style `base-maia`, on Base UI + Tailwind v4** — shadcn's shapes,
type and motion, with **our** brand colours (`src/ds/styles/tokens.css`), effects (`src/ds/effects`) and typeset
(Inter Variable, `src/ds/styles/typeset.css`). React Aria for date, time and number fields; Animate UI for primitive
motion — never Radix. Tokens are CSS variables in `src/ds/styles/globals.css`, components in `src/ds/ui`, patterns in
`src/ds/patterns`. Where any older doc or rule names an MUI kit as the standard, **`src/ds` wins**.
Storybook (`pnpm storybook`, port 6006) is the catalogue; its MCP server is
registered for agents as **`wisetech-storybook`** (`http://localhost:6006/mcp`, needs Storybook running).

When working on UI or stories, use the `wisetech-storybook` MCP tools first:
- **Never assume a component's props.** Check them with `docs-list` and `docs-show` (or `docs-show-story`); use only
  documented props or ones shown in existing stories. If a prop isn't documented, ask — don't guess from source.
- **Before creating or editing a story**, call `get-storybook-story-instructions` and follow its conventions.
- **After any change that affects how UI looks or behaves**, run `test-run` for the affected stories (it includes the
  axe accessibility checks) and fix failures before calling the work done. `stories-preview` gives links to check visually.
- Tests: `pnpm test` runs the unit suite only (CI); `pnpm test-storybook` runs every story as a browser test.

## UI standard — READ THIS BEFORE WRITING ANY UI

**The standard is the `src/ds` kit (shadcn `base-maia` on Base UI + Tailwind v4), composed from its components and patterns. This is not a preference to weigh against what a file already does — it is the target for all new and edited UI.** MUI, Emotion, Ant Design, Mantine, react-bootstrap, Metronic and raw Bootstrap markup are legacy; never reach for them, and convert what you touch (a file you edit loses its MUI).

The bar for every component: **reusable, responsive, accessible, theme-aware (light AND dark), enterprise-grade.** If you find yourself styling something per-screen, you are doing it wrong — build it once in the kit and consume it.

### This is lint-enforced — you cannot merge a violation
`.eslintrc.cjs` fails the build on banned primitives. Don't add `eslint-disable` to get around it; fix the code or the rule is pointless.
- **`no-restricted-imports`** (always error, everywhere except the kit): importing `Switch` from `@mui/material`.
- **`no-restricted-syntax`** (error): native `type="date"|"datetime-local"|"time"|"month"`, `<style>` blocks, Bootstrap component classes (`form-switch`, `form-control`, `btn btn-`, `card-body`, `badge badge-`), `toLocaleDateString()`, a hardcoded `₹` in any string/template/JSX, an inline `{ style: 'currency' }`, and the `dollar` keenicon.
- **The ratchet** (`.eslint-ui-baseline.cjs`, auto-generated): 286 legacy files predate these rules and would make the build permanently red, so they emit *warnings* instead. **Every file not in that list errors.** New code can't regress; the list can only shrink. Regenerate after a burn-down pass with `pnpm run lint:ui:baseline`, and delete paths as you fix them — never add one.
- Severity is split across two rules on purpose: the ratchet downgrades `no-restricted-syntax` for baselined files, so the raw-`Switch` ban lives in `no-restricted-imports` where the ratchet can't reach it.

Current burn-down: **0 errors, ~1375 warnings.** The warnings are the migration backlog, not noise.

#### Legacy-UI guard (`wisetech/no-legacy-ui`)
A second, separate ratchet bans the old UI stack in new code. It reports (1) runtime imports of `@mui/material|system|lab|x-*`, `@emotion/*`, `react-bootstrap` and `material-react-table` (`import type` / `{ type X }` are fine; `@mui/icons-material` stays with `no-legacy-icons`), and (2) Bootstrap/Metronic-only classes in any `className` string, including inside `cn()` / ternaries / template literals (`d-flex`, `fw-bold`, `col-lg-6`, `btn-primary`, `text-muted` ...). Each message names the Tailwind / `src/ds` replacement. The token list lives in `eslint-rules/bootstrapClasses.cjs` and only holds names Tailwind does NOT define.
- Files that already offend are listed in `.eslint-legacy-ui-baseline.cjs` and **warn**; every other file **errors**. No directory has a permanent exemption.
- **The list only shrinks.** After migrating a file, regenerate with `pnpm run lint:legacy-ui:baseline` (a full-`src` lint, takes minutes). Never add a path by hand.
- `scripts/mui-free-modules.test.ts` (`MUI_FREE_ROOTS`) fails if a migrated module transitively reaches MUI again; `node scripts/legacy-ui-reach.mjs <dir>` prints the chain.

### The shared kit is the first stop

**Read these three before any UI decision — in this order:**
1. **`src/ds/Introduction.mdx`** — the principles: token roles not hex, one meaning per colour, Title Case titles,
   UPPERCASE structural headings (`heading-case`), floating labels, icons cards-right / rows-left / dialogs-left,
   status never colour alone, effects for moments only.
2. **`src/ds/KitMap.mdx`** — the component index: every legacy component (`Wt*`, `Glass*`, `ToneChip`,
   `MaterialTable`, …) and the kit component that replaces it. This is the SSOT for "what do I use instead"; don't
   copy its table elsewhere.
3. **The component's `*.stories.tsx`** (or `docs-show` via the MCP) — use the variant/recipe the catalogue shows for
   that job (e.g. row icon actions = Button `tinted`). Never choose a variant, size or style yourself.

**STRICT: `src/ds` IS the globally shared component library (2026-11-16).** It replaces the legacy shared
components from now on. A new shared component is created only in `src/ds`, with stories, never under
`components/`. If the kit lacks something, update Storybook itself (extend or add it in `src/ds`), never compose
a one-off look in a screen.

**Legacy components are thin adapters over the kit.** `@app/modules/common/components/ui` (and `ui/tw/`) keep their
old prop names for existing call sites and forward to `src/ds` — no own look, palette or MUI. New code imports the
kit directly. Never build new UI outside `src/ds`. If the kit lacks something: extend an existing component or
variant, else add it to `src/ds` with a story — and ask before changing a finalised visual spec or adding a new pattern.
`src/ds/consistency.test.ts` fails the build on a hand-built button, input, textarea, kbd or card.

Exceptions the KitMap doesn't cover yet:
- **Data tables:** Patterns/Data Table (`src/ds/patterns/data-table`) is the **only** table. MaterialTable /
  MaterialTableImpl / `material-react-table` are gone. Never hand-write a `<Table>` for app data lists.
- **Address / map location:** `SmartLocationPicker` (`components/SmartLocationPicker.md`) — controlled; free
  Nominatim, no key. Never a second Leaflet map, Google/OpenCage geocoding (both keys dead), or axios for
  third-party calls.

**Why native inputs are banned:** `<input type="date">` renders the *browser's* picker. It is unstyleable, formats in the OS locale (`dd-mm-yyyy` vs `mm/dd/yyyy`), and stays light-on-white in dark mode because the calendar popup is browser chrome. The kit's DatePicker / DateField / TimeField (React Aria) follow the theme, work in dark mode, and render the company date format whatever the locale.

### Dates — company standard is `YYYY.MM.DD`
Official format guide: **`2025.12.03`** ✅ · `2025-12-03` ❌ (dashes) · `03.12.2025` ❌ (day first).
Single source of truth: `src/utils/dateFormats.ts`.
- **Display** (anything a human reads — fields, tables, cards, exports, PDFs): `formatDate()` / `formatDateTime()` / `DATE_FORMATS.DISPLAY`. Never `toLocaleDateString()` and never an inline format string.
- **Wire** (network/DB): ISO `DATE_FORMATS.WIRE` (`YYYY-MM-DD`). This must stay ISO — the backend parses it. Don't "fix" wire values to dots.

### Currency — it follows the BRANCH, never a hardcoded glyph
Single source of truth: `src/utils/currency.ts` + `src/hooks/useCurrency.ts`. Resolution order is the branch's own `Branches.currency`, then the currency of the branch's country (from the geo directory, which carries one for all 250), then INR.

- **Formatting**: `formatCurrency()` / `formatCurrencyDecimal()` / `formatCurrencyRounded()` / `formatCurrencyCompact()`. Omit the currency argument — they use the active one. Pass one ONLY to render an amount that is deliberately not in the viewer's currency — typically the `currency` the API returned on a record (recruitment requisitions, offers, approval details).
- **Always written in English.** `getCurrencyLocale()` is `en-IN` for lakh/crore currencies and `en-US` for the rest — the backend's rule exactly. Never format in a currency's home locale: that printed Arabic-Indic digits, RTL marks and decimal commas inside English screens.
- **Money inputs are the kit's NumberField (currency)** (`WtMoneyField` on screens not yet migrated) — the currency sits inside the frame and the hint reads the figure back as money. A salary is always the **full annual amount**; never label a field in lakhs or LPA. The salary floor lives in `utils/ctc` (twin of the backend's).
- **A glyph on its own**: `getCurrencySymbol()` in text, or `<CurrencySymbol />` in an icon slot (`IconBox` and `StatTile` take a node). The `dollar` keenicon is banned — it is currency-specific. For a *category* icon on a money feature use `wallet`.
- **Parsing a formatted amount back to a number**: strip `/[^0-9.-]/g`. Never name the characters to remove — `replace(/[₹,]/g, '')` returns 0 for every other currency.
- **Building your own number format** (Excel `numFmt` is the real case): `usesIndianGrouping()` tells you whether the pattern needs lakh/crore sections, because a numFmt carries its own grouping and Excel will not infer it from a locale.
- **Non-React code** (exports, analytics utils) is served by the module-level active currency, published by `useCurrency` which `App.tsx` mounts. It is DISPLAY ONLY — never use it to decide a stored amount, a comparison or a total.
- **The one exception**: an amount fixed by statute. India's professional-tax slabs are rupees by law and must not follow the branch; those two files are listed as lint overrides in `.eslintrc.cjs`.

### Styling rules
- Layout/spacing: Tailwind utilities on the kit's spacing scale. **No new `.css` files, no `<style>` blocks, no inline `style={{}}`, no MUI `sx`, no Bootstrap layout classes** (`row`, `col-*`, `d-flex`, `px-5`, `mt-7`, `fw-bold`, `text-muted`, `form-control`, `btn`). To set a CSS variable a story shows inline, use a Tailwind arbitrary property (`className="[--tint:var(--cta-danger)]"`).
  - Legacy exception: `KTIcon`'s `fs-*` classes are the icon font's own sizing API. New icons are Lucide (`lucide-react`; `DynamicIcon` for icon names stored as data).
- Colours: kit token roles only (`bg-background`, `text-muted-foreground`, `border-border`, `primary`, `success-soft`…; status/hue through the `tone` prop, `src/ds/lib/tone.ts`). **Never hex, `#fff`/`#000` or greys** — that is what breaks dark mode and per-tenant brand.
- Dark mode: kit tokens redefine themselves under `.dark` (toggled on `<html>` by `src/app/theme/ColorMode.tsx`); write dark tweaks with Tailwind's `dark:` variant. Legacy CSS still keys off `[data-bs-theme="dark"]`. **Never `@media (prefers-color-scheme: dark)`**, which follows the OS instead of the in-app toggle.
- Effects: one implementation per effect from `src/ds/effects`, for moments only (KPI counters, an insight highlight, real celebrations) — never in tables, forms, wizards or approvals; nothing under reduced motion.
- Responsive is mandatory: every surface must work from 360px to ultrawide. Use Tailwind breakpoint prefixes, `minmax(0, 1fr)` in grids, and `min-w-0` on flex children so text can truncate.
- **Density — fill the width, no dead whitespace** (a repeated review finding — treat as a default, not a per-task ask): a list of a few fields spread across a full-width row leaves a big empty gutter and reads poorly. Instead: cap the page at `max-w-[1600px] mx-auto`, lay collections out with the **Auto Grid** pattern (auto-fit tiles that fill wide screens and collapse to one column on mobile), and pack each Card — title + muted meta pills + a 2-line clamped description + a bottom-pinned action row (`flex-1` spacer for equal-height tiles). Wrap any wide table in an `overflow-x-auto` container with a min width so mobile scrolls instead of the page. Every list view starts with the **Page Header** pattern. Reference layout (pre-kit, layout only): `pages/employee/recruitment/RequisitionsView.tsx`.

## Conventions
- TypeScript strict. No `any`; type API responses (`src/models/`, `src/types/`). Zod/Yup available for runtime validation — validate external data.
- Forms: Formik or react-hook-form (both present) — match whatever the surrounding page already uses; don't mix within one form.
- Notifications: the kit's Toaster and Patterns/Confirm Dialog (see KitMap). Until a screen moves, call the existing helpers `toast` / `confirmDialog` / `alertDialog` (`ui/feedback.ts`) rather than a library. react-toastify / sonner / sweetalert2 all exist from earlier eras; don't add new direct usages.
- Heavy libs (PDF, charts, maps, xlsx) are code-split via `manualChunks` in `vite.config.ts`. Prefer lazy-loading heavy routes/components; don't import a vendor bundle into a hot common path.

## Lead / Entity module
Docs live in **[`../docs/leads/`](../docs/leads/00_START_HERE.md)** — start at `00_START_HERE.md`; see also the [product audit](../docs/leads/LEAD_WORLD_CLASS_AUDIT.md) and [target architecture](../docs/leads/LEAD_CRM_ARCHITECTURE.md). Screens under `pages/employee/entity/`.

- **Lead-as-Master: the "project" IS the lead** — one row, one `prefix`, inquiry through billing. `EntityDetailPage` renders both lifecycles on one record; the Project view opens on a status whose `isProjectTrigger` flag is set — **never on `name === "Received"`**.
- **The Source column renders blank today.** `EntityTablePage.tsx:692` and `ContactLeadsOverview.tsx:71` read dead columns (`source`, `sourceId`, `leadSource`); the live ones are `leadDirectSource` / `leadSourceType`. **`SummarySection.tsx:135` already has the correct precedence — copy it, don't reinvent it.** The Source *filter* compares the same empty value.
- **Leads Configure is the UI reference for every other configuration screen.** "Make them the same" means porting the Leads layout INTO the other screen — never restyling Leads to match something else.
- `EntityTablePage.tsx` (~2.4k lines) downloads the entire table and evaluates ~30 filter predicates client-side. **Don't add a 31st** — the target is server-side query params + `manualPagination` + row virtualization, all of which the table kit already supports.
- The Activity/Timeline component is **written and not mounted**, and no backend write path fills it yet. Mounting is ~10 lines once `connections` has writers — don't build a second timeline in the meantime.

## Billing module
Pages under `pages/billing/`; the project's Billing tab is `pages/billing/project/` (mounted by `EntityDetailPage`).
Clients: `services/bills.ts` (bills, payments, the project tab), `services/billingTrackers.ts` (Billing / Proforma /
Tax Invoice trackers + dashboard), `services/billingDocuments.ts` (a document's repository record), `services/documents.ts`
(the document engine), `services/billingConfig.ts` (Configure).

- **A bill covers one or more stages, in full or in part** — each slice is a bill line; what is billed on a stage is the
  sum of its live lines, never more than its value. A bill over several stages has one row per stage on the Billing tab,
  and each row carries its own `slice` of the bill's money: **columns and totals read `row.slice`, never the whole bill**,
  or a multi-stage bill is counted twice. The allocation rules (and their test) are in `project/projectBillingRules.ts`.
- Payments are recorded per bill; `SplitPaymentDialog` shares one transfer across several bills (all or none).
- Documents: one route pair for Proforma and Tax Invoice alike — `/billing/documents/:id` (repository record) and
  `/billing/documents/:id/edit` (editor). Old `/billing/proformas/:id` links redirect.
- **The document editor is a shared module**, `src/modules/document-editor/` (`DocumentEditor` + a per-kind
  `DocumentProfile`). Billing's profile is `pages/billing/documents/billDocumentProfile.tsx`. A new document kind
  (MOM, offer letter) is a backend registry entry + resolver + template and a frontend profile — never a copied editor.
  `DocumentSheet` injects the server's HTML and patches `[data-field]` spans with `textContent`; never re-implement the
  template in React.
- Status chips: `BillingStatusBadge`; new tones go in `BILLING_STATUS_TONES`. Labels come from Billing → Configure.
- ⚠️ `capabilities` from the server is **advisory** — bill writes only require a login (a deliberate decision). It drives
  disabled states only; a hidden button is not security.

## Dependencies & CI
- **Security floors** for transitive packages live in `pnpm-workspace.yaml` → `overrides` (9 entries, each pinned to the lowest patched version from its advisory). After any dependency change run `pnpm audit --audit-level high` — CI blocks on high/critical, and reports moderate/low without blocking.
- **The webpack toolchain was removed** (2026-08-10): `webpack`, `webpack-cli`, `css-loader`, `mini-css-extract-plugin`, `sass-loader`, `@types/sass-loader`, the two RTL plugins, `remove-files-webpack-plugin`, `del`. No config file, script, or import referenced any of them — leftover Metronic scaffolding, and the only path to a high-severity `svgo` advisory. Builds are Vite-only. **`sass` stays** (Vite compiles the Metronic `.scss`). Don't reintroduce them.
- **CI** — [.github/workflows/ci.yml](.github/workflows/ci.yml), once per push on every branch (no separate `pull_request` run — a PR reads the checks on its head commit), as parallel jobs sharing [`.github/actions/setup`](.github/actions/setup/action.yml): *Checks* (guard self-test, secret/hygiene scan and eslint on changed files, tests, dependency audit), *Build + preview* (every branch except `main` — `pnpm run build` = `tsc && build:bundle`; `amplify.yml` runs `build:bundle` alone and relies on this job for the typecheck) and *Typecheck* (`main` only, since Amplify builds it). Same checks as the hooks below, but unbypassable — make them required status checks. Full walkthrough: [docs/CI_CD.md](docs/CI_CD.md).

## Git hooks (husky + lint-staged)
Installed by `pnpm install` (`prepare: husky` → `core.hooksPath=.husky/_`). Bypass with `--no-verify` only when you mean to turn off *every* check; for one intentional line, put `guard:allow` in a comment on it instead.
- **pre-commit** (<5s) — `lint-staged`, which stashes unstaged work first so a partially-staged file is checked exactly as it will land. Runs [scripts/hooks/guard.mjs](scripts/hooks/guard.mjs) on every staged file (secret filenames, ~10 credential patterns, merge-conflict markers, `debugger`, `.only(`, >2 MB files) and `eslint --quiet` on staged `.ts/.tsx`.
- **commit-msg** — Conventional Commits (`feat(scope): subject`); `Merge`/`Revert`/`fixup!` exempt.
- **pre-push** (~90s) — blocks direct pushes to `main`/`master`/`develop`, then `tsc --noEmit` + `eslint --quiet` on files changed vs `origin/main` (same rule as CI — a whole-repo lint gate would trip the legacy warning backlog).
- **post-merge / post-checkout** — print a hint when `pnpm-lock.yaml` moved. Never auto-installs.
- `pnpm run hooks:test` runs the guard's own assertions.

## Before saying a change is done
Run `pnpm exec tsc --noEmit` (or a full `pnpm run build`) — it must pass clean. Run `pnpm exec eslint --quiet` on files you touched (warnings are informational; don't introduce new errors). There is no background typecheck hook; these commands are the gate.

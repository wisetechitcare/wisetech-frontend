# Bootstrap → design kit migration

**Status:** Active plan · **Date:** 2026-10-10 · **Owner:** Frontend  
**Companion:** [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) · kit barrel `@app/modules/common/components/ui`

~160 files still import `react-bootstrap`. The kit (Glass*, `WtButton`, `WtField`, `SegmentedControl`, `WtEmptyState`, …) is the target. This doc is the **controlled** way to finish the migration without thrashing every screen at once.

---

## 1. Goal

| In | Out |
|----|-----|
| Replace Bootstrap **chrome** (Card, Modal, Button, Form, pill tabs, Alert) with kit primitives | Rewrite business logic / data fetching |
| One look for filters, CTAs, empty states, dialogs | Pixel-perfect recreation of every Bootstrap quirk |
| Dark mode + Appearance (glass/material) work for free | Migrating Metronic demo / dead template pages |

**Done when:** no production screen imports `react-bootstrap` for UI chrome. Tooltips/overlays may linger briefly if they are the only remaining import — prefer MUI `Tooltip` when touching the file.

---

## 2. Canonical replacements

Use the kit barrel. Do **not** invent one-off maroon/navy hex buttons.

| Old (Bootstrap / ad-hoc) | Use instead |
|--------------------------|-------------|
| `<Card>` / white box + `borderRadius: 12` | `GlassCard` (`preset="section"` / `"tile"` / `"row"`) |
| Card / collection grid that stretches one tile full-bleed | **`AutoGrid`** (default `auto-fill` + max ~400; `stretch` opt-in only) |
| Pill tabs (`#a94442`, rounded-full) | `SegmentedControl` |
| Primary / danger / Cancel buttons | **`WtButton`** only — recipe matrix in kit `ui/README.md` (navy primary + white `ghost` Cancel locked) |
| Status / meta chips, Bootstrap `badge`, private `MetaPill` | **`ToneChip`** / `StatusBadge` only — one chip primitive |
| Dialog Cancel + Submit footer | **`GlassDialogActions`** (or leave `ConfigureFormDialog` / `WtFormDialog`) |
| Icon-only row actions | `WtIconButton` / `ActionIconButton` |
| `<Modal>` | `GlassDialog` (+ `GlassHeader` or `PlainDialogHeader`) |
| Long multi-section form modal | `WtFormDialog` |
| Short master create/edit (`*ConfigureForm`) | `ConfigureFormDialog` + `WtField` / `WtFieldFormik` |
| Labels + inputs / selects / textarea | `WtField` (+ `WtSelect` when search/multi) |
| Raw `TextField select` + `MenuItem` | **`WtField`** with `options` |
| Date / datetime inputs | `WtDateField` / `WtDateTimeField` |
| Empty copy (`text-muted` center) | `WtEmptyState` |
| Section title blocks | `SectionHead` / `EntityPageHeader` / `ListHeader` |
| Toast / confirm | kit `toast` / `confirmDialog` (not raw Swal styling) |
| Page-size pager (non-table) | `Pager` |
| Bootstrap `Alert` | `InlineNotice` / `WtEmptyState variant="error"` |

**Hard rules**

1. **No new** `react-bootstrap` imports in new code or in files you open for migration.  
2. **No** hardcoded brand hex for CTAs (`#a94442`, `#9d4141`, ad-hoc `#1E3A8A` button styles) — use `WtButton` / tokens.  
3. One **PR = one surface or one shared primitive** (see §4). Do not “while I’m here” rewrite an entire module.  
4. Prefer **shared helpers first** (`CommonModal` → kit dialog) so many call sites improve at once.  
5. **Buttons:** new code uses only `WtButton` / `WtIconButton` / `ActionIconButton` / `GlassDialogActions` from the kit barrel. Do **not** mega-PR every remaining MUI `Button` or Bootstrap `btn-*` — replace CTAs when you migrate that surface (opened file). Do not invent a second global button or change the locked navy + white Cancel brand look.
6. **Chips + cards:** status and meta → **`ToneChip`** only (no private `MetaPill`). List collections → **`GlassCard` + capped `AutoGrid`**. Enhance the kit, then migrate consumers.
7. **BE Rule zero parity:** when an API file is opened in the same workstream, grep shared services / Yup `schemas/` / tenant helpers first — same reuse-before-write bar as the FE kit (see BE `docs/HANDBOOK.md`). No mega API rewrite required for a chrome migration PR.

---

## 3. Dropdown & select benchmarks (reference files)

**Before migrating** a legacy select (raw `react-select`, Bootstrap, bespoke `<select>`), open the row that matches your use case and **match behaviour + visuals**, not the old component’s one-off CSS.

Kit index: `src/app/modules/common/components/ui/README.md` (“Component index” + “Labelled inputs”).

### 3.1 Public API (one path — by use case)

| Use case | Use | Engine | Notes |
|----------|-----|--------|-------|
| **Plain single-select in Formik** | **`WtFieldFormik`** | `WtField` → MUI Select | Default. Sandwich floating label. |
| **Standalone labelled select** | **`WtField`** | MUI Select / Autocomplete | Same chrome as Sandwich Add Rule. |
| **Long / searchable single-select** | **`WtField`** / **`WtFieldFormik`** + `searchable` | MUI Autocomplete | Same row height as plain `WtField`. |
| **Toolbar filter (light)** | **`ToolbarFilterSelect`** + `FILTER_TONES` | `WtField` | Not a plain form field. |
| **Org scope on dark tab bar** | **`WtField`** (`icon="bank"`, `tone="#ffffff"`) | `WtField` | Data: `useOrgScope`. |
| **Org scope data only** | `useOrgScope` | — | Feed `WtField` / `ToolbarFilterSelect` / `WtFieldFormik`. |
| **Multi-select + “Add new”** | **`MultiSelectWithInlineCreate`** | Flat: **`WtField multiple`** (Sandwich floating label); grouped: `WtSelect` | `externalCreate` when parent owns the modal. Leads Services/Categories use floating path. |
| **“+ Add …” on any labelled select** | **`addOption={{ onAdd, label? }}`** (`WtAddOption`) | Menu row (default) or label-row button | One prop — do not invent a second Add control. |
| **Create option dialog** | **`CommonModal`** / `GlassDialog` | kit | Phase 2.1 done. |
| **2–5 exclusive options** | **`SegmentedControl`** | — | Prefer over a dropdown. |
| **Legacy: avatar / colour / +Add** | `DropdownInput` | `WtSelect` | **Do not expand** — migrate plain fields to `WtFieldFormik`. |
| **Header company/branch switcher** | `SelectInput` | `WtSelect` | Thin adapter only. |

### 3.2 Engine rules (non-negotiable)

| Rule | Detail |
|------|--------|
| **One public API** | **`WtField` / `WtFieldFormik` / `ToolbarFilterSelect` / `MultiSelectWithInlineCreate`**. Features never invent a select. |
| **One rich menu engine** | **`WtSelect`** — portal, `menuPlacement: auto`, z-index above dialogs, windowed lists, theme tokens. |
| **No raw react-select** | Except inside **`WtSelect`** / kit adapters (eslint-enforced). |
| **No hand-built label + Select** | Use **`WtField`**; do not restyle `.MuiInputLabel-root` (see ui README). |
| **Menus** | Same border radius, hover, and portal behaviour as **`WtSelect`** — not `#e9ecef` / `#1E3A8A` one-offs in `MenuList`. |
| **Master data labels** | Dropdowns display API `label` as stored; normalizing casing is a **data/product** task, not per-component CSS. |

### 3.3 Visual acceptance (dropdown migrations)

Compare **side-by-side** with the reference row in §3.1:

1. **Control** — height ≈ `WT_CONTROL_HEIGHT` (46px) when beside buttons; focus ring from theme.  
2. **Menu** — opens without clipping; flips upward when needed; not trapped under modals.  
3. **Light + dark** — App Settings → Appearance (glass + material if on a dialog).  
4. **Add-new row** — if present, looks like kit link/action (primary token), not legacy navy block.  
5. **Create dialog** — **`GlassDialog`**, not Bootstrap `Modal`.

### 3.4 Planned migrations (dropdown debt)

| Component | Example screen | Phase |
|-----------|----------------|-------|
| ~~`MultiSelectWithInlineCreate.tsx`~~ | Lead form Categories / Sub Categories | **Done 2026-10-12** |
| ~~`WtFieldFormik`~~ | Employee wizard / salary / reimbursement | **Done 2026-10-12** — default Formik select |
| ~~Chart filters~~ | Lead/Project/Companies by location | **Done 2026-10-12** — `WtField` |
| `DropdownInput` (legacy) | EducationInfo (+Add / complex onChange), avatar/colour | Shrink only — do not expand |
| Raw `react-select` outside kit | HierarchicalTaskSelect, PublicHoliday, … | eslint warn backlog; migrate when touched |

---

## 4. How we measure progress

```bash
# Count files still depending on react-bootstrap
rg -l "from ['\"]react-bootstrap|from ['\"]react-bootstrap/" --glob "*.tsx" --glob "*.ts" src | wc -l

# Dashboard-only residual
rg -l "from ['\"]react-bootstrap|from ['\"]react-bootstrap/" --glob "*.tsx" src/app/pages/dashboard
```

Track the count in the PR description (“before / after”). Optional: add a CI comment later; not required for Phase 0–2.

**Baseline (2026-10-10):** ~160 files → Phase 1 cleared all `react-bootstrap` under `src/app/pages/dashboard`. Todo + Upcoming + Customize + Daily Attendance + Pending Requests + KPI + Tasks on kit.

---

## 5. Phases (priority order)

Each phase is a **mergeable batch**. Finish (or consciously defer) a phase before starting the next large area.

### Phase 0 — Guardrails (this doc) ✅

- [x] Document replacements + rules  
- [x] Kill maroon pill pattern on dashboard Todo / Upcoming Activities  
- [x] Link from `DESIGN_SYSTEM.md` + `summary/README.md`  

### Phase 1 — Dashboard shell (highest visibility) ✅

Finish the home page so it does not mix kit cards with Bootstrap chrome.

| # | File / surface | Notes | Status |
|---|----------------|--------|--------|
| 1.1 | `CustomizeDashboard.tsx` | `GlassDialog` + `PlainDialogHeader` + `WtSwitch` / `WtButton` | Done |
| 1.2 | `DashboardAttendance.tsx` | Removed unused Bootstrap `Modal` import (live UI is `MarkAttendance`) | Done |
| 1.3 | `DashboardTasks.tsx` | Tooltips → `WtTooltip` | Done |
| 1.4 | `DashboardDailyAttendanceOverview.tsx` | Avatars / tooltip / spinner / alert → kit | Done |
| 1.5 | `PendingRequestsTable.tsx` | Approval + reject modals → `GlassDialog` | Done |
| 1.6 | `DashboardKpi.tsx` | `GlassCard` + MUI spinner (no Bootstrap `Container`) | Done |

**Exit:** `rg … src/app/pages/dashboard` returns **zero** Bootstrap imports — **met 2026-10-10**.

### Phase 2 — Shared primitives (highest leverage)

| # | Target | Why | Status |
|---|--------|-----|--------|
| 2.1 | `CommonModal.tsx` | Dropdown / location “add option” modal | **Done 2026-10-12** — `GlassDialog` + `WtButton` |
| 2.2 | `DeleteConfirmationModal.tsx` | Transfer-capable delete → **`GlassDialog`** + `WtField` / `WtSwitchField`; success → kit `toast` (plain deletes still use `confirmDialog`) | **Done 2026-10-12** |
| 2.3 | `Loader.tsx` / spinner usages | Shared page loader → kit **`PageLoader`** (MUI `CircularProgress`); KPI period views off Bootstrap Spinner | **Done 2026-10-12** |
| 2.4 | Configure-form shells (`*ConfigureForm.tsx`) | Kit **`ConfigureFormDialog`** + `WtFieldFormik` / `WtColorPicker`; all HR `*ConfigureForm` masters off Bootstrap Modal (Department stays GlassDialog+richer body) | **Done 2026-10-12** |
| 2.5 | `MultiSelectWithInlineCreate.tsx` | Multi + inline create → flat **`WtField multiple`** + `addOption`; grouped `WtSelect` + kit menu row; **`GlassDialog`** / `externalCreate` | **Done 2026-10-12** (Leads Categories smoke: menu `+ Add New` → New Category modal) |
| 2.6 | `WtFieldFormik` + dropdown DRY | One public select API; wizard / charts / pay filters; eslint ban on feature `react-select` | **Done 2026-10-12** |

**Exit:** New feature work never needs to copy Bootstrap Modal boilerplate.

### Phase 3 — HR Core paths (pilot GTM)

People, org, attendance, leave, documents — what design partners see first.

Suggested order:

1. Employee list / profile chrome still on Bootstrap  
2. Calendar / public holiday admin — **started 2026-10-12**: `CalendarConfigForm` → `ConfigureFormDialog`; Add/Edit holiday shells on `PublicHolidayListTwo` / `RenameHoliday` → `GlassDialog`; weekends modal → `ConfigureFormDialog`; dead Bootstrap import removed from `Holidays.tsx`. Inner `PublicHoliday` / `Holiday` forms still legacy.  
3. Announcements admin — **done 2026-10-16**: delete confirmation → kit `confirmDialog` (create/edit already `AnnouncementFormDialog` / `GlassDialog`); `Announcements.tsx` off `react-bootstrap`  
4. Org masters (designation, employee types, onboarding docs) that use Bootstrap Modal / `CommonModal`

### Phase 4 — Pay / Workforce deep screens

Salary configuration, loans, reimbursements, KPI personal views — migrate when those packs are actively sold or when the screen is already open for a bugfix.

### Phase 5 — PSA / CRM (pack-gated)

Leads, companies, projects, tasks, entity detail — **lower priority** while PSA stays off for HR pilots. Migrate when a PSA customer is live or when touching the file for product work.

### Phase 6 — Dead / demo Metronic

`src/_metronic/partials/**`, sample profile/chat/wizards under `src/app/modules/{profile,apps,wizards}` that are not routed in production: **delete or quarantine**, do not polish.

---

## 6. Per-PR checklist

Copy into the PR body:

```markdown
## Bootstrap → kit
- [ ] Surface listed in bootstrap-to-kit-migration.md (§5 phase)
- [ ] Dropdowns: reference file from §3.1 matched (or N/A)
- [ ] No new react-bootstrap imports; removed or reduced count in this PR
- [ ] Uses GlassCard / SegmentedControl / WtButton / GlassDialog / WtField as applicable
- [ ] Light + dark smoke (Appearance glass + material if dialogs/cards)
- [ ] Empty / loading / error states use WtEmptyState or kit equivalents
- [ ] No hardcoded CTA hex
- [ ] Logic/tests unchanged except intentional UX fixes (note them)
```

**Size guide:** prefer &lt; ~400 lines of UI churn per PR. Split “shell” vs “form fields” if larger.

---

## 7. Smoke per migrated surface

Minimum:

1. Happy path (open, interact, save/close).  
2. Empty state.  
3. Dark mode (header theme toggle).  
4. If dialog: Escape / backdrop dismiss matches previous behaviour unless intentional.

Dashboard Phase 1: also hard-refresh `/dashboard` and confirm no mixed maroon pills beside kit segments.

---

## 8. Anti-patterns (do not)

- Migrating an entire product area in one PR “to get the count down”.  
- Wrapping Bootstrap Modal in a Glass-looking `div` without replacing it — still Bootstrap focus trap / styles.  
- Reintroducing pill clusters for filters when `SegmentedControl` fits (2–5 exclusive options).  
- **New raw `react-select` or copy-paste `MenuList` styling** — use **`WtSelect`** and §3 benchmarks.  
- Styling Metronic demo widgets “for completeness”.  
- Touching entitlements / tenancy logic in a pure UI migration PR.

---

## 9. Inventory snapshot (dashboard residual)

As of 2026-10-10, dashboard files still on Bootstrap:

- `PendingRequestsTable.tsx`
- `CustomizeDashboard.tsx`
- `DashboardAttendance.tsx`
- `DashboardTasks.tsx`
- `DashboardDailyAttendanceOverview.tsx`
- `DashboardKpi.tsx`

Already migrated (kit):

- `Todo.tsx`
- `UpcomingThings.tsx`
- Customize CTA on `DashboardWrapper.tsx`

Re-run the `rg` commands in §4 after each phase and update this section.

---

## 10. Related

- Kit API: `src/app/modules/common/components/ui/index.ts`  
- Tokens / theme: `src/app/theme/tokens.ts`, `wisetechTheme.ts`, `surfaces.ts`  
- Appearance (glass vs material): App Settings → Appearance  
- Strategy context (local): `summary/architecture/DESIGN_SYSTEM_STRATEGY.md`

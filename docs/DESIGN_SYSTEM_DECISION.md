# WiseTech Design System — Decision Record (ADR-001)

**Status:** Accepted · **Date:** 2026-10-26 · **Owner:** Frontend platform
**Supersedes:** the *engine* choice in `DESIGN_SYSTEM.md` (2026-07-09). Its visual language — navy brand,
light/dark, Glass chrome over an opaque Material canvas, toned semantics — is retained and carried forward here.

---

## 1. Context

WiseTech is a multi-tenant SaaS product competing with established HR/ERP suites. Winning that on UI means
**consistency, per-tenant branding, density, accessibility and zero visual regressions** — not a particular
component library.

Measured on 2026-10-26, the frontend runs **four visual systems at once**:

| Layer | Files | Notes |
|---|---|---|
| Bootstrap / Metronic layout classes (`d-flex`, `col-md-*`, `card-body`, `fw-bold`…) | ~708 | The largest system; never deliberately chosen |
| Metronic layout / helpers imports (`@metronic`, `_metronic/`) | ~401 | App shell, `KTIcon`, helpers |
| MUI (`@mui/*`) imported **directly by screens** | 475 | Bypasses the kit |
| WiseTech kit (`ui/` barrel, ~100 components) | 413 | Built on MUI 5 + Emotion |
| `react-bootstrap` components | ~102 | Legacy |
| Tailwind v4 + `ui/tw` twin kit | 47 | Second, parallel kit |
| `bi-*` Bootstrap icons / raw CSS files | 61 / 29 | Drift |
| `antd`, `@mantine/core` | **0** | Installed, never imported |
| Charts | 4 libraries | `apexcharts`, `chart.js`, `echarts`, `recharts` |
| Forms | 2 libraries | `formik` + `yup`, `react-hook-form` |

Every new screen currently picks one of these systems by accident. That — not the choice of library — is the
risk this record exists to remove.

## 2. Decision

**The WiseTech kit is the design system. It is owned code in this repository, built on Base UI primitives and
Tailwind CSS v4 (the shadcn model, style `base-maia`).** MUI, Emotion, react-bootstrap and Metronic are retired behind it.

> **Amendment 2026-10-27.** The first draft of this record (2026-10-26) named Radix. The engine was changed the
> next day, with the shadcn style choice: **Base UI** by default, **React Aria** for locale-sensitive inputs
> (calendar, date, time, number), and **Animate UI** for primitive motion. Never mix two engines inside one
> component. Commits `1df9df94` (kit on base-maia), `0db3109f` (React Aria fields), `89b3ca0a` (Animate UI).

| Concern | Choice |
|---|---|
| Behaviour + accessibility primitives | **Base UI** (WAI-ARIA dialogs, menus, popovers, tabs, tooltips, selects, checkbox/switch/radio); **React Aria** for calendar, date, time and number fields |
| Styling | **Tailwind CSS v4**, compiled ahead of time — no runtime CSS-in-JS |
| Component variants | **class-variance-authority** + `tailwind-merge` (`cn()` already exists in `ui/tw/cn.ts`) |
| Design tokens | **One source, CSS custom properties** (colour roles, type scale, spacing/density, radii, elevation, motion), consumed by Tailwind and — during the transition — by the MUI theme |
| Icons | `AppIcon` names only (KT names → registry → Lucide). No `bi-*`, no `@mui/icons-material` in screens |
| Tables | **TanStack Table** + **TanStack Virtual** behind a kit `DataTable` |
| Dialogs / confirms / notices | Kit `ConfirmDialog` + `showDialog` + one toast system (done 2026-10-23) |
| Forms (target) | `react-hook-form` + `zod` behind kit fields; Formik remains until a form is migrated |
| Motion | `motion` via **Animate UI** primitive wrappers, kit-scoped presets; `prefers-reduced-motion` always honoured |

**Rejected:** staying on MUI 7 (keeps runtime styling, Material defaults to fight, forced major upgrades);
Ant Design / Mantine / Chakra (strong components, but an opinionated look that fights per-tenant branding and a
distinct product identity; both Ant and Mantine are installed and unused — removed by this decision).

## 3. Non-negotiable rules

1. **Screens import UI only from the kit** (`@app/modules/common/components/ui`). Only the kit may import
   Base UI, React Aria, Tailwind helpers, MUI (during transition) or third-party UI.
2. **One component per job.** Before building, search the kit; if it is missing, add it to the kit — never a
   screen-local copy (`docs/DRY.md`, Rule Zero).
3. **One token source.** No hex colours, no magic spacing, no per-screen fonts in feature code.
4. **The form canvas is always opaque**; Glass/Material applies to chrome only (`wizard-ux-contract.md` §15).
5. **Accessibility is a gate, not a review comment:** WCAG 2.2 AA, keyboard-complete, visible focus,
   44px touch targets on touch devices, reduced motion.
6. **Responsive by default:** 360px → wide desktop; 200% zoom without clipping.
7. **Per-tenant theming through tokens only** (Appearance: brand palette, light/dark, Glass/Material, density).
8. **Debt only shrinks.** Lint baselines are a ratchet: a file leaves the baseline when fixed and never returns.
9. **No visual change ships without a screenshot diff** once Phase 1 lands.

## 4. Architecture

```
Tokens (CSS variables: colour roles · type scale · spacing/density · radii · elevation · motion)
  └─ Primitives (Base UI: Dialog, Popover, Select, Tabs, Tooltip, Checkbox, Switch, RadioGroup …;
                 React Aria: Calendar, DateField, TimeField, NumberField)
       └─ WiseTech kit (owned: WtButton, WtField, ToneChip, DataTable, ConfirmDialog, DetailCard, Page, Stack …)
            └─ Patterns (wizard engine, review step, discard prompt, filters, list/detail layouts)
                 └─ Screens (import the kit barrel only)
```

The kit's **public API is the contract**. Engines are swapped *inside* the kit, one component at a time, so
screens do not change when a component's implementation moves from MUI to Base UI + Tailwind.

## 5. Roadmap

Sizes are relative (S < M < L < XL). Each phase has an exit gate; the next phase starts only when it is met.

### Phase 0 — Decide and stop the bleeding (S) · *this change*
- This record; kit README links it.
- Remove unused `antd` and `@mantine/core`.
- ESLint `no-restricted-imports` blocks `antd`, `@mantine/*`, `@chakra-ui/*`, `@carbon/*` (zero current users).
- **Exit:** merged; audit, typecheck, build and tests green.

### Phase 1 — Foundation (M)
- Tokens as CSS variables, one module; finish `DESIGN_SYSTEM.md` phase 5 (delete the second token file:
  `ui/tokens` vs `theme/tokens`, ~40 + ~38 importers).
- Tailwind theme maps to the variables; the MUI theme reads the same variables, so both render identically
  during the transition.
- **Safety net:** Playwright screenshot suite for key screens (six wizards, dialogs, list pages, dashboard) in
  light/dark × Glass/Material, plus axe accessibility checks, running in CI.
- **Exit:** one token file; screenshot + axe suite blocking in CI.

### Phase 2 — Import contract (L)
- Route the 475 screen-level `@mui/*` imports through kit exports (add kit wrappers where missing).
- ESLint: `@mui/*`, `react-bootstrap`, `@mui/icons-material` forbidden outside the kit — ratchet baseline,
  shrinking to zero.
- **Exit:** zero `@mui` / `react-bootstrap` imports outside the kit.

### Phase 3 — Swap kit internals to Base UI + Tailwind (XL)
Ordered by usage × risk, each behind an unchanged API and a screenshot diff:
1. Leaf components: `WtButton` (95 importers), `ToneChip` (82), `AppIcon`, `WtTooltip`, switch/checkbox/radio.
2. Fields: `WtField` / `WtFieldFormik`, `WtSelect`, date fields (replace MUI X pickers), money/phone fields.
3. Surfaces: `GlassDialog`, `ConfirmDialog`, `UnsavedChangesModal`, sheets, notices.
4. Patterns: wizard engine (`EnterpriseFormWizard` / `GroupedWizard`), detail cards, page headers.
5. Tables: `MaterialTableImpl` → kit `DataTable` on TanStack Table + Virtual.
- Fold the `ui/tw` twin into the kit (one kit).
- **Exit:** no kit component renders MUI.

### Phase 4 — Layout and shell (XL)
- Kit layout primitives (`Page`, `Section`, `Stack`, `Grid`, `Toolbar`) on Tailwind replace Bootstrap classes
  (~708 files), module by module (HR core → pay → CRM/PSA), with codemods for mechanical cases.
- Replace the Metronic app shell (aside, header, menus) with kit shell components; retire `bi-*` icons.
- **Exit:** zero Bootstrap layout classes and zero `@metronic` imports outside an archived folder.

### Phase 5 — Removal (M)
- Uninstall MUI, Emotion, react-bootstrap, Bootstrap CSS, Metronic assets.
- Consolidate charts to one library and forms to one (decisions below).
- **Exit:** dependencies gone; bundle-size budget set and enforced in CI.

## 6. Open decisions (resolve before the phase that needs them)

| Decision | Needed by | Recommendation |
|---|---|---|
| Chart library (4 in use) | Phase 5 | One library with strong theming + accessibility; evaluate `recharts` vs `echarts` against real dashboards |
| Toast library | Phase 3 | Keep `react-toastify` behind `toast()` unless the screenshot/a11y suite shows gaps |
| Date picker | Phase 3.2 | **Decided:** React Aria DateField + Calendar in a kit popover (`src/ds/ui/date-picker.tsx`), wrapped as kit `WtDateField` |
| Density modes (compact / comfortable) | Phase 1 tokens | Yes — token-driven, per-tenant default + per-user override (preference core) |
| Next.js migration timing | Before Phase 4 | Do the shell replacement once, on the target framework |

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Stuck half-migrated (how four systems happened) | Kit-API contract (screens never see the engine), lint ratchets, phase exit gates |
| Visual regressions during swaps | Screenshot suite blocks CI from Phase 1; one component per PR |
| Accessibility regressions | Base UI / React Aria primitives + axe in CI + keyboard tests per kit component |
| Feature work slowed | Swaps happen inside the kit; feature teams keep shipping against the same API |
| Two styling methods during transition | Both read the same CSS variables; new kit code is Tailwind only |

## 8. How to work under this decision

- New UI: compose kit components; if something is missing, add it to the kit with a story-level test.
- Touching a legacy screen: migrate the parts you touch to kit components and layout primitives
  (boy-scout rule) — never add new Bootstrap classes, `bi-*` icons, raw MUI or react-bootstrap.
- Every kit change: unit test, screenshot diff, axe check, light/dark × Glass/Material.

Related: `src/app/modules/common/components/ui/README.md` (kit catalogue), `docs/DRY.md`, `docs/HANDBOOK.md`,
`docs/wizard-ux-contract.md`, `DESIGN_SYSTEM.md`.

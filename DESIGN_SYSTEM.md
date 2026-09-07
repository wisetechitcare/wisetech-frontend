# WiseTech Design System — Apple Liquid Glass Unification

> **Status:** Approved plan · **Date:** 2026-07-09 · **Scope:** `@app/modules/configuration` first, tokens app-capable
> **Locked decisions:** Brand = **navy `#1E3A8A`** · Theme = **light + dark** · Structure = **Apple HIG (iOS/macOS 26–27)** · Font = **retire Barlow, all-system-stack** · Semantic = **Apple hues toned ~10%**

---

## Context

We are bringing Apple's iOS/macOS 26–27 "Liquid Glass" design principles into the WiseTech HR frontend. A codebase audit revealed the higher-leverage problem: the app runs **two independent token systems that disagree**, so this is reframed as *unification using Apple's structure as the blueprint*, not a cosmetic reskin.

**The two conflicting systems today:**

| Token | UI-kit `ui/tokens.ts` | Config `ConfigDesignSystem.ts` | Conflict |
|---|---|---|---|
| Brand | `#1E3A8A` navy | `#9d4141` burgundy | Yes |
| Radius type | numbers (8/12/16/20) | strings (6/8/12/16px) | Yes |
| `success` | `#2F7D5F` | `#17c964` | Yes |
| `danger` | `#B23A30` | `#f1416c` | Yes |
| `T` symbol | the token object | the typography object | Name collision |
| Glass/frost | full 2-tier light+dark | none | UI-kit only |
| Spring motion | 5 easings + helpers | 4 easings, mostly unused | Duplicated |

**Key upside:** the UI-kit already ships ~60% of Apple's language — `vibrantLabel` opacity tiers, spring easings (`cubic-bezier(0.34,1.56,0.64,1)`), and a two-intensity `glass` material with light+dark variants. This finishes and unifies existing work rather than starting cold.

**Intended outcome:** one canonical, Apple-structured, navy-branded design system with full light+dark support, reached through a phased migration where **nothing breaks mid-flight** and Phase 1 produces **zero visual change**.

**What we deliberately do NOT do:** ship SF Pro (Apple-platform-licensed only), reuse SF Symbols (standardized on KTIcon), copy Apple's literal component tree, apply blur to data surfaces (perf), or introduce a second brand hue.

---

## Files

**New canonical source of truth**
- `src/app/theme/tokens.ts` — `makeTokens(mode)` factory + default `tokens` export. Sits beside `wisetechTheme.ts`, mirrors its `makeWisetechTheme(mode)` convention.

**Becomes an adapter (Phase 1), deleted (Phase 5)**
- `src/app/modules/common/components/ui/tokens.ts` — legacy `T` re-mapped from canonical.
- `src/app/modules/configuration/ConfigDesignSystem.ts` — legacy `C, T, SP, RADIUS, BTN, ICON_COLORS, KEYFRAMES, MOTION, MIN_TOUCH_TARGET_PX` re-mapped, with a `LEGACY_BURGUNDY` overlay.

**Consumes canonical (rewired in Phase 1)**
- `src/app/theme/wisetechTheme.ts` — reads `makeTokens(mode)` instead of `ui/tokens.ts`.

**Reused verbatim (no changes to their pattern)**
- `ui/motion.ts` — `hoverLiftSx`, `pressableSx`, `MOTION_KEYFRAMES`, all `prefers-reduced-motion`-aware.
- `ui/glass.tsx` — `GlassSurface/GlassCard/GlassHeader/GlassDialog`, `glassSx()`.
- `configuration/index.ts` — barrel unchanged (adapter keeps export names).

---

## Module shape & the `T` collision fix

Root export is **`tokens`** (never `T`). Typography ramp is **`tokens.text`**. Legacy `T` names survive only inside adapter files during migration.

```ts
// src/app/theme/tokens.ts — canonical
export function makeTokens(mode: 'light' | 'dark') {
  return {
    brand,     // navy ramp (mode-aware)
    semantic,  // success · warning · danger · info (+ accent set)
    label,     // 4 opacity tiers of ink
    fill,      // 4 opacity tiers of neutral fill
    bg,        // base · sunken · elevated · grouped
    text,      // Apple type ramp (was config `T`)
    font,      // family stacks
    space,     // 4pt grid (numbers, px)
    radius,    // numbers
    material,  // glass tiers: ultraThin · thin · regular · thick
    motion,    // easing + duration
    shadow,    // elevation
  }
}
export const tokens = makeTokens('light')
```

---

## Token values

### Brand ramp (navy)

| Key | Light | Dark | Use |
|---|---|---|---|
| `brand` | `#1E3A8A` | `#6E9BFF` | Primary actions, active |
| `brandHover` | `#172554` | `#8AB0FF` | Hover |
| `brandActive` | `#14204A` | `#A8C5FF` | Pressed |
| `brandSoft` | `#E9EEF8` | `rgba(110,155,255,.16)` | Tinted fills, selected rows |
| `brandRing` | `rgba(30,58,138,.16)` | `rgba(110,155,255,.24)` | Focus ring |

Light values = existing kit values (unchanged). Dark brand lightens for legibility on black.

### Semantic (`base` · `fg` · `soft`)

`base` = fills/icons/chips · `fg` = colored text/borders (WCAG-darkened for white) · `soft` = tint bg.

**`base` values are Apple system hues with a global ~10% saturation reduction** (calmer, enterprise-HR feel; original Apple hex in parens). Toning is applied in one place — a single `desaturate(hue, 0.1)` pass over the Apple source values — so it stays adjustable.

| Role | base light (Apple orig) | base dark | fg light | soft light |
|---|---|---|---|---|
| `success` | `#43BC66` (`#34C759`) | `#3ECB62` | `#248A3D` | `#EBF7EE` |
| `warning` | `#F59A1A` (`#FF9500`) | `#F5A322` | `#B25000` | `#FFF4E5` |
| `danger` | `#F04A42` (`#FF3B30`) | `#F0544B` | `#C7362C` | `#FDECEA` |
| `info` | `#1A82F0` (`#007AFF`) | `#2088F0` | `#0058B8` | `#E5F1FF` |

`fg` (text) and `soft` (tint) are unchanged — only `base` is toned. Exact toned hexes finalized by the `desaturate()` helper at implementation; values above are the target.

**Legibility rule:** text on white always uses `fg`, never `base`.

**Accent set** (categorical chips/icons only, each with dark pair): `indigo #5856D6` · `purple #AF52DE` · `teal #30B0C7` · `pink #FF2D55` · `cyan #32ADE6` · `mint #00C7BE` · `yellow #FFCC00`.

### Label (text) & Fill (neutral surfaces) opacity tiers

| Tier | label light | label dark | fill light | fill dark |
|---|---|---|---|---|
| primary | `#000` 100% | `#FFF` 100% | `rgba(120,120,128,.20)` | `rgba(120,120,128,.36)` |
| secondary | `#3C3C43` 60% | `#EBEBF5` 60% | `rgba(120,120,128,.16)` | `rgba(120,120,128,.32)` |
| tertiary | `#3C3C43` 30% | `#EBEBF5` 30% | `rgba(118,118,128,.12)` | `rgba(118,118,128,.24)` |
| quaternary | `#3C3C43` 18% | `#EBEBF5` 18% | `rgba(116,116,128,.08)` | `rgba(116,116,128,.18)` |

### Background surfaces

| Key | Light | Dark | Use |
|---|---|---|---|
| `base` | `#FFFFFF` | `#000000` | Cards, primary surface |
| `sunken` | `#F2F2F7` | `#1C1C1E` | Page, table header, wells |
| `elevated` | `#FFFFFF` | `#2C2C2E` | Popovers, raised (dark) |
| `grouped` | `#F2F2F7` | `#000000` | Grouped-list page bg |

### Typography ramp (`tokens.text`)

Family: `font.body = -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif`; `font.display` swaps `"SF Pro Display"` first. **Barlow retired.**

| Token | size/line | weight | tracking | Replaces (config) |
|---|---|---|---|---|
| `largeTitle` | 34/41 | 700 | -0.03em | — |
| `title1` | 28/34 | 700 | -0.025em | pageTitle (28) |
| `title2` | 22/28 | 640 | -0.02em | sectionTitle (22) |
| `title3` | 20/25 | 620 | -0.015em | — |
| `headline` | 17/22 | 600 | -0.01em | cardTitle (16) |
| `body` | 17/22 | 400 | -0.01em | **new baseline** |
| `subhead` | 15/20 | 400/600 | -0.006em | label · value (14) |
| `footnote` | 13/18 | 400 | 0 | — |
| `caption` | 12/16 | 400 | 0 | caption (12) |

### Space & radius (numbers, px)

| space | 2xs | xs | sm | md | lg | xl | 2xl | 3xl |
|---|---|---|---|---|---|---|---|---|
| px | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 48 |

| radius | xs | sm | md | lg | xl | card | pill |
|---|---|---|---|---|---|---|---|
| px | 6 | 8 | 12 | 16 | 20 | 22 | 999 |

Continuous "squircle" corners via `border-radius` + `corner-shape: superellipse` where supported. Concentric rule *inner = outer − padding* is a lint guideline, not a token.

### Material (glass tiers)

| Tier | bg light | blur | saturate | Chrome use |
|---|---|---|---|---|
| `ultraThin` *(new)* | `rgba(255,255,255,.50)` | 12px | 150% | Overlays on busy content |
| `thin` | `rgba(255,255,255,.58)` | 14px | 150% | Chips, small popovers |
| `regular` | `rgba(255,255,255,.72)` | 28px | 190% | Sheets, sidebars, headers |
| `thick` *(new)* | `rgba(255,255,255,.82)` | 40px | 200% | Modals, command palette |

Each tier also carries `radius · shadow · highlight · fallbackBg · border` per mode. `thin`/`regular` reuse existing kit values verbatim; only `ultraThin`/`thick` are additive.

### Motion (spring)

| easing | curve | duration | ms |
|---|---|---|---|
| `spring` | `cubic-bezier(.34,1.56,.64,1)` | quick | 150 |
| `springSoft` | `cubic-bezier(.22,1,.36,1)` | standard | 200 |
| `standard` | `cubic-bezier(.4,0,.2,1)` | moderate | 260 |
| `decelerate` | `cubic-bezier(.16,1,.3,1)` | emphasized | 360 |
| `exit` | `cubic-bezier(.4,0,1,1)` | slow | 480 |

All transitions respect `prefers-reduced-motion` (pattern already set in `ui/motion.ts`).

---

## Phase 1 shim strategy (zero visual change)

The canonical module holds **final** values; each adapter applies a small `LEGACY` overlay pinning anything that would otherwise shift. No component import changes; no pixels move.

```ts
// ui/tokens.ts — adapter
import { makeTokens } from '@app/theme/tokens'
export const T = adaptUiKit(makeTokens('light'), LEGACY_UIKIT)
//  T.color.brand → tokens.brand.brand   T.glass → tokens.material
//  T.motion → tokens.motion             T.vibrantLabel → tokens.label
//  T.radius → tokens.radius (already numbers ✓)
```

```ts
// ConfigDesignSystem.ts — adapter (barrel names preserved)
import { makeTokens } from '@app/theme/tokens'
const t = makeTokens('light')
export const C = mapConfigColors(t, LEGACY_BURGUNDY)  // pins #9d4141 in P1
export const T = mapType(t.text)                       // typography ramp
export const SP = toPxStrings(t.space)                 // '4px'…'48px'
export const RADIUS = toPxStrings(t.radius)
// BTN, ICON_COLORS, KEYFRAMES, MOTION, MIN_TOUCH_TARGET_PX — all mapped
```

**Why the `LEGACY_BURGUNDY` overlay:** without it, unifying to navy flips every burgundy config page in Phase 1 — a large uncontrolled diff. The overlay keeps config pixel-identical after Phase 1; Phase 2 deletes it so config *inherits* navy + Apple semantics in one reviewable change.

---

## Migration phases — what flips, when

| Phase | Change | Visible? |
|---|---|---|
| **1** | Canonical `tokens.ts` exists; both files become adapters; imports rewired | No — pinned by overlay |
| **2** | Config drops burgundy → inherits navy; status → Apple semantic; text → label tiers | **Yes** |
| **3** | Type ramp + Body-17 + tracking; 4pt grid; squircle radii through `ConfigSectionCard`, `StatCard`, layout shells | **Yes** |
| **4** | Material tiers on nav/sheets/dialogs (**not** data tables); spring motion standardized; profile paint cost | **Yes** |
| **5** | Delete adapters + overlays; one system remains | No |

Each phase ships independently and leaves the app fully working (aligns with the preserve-what-works stance).

---

## Confirmed decisions

1. **Barlow → retired.** All text uses the system stack (`-apple-system/SF → Inter → Segoe UI`). One family, cleanest Apple feel.
2. **Semantic vividness → toned ~10%.** Apple hues desaturated globally via one `desaturate()` pass; `fg`/`soft` unchanged. See Semantic table.
3. **Doc home → repo-root `DESIGN_SYSTEM.md`** (this file).
4. **Module path → single `src/app/theme/tokens.ts`** (can split into a `theme/tokens/` folder later if palettes grow).

---

## Risks to manage

- **Blur performance:** `backdrop-filter` is cheap on chrome, expensive behind large scrolling lists → materials on chrome only, never data tables. Profile in Phase 4.
- **Contrast/accessibility:** opacity-tier text over glass can fail WCAG → every material tier carries a solid `fallbackBg`; enforce it.
- **MUI friction:** Material Design defaults fight Apple radii/elevation → targeted `wisetechTheme` component overrides, not raw MUI.
- **Licensing:** no SF Pro, no SF Symbols — system-font stack + KTIcon only.

---

## Verification

Phase 1 must produce **provably zero visual change** before anything else moves:

1. **Type/build:** `tsc --noEmit` and the frontend build pass with the rewired imports (adapters preserve every legacy export name/shape).
2. **Visual diff:** run the app, screenshot representative configuration pages (a `ConfigSectionCard` page, `StatCard` grid, a page shell with tabs) before and after Phase 1 — expect pixel-identical.
3. **Import integrity:** grep confirms no component import paths changed; barrel `configuration/index.ts` still exports the same symbols.
4. **Dark mode:** toggle via existing `ColorModeProvider` and confirm `makeTokens('dark')` resolves for both adapters.

Later phases each verified the same way: build green, then intentional before/after screenshots confirming *only* the expected value flips for that phase.

---

## Reference deliverables

- Revamp plan (visual): https://claude.ai/code/artifact/f0b132bf-3e39-43e0-a304-13abf7e445b8
- Token module spec (visual): https://claude.ai/code/artifact/a7fea572-45a3-4529-80b9-c5251fd24bb2

---

## Labelled-field consolidation — `WtLabeledField`

**Added 2026-09-07**, from a bug found in use: the floating uppercase label on
`ToolbarFilterSelect` rendered *on top of* the border line instead of inside the gap cut
for it.

### Why it happened

MUI cuts that gap with a `<legend>` inside the notched outline, and sizes it from the label
text rendered in the **field's** typography — not the label's. A label that is bold,
letter-spaced and uppercased therefore needs more room than the gap reserves, and spills onto
the line. The file already carried a warning against overriding the shrink transform for the
same underlying reason; nobody had written down the other half.

Fixed in the shared control, so it landed on payroll, the employee list, reimbursement,
documents, the dashboard and recruitment at once.

### The actual problem

The knowledge of *how a floating label relates to its gap* lives in `ToolbarFilterSelect`
and is re-derived independently in **12 other files**:

```
app/modules/common/inputs/DateInput.tsx
app/modules/common/inputs/MonthYearInput.tsx
app/modules/common/inputs/TimeInput.tsx
app/pages/employee/companies/companyOverview/components/CompaniesByLocationAndSatatus.tsx
app/pages/employee/entity/EntityTablePage.tsx
app/pages/employee/leads/configuration/components/PaymentPlanStagesTree.tsx
app/pages/employee/leads/lead/LeadNewLead.tsx
app/pages/employee/leads/overview/commonComponents/LeadByLocationChart.tsx
app/pages/employee/projects/commonComponents/BarChart.tsx
app/pages/employee/projects/commonComponents/FilterDropdown.tsx
app/pages/employee/projects/commonComponents/ProjectByLocationChart.tsx
app/pages/employee/projects/table/ProjectTablePage.tsx
```

Each is its own arrangement of `InputLabel` plus an outlined control, and each can drift the
same way. The 55 files using a plain `TextField label=` are **not** part of this — that is
MUI's own notched label, already one implementation.

### What this is NOT

**Not one component for every input.** `WtSelect` is react-select — search, multi, creatable,
async. `ToolbarFilterSelect` is MUI's Select with a notched outline, which react-select has no
equivalent of. Collapsing them means rebuilding one on the other's engine and losing either
the search or the label, behind a `variant` prop that switches between two unrelated
implementations. One name over two things is worse than two honest names.

An earlier note in the kit barrel claimed `ToolbarFilterSelect` delegated to `WtSelect`. It
never did. That comment has been corrected — a comment describing an intent that was never
built is worse than none, because callers read it as fact.

### The shape

One `WtLabeledField` that owns the label-and-notch treatment and nothing else; the specific
controls compose it. Not a new control — a wrapper for the one piece of knowledge that is
currently copied.

Then migrate the 12. The payoff is that the bug above could not recur in any of them.

### Effort and sequencing

Roughly a day, touching charts, filters and table pages across leads, projects and companies.

**Deliberately not scheduled yet.** It is a codebase-wide refactor competing with HR's
recruitment migration, and starting it mid-migration would leave both half-done. Schedule it
once HR's data is in.

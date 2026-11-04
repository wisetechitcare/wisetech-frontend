# Buttons

One button for the whole app: the kit `Button` (`src/ds/ui/button.tsx`), documented in Storybook under
**Components / Button**. `WtButton` (`src/app/modules/common/components/ui/buttons.tsx`) is the app-level
API over it and renders it; use either. Nothing else draws a button: since 2026-10-29 every button in the
app is the kit Button, a wrapper over it, or a documented control (see "Approved exceptions"), and CI keeps it so.

## Contract

| Prop | Values | Notes |
|---|---|---|
| `variant` | `default` · `destructive` · `success` · `outline` · `inverted` · `secondary` · `ghost` · `link` · `tinted` | **`default` for every main action: default always** (there is no navy primary). `outline` is Cancel / secondary; `tinted` is the row/card icon action, toned with the `--tint` CSS variable |
| `size` | `default` (40px) · `sm` · `xs` · `lg` (44px) · `icon` · `icon-sm` · `icon-xs` · `icon-lg` | icon sizes need an accessible name (`aria-label`) |
| `glow` | boolean | one hero action per surface; never two side by side |
| `loading` | boolean | disabled + `aria-busy` + spinner (icon sizes swap the glyph for it) |
| `type` | `button` (default) · `submit` · `reset` | set `submit` explicitly on form submit buttons |

Icons: put the Lucide/KT icon inside with `data-icon="inline-start"` or `"inline-end"`. Navigation is a link,
not a button: put `buttonVariants(...)` on a real `<a>` / router `Link`.

WtButton mapping: tone `accent` (default)/`danger`/`success` → `default`/`destructive`/`success` (the navy `primary` tone was retired 2026-10-28),
`ghost` → `outline`, `inverted` → `inverted`, `size="medium"` → `lg`, `flat={false}` → `glow`.

Legacy "primary" buttons (Bootstrap `btn-primary`, MUI `color="primary"`, react-bootstrap `variant="primary"`) all migrate to `default`.

## Not buttons (allowed as they are)

Native `<button>`s that are tabs, switches, checkboxes, radios, menu items, options, tree items or grid cells
(they carry that `role`, or `aria-selected` / `aria-checked`), toggle buttons (`aria-pressed`: segmented
controls, filter chips), the element a kit component renders through its `render` prop
(`<Item render={<button type="button" />}>`), and everything inside `src/ds` (the kit's own parts).

## Migrating a legacy button

Behaviour never changes: handlers, `disabled` logic, permissions, form submission, tooltips, `data-bs-*` /
`data-kt-*` attributes, refs and `id`s all carry over untouched.

**Import** `import { Button } from '@/ds/ui/button'` (or keep using WtButton / WtIconButton / ActionIconButton /
WtCloseButton where the file already does, or where you need `sx`).

**Type.** The kit Button defaults to `type="button"`; a native `<button>` without `type` defaulted to
`submit`. When the legacy native button had no `type`, write `type="submit"` unless you can see it is not
inside any form (no `<form>` / Formik `<Form>` around it in the same component AND the component is not a
form section) — when in doubt, `type="submit"` is the behaviour it had. MUI and react-bootstrap buttons already
defaulted to `button`.

**Variant** — "default always": every main/positive action is `default`.

| Legacy | Kit |
|---|---|
| `btn-primary`, `btn-info`, `btn-dark`, `btn-warning`, MUI `variant="contained"` (any colour but error/success), react-bootstrap `variant="primary"` | `default` |
| `btn-danger`, MUI `color="error"` contained, react-bootstrap `danger` | `destructive` |
| `btn-success`, MUI `color="success"` contained, react-bootstrap `success` | `success` |
| `btn-light-primary`, `btn-light-info` (pale fill, coloured text) | `tinted` |
| `btn-light-danger` / `btn-light-success` / `btn-light-warning` | `tinted` + `style={{ '--tint': 'var(--cta-danger)' }}` (or `--cta-success`, `var(--warning)`) |
| `btn-secondary`, `btn-light`, `btn-white`, `btn-outline*`, `btn-bg-light`, `btn-bg-white`, MUI `variant="outlined"`, react-bootstrap `secondary` / `light` / `outline-*` | `outline` |
| MUI `variant="text"`, `btn-active-*` / `btn-color-*` text-only buttons, `btn-flush` | `ghost` |
| `btn-link`, react-bootstrap `link` | `link` |
| table/row icon buttons (`btn-icon btn-bg-light btn-active-color-*`), MUI `IconButton` | `ghost` (or `tinted` when it was coloured), icon size |

**Size**: `btn-sm` / MUI `small` → `sm`; `btn-lg` / MUI `large` → `lg`; `btn-icon` → `icon` (`btn-sm btn-icon` →
`icon-sm`, `btn-xs` / `w-25px h-25px` → `icon-xs`); otherwise `default`.

**Classes.** Drop every `btn` / `btn-*` class and every class that only styles the button itself (colours,
`fw-*`, `fs-*`, `border*`, `rounded*`, `shadow*`, padding, fixed height): the variant owns the look. Keep
layout and positioning classes (`m*`, `w-100` / `w-full`, `d-*` / responsive display, `ms-auto`, `align-self-*`,
`flex-*` placement, `position-*`, `order-*`). Same for MUI `sx`: keep layout (margins, width, flex), drop look.

**Icons.** Put icons inside with `data-icon="inline-start"` / `"inline-end"` (wrap a KTIcon in
`<span data-icon="inline-start" className="inline-flex">` ). Icon-only buttons need `aria-label` (use the
title / tooltip text).

**Loading.** Metronic's `indicator-label` / `indicator-progress` + `spinner-border` pattern, or a spinner in
`startIcon`, becomes `loading={isSubmitting}` with the plain label.

**Not a button?**
- Navigates → a link (`<Link>` / `<a>`); give it `className={buttonVariants({ variant, size })}` if it must look
  like a button.
- Tab → kit `Tabs`, or `role="tab"` + `aria-selected` on the existing element.
- Toggle / segmented control / filter chip → keep the element, add `aria-pressed`.
- Menu item in a dropdown → `role="menuitem"` (or kit `DropdownMenu`).
- Clickable row, card, list item, calendar cell, or a `div`/`span` with `onClick` → kit `Item` rendered as a
  button (`<Item render={<button type="button" />} ...>`) keeping its content and layout classes, or a real
  `<Link>` when it navigates. Never a bare `div` with `onClick`.

If a site cannot be migrated safely, leave it, and add it with the reason to "Approved exceptions" below.

## Approved exceptions

A control that is **not an ordinary action** keeps its own element and look, and says what it is with
`data-wt-control="<kind>"`. The audit (`scripts/audit-buttons.mjs`, `CONTROL_KINDS`) accepts only these kinds, so
a marker cannot hide a real button — Save, Cancel, Close, Edit, Delete, Prev/Next, Apply, Approve/Reject and the
like are always the kit Button.

| Kind | What it is | Required semantics |
|---|---|---|
| `tab` | a tab in a tab strip | `role="tab"` + `aria-selected`, or a `nav-link` the Bootstrap tab plugin drives |
| `segmented` / `toggle` / `chip` | a pressed-state toggle or filter chip | `aria-pressed={state}` |
| `switch` / `checkbox` | an on/off knob or a selection box | `role="switch"` + `aria-checked`, or the native control |
| `option` / `swatch` | a selectable card, colour or icon tile | `aria-pressed` when it shows a selection |
| `cell` / `stepper` | a calendar day/month/slot cell, a date stepper | — |
| `accordion` | a section header that expands | `aria-expanded` |
| `menuitem` / `select` | an item in a menu, a dropdown trigger | `role="menuitem"` / `aria-haspopup` |
| `row` / `tile` / `link` | a clickable list row, card or navigation text | keyboard: `pressableProps` from `ui/a11y` |
| `dropzone` / `container` / `backdrop` / `scrollbar` | an upload area, a click-through wrapper, a modal backdrop, a custom scrollbar | — |
| `shell` | Metronic app-shell chrome (aside tabs, header toggles, bottom nav) | retires with `src/_metronic` (ADR-001 Phase 5) |
| `dev` | developer-only panels (KPI test panel, menu test page) | — |

Wrappers that render the kit Button (count as canonical): `WtButton`, `WtIconButton`, `ActionIconButton`,
`WtCloseButton`, `PremiumButton`, and the Tailwind twin in `ui/tw/Buttons`. Not React, so out of scope: the plain-HTML
session-failure splash in `src/main.tsx` (rendered before React mounts).

## Enforcement

`pnpm audit:buttons` reports every non-canonical button by kind and module. CI runs `pnpm audit:buttons:check`:
legacy sites are frozen per file in `scripts/button-baseline.json`, and a file may only lose them. After a
migration lowers the counts, run `node scripts/audit-buttons.mjs --update` and commit the baseline (numbers
only ever fall).

Legacy kinds the audit tracks: raw `<button>`, Bootstrap `.btn` classes, MUI `Button` / `IconButton`,
react-bootstrap `Button`, `role="button"` divs and clickable divs.

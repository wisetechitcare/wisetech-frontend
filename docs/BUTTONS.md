# Buttons

One button for the whole app: the kit `Button` (`src/ds/ui/button.tsx`), documented in Storybook under
**Components / Button**. `WtButton` (`src/app/modules/common/components/ui/buttons.tsx`) is the app-level
API over it and renders it; use either. Nothing else draws a button.

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
(they carry that `role`, or `aria-selected` / `aria-checked`), and everything inside `src/ds` (the kit's own parts).

## Enforcement

`pnpm audit:buttons` reports every non-canonical button by kind and module. CI runs `pnpm audit:buttons:check`:
legacy sites are frozen per file in `scripts/button-baseline.json`, and a file may only lose them. After a
migration lowers the counts, run `node scripts/audit-buttons.mjs --update` and commit the baseline (numbers
only ever fall).

Legacy kinds the audit tracks: raw `<button>`, Bootstrap `.btn` classes, MUI `Button` / `IconButton`,
react-bootstrap `Button`, the old tinted icon buttons, the Tailwind twin (`ui/tw/Buttons`), `role="button"`
divs and clickable divs.

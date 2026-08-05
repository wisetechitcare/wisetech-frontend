# The WiseTech UI kit — read this before writing any component

**The rule: search here first. If it exists, use it. If it doesn't, build it *here*, not in your feature.**

This file exists because that rule kept being broken — not out of disagreement,
but because "the existing component" had no index. People searched one folder,
found nothing, and wrote their own. The result was four close buttons, three
dropdowns, nine hand-rolled icon buttons and a filter control living inside a
payroll page that three other features imported across.

## Where things are

| Path | What it is |
|---|---|
| `@app/modules/common/components/ui` | **The barrel. Import from here.** MUI-based kit. |
| `…/ui/tw/` | The Tailwind twin (zero MUI). Same names, *different props*. |
| `@app/modules/common/inputs/` | Form fields (Formik-bound and standalone). |
| `@app/theme/wisetechTheme.ts` | MUI theme. `githubDark.ts` is the dark palette SSOT. |

⚠️ **The two kits are not interchangeable.** `WtIconButton` takes a numeric
`size` in `tw/` and MUI's `sx` in the MUI kit. Pick the kit your screen is
already on and stay in it. **New settings/config engines use the MUI kit** —
that is what `LeavePolicyModal` and `SandwhichLeave`, the visual benchmarks,
are built from.

## Component index — use these, do not reinvent

| Need | Use | Never |
|---|---|---|
| Button | `WtButton` (`ghost` = cancel, `inverted` = secondary) | `<button className="btn">` |
| Icon action | `WtIconButton` | a hand-rolled `<button>` with `place-items-center` |
| Close (×) | `WtCloseButton` (`ui/tw/WtCloseButton`) | a `&times;` in an `IconButton` |
| Toolbar filter | `ToolbarFilterSelect` + `FILTER_TONES` | a bespoke `<select>` or `FormControl` |
| Dropdown (in a form) | `DropdownInput` (Formik) | react-select directly |
| Dropdown (standalone) | `SelectInput` | a new select component |
| Toggle | `WtSwitch` / `WtSwitchField` | raw `<Switch>`, `.form-switch` |
| Dialog | `GlassDialog` + `GlassHeader` | react-bootstrap `<Modal>` |
| Surface / card | `GlassSurface` / `GlassCard` | `<div className="card">` |
| Config section | `SettingsSection` | a `GlassSurface` with your own accent + header |
| Summary stat | `StatTile` | a bespoke number-in-a-box |
| Chip / badge | `ToneChip` / `StatusBadge` | `<span className="badge">` |
| Icon tile | `IconBox` | a styled `<div>` around a `KTIcon` |
| List layout | `AutoGrid` + `ListHeader` | per-feature grid breakpoints |
| Reorder | `ReorderableGroup` + `DragHandle` | up/down buttons |
| Icon / colour choice | `IconPicker` / `TonePicker` | an inline grid of buttons |
| Single-select modal | `OptionPickerDialog` | a bespoke option list |
| Date / time | `WtDateField` / `WtDateTimeField` / `TimeWheelField` | `<input type="date">` |
| Wizard | `WtStepper` | hand-rolled circles |
| Toast / confirm | `toast` / `confirmDialog` / `alertDialog` | react-toastify, sweetalert2 directly |
| Employee picker | `EmployeeSelectionDialog` | a bespoke picker |
| Org filter data | `useOrgScope` | re-deriving an org list per feature |

Icons are **KTIcon** (keenicons duotone). Verify a name exists before using it —
an unknown name renders as an empty box:

```bash
grep -o "ki-[a-z0-9-]*" src/_metronic/assets/keenicons/duotone/style.css | sed 's/ki-//' | sort -u
```

## Composing a settings / config engine

The benchmark is `LeavePolicyModal.tsx` and `SandwhichLeave.tsx`. Follow it:

```tsx
<GlassDialog open={open} onClose={onClose} maxWidth="md" fullWidth
  header={<GlassHeader title="…" subtitle="…" icon={<KTIcon iconName="…" className="fs-1" />} onClose={onClose} />}>
  <Box sx={{ p: { xs: 2, sm: 2.75 }, display: 'flex', flexDirection: 'column', gap: 2 }}>

    <Grid container spacing={{ xs: 1.25, sm: 2 }}>   {/* summary row */}
      <Grid item xs={6} md={3}><StatTile … /></Grid>
    </Grid>

    <SettingsSection tone={TRIO.purple} icon="…" title="…" description="…"
                     action={<WtSwitch tone={TRIO.purple.c} … />}>
      …fields…
    </SettingsSection>

  </Box>
</GlassDialog>
```

Colour comes from `TRIO` — never a raw hex. A section's tone drives its accent
rule, its `IconBox` and its `WtSwitch` together.

## Two traps that have bitten this codebase

**1. Metronic squares your corners.** `style.react.scss` / `style.scss` are
imported globally in `main.tsx` and carry Bootstrap's *unlayered* button rules,
which outrank Tailwind's utility layer. A Tailwind radius on a `<button>` silently
loses. Use the important modifier: `rounded-full!`, `rounded-[10px]!`. This is why
`WtCloseButton` and `WtIconButton` carry it.

**2. Tailwind v4 puts `!` at the END.** `rounded-full!`, not `!rounded-full`.
The v3 prefix form is not the canonical syntax here.

## Adding to the kit

1. It must be generic — no feature types, no feature copy, no feature imports.
2. Theme-aware (light **and** dark) and responsive from 360px.
3. Real semantics: a control that selects needs `role`/`aria-checked`; a
   trigger needs a `<button>`; anything collapsible needs `aria-expanded`.
4. Document *why* it exists and what it replaces — the paragraph above each
   export in this folder is the pattern.
5. Export it from `index.ts` with a one-line comment, and **add a row to the
   table above.** An undocumented kit component gets reinvented.

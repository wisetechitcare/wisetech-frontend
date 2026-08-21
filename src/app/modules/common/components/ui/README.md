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
| Edit / delete / share on a row, card or chip | `ActionIconButton` (`size="sm"` in chips; `tone="success"` for share/send; `icon=` for a non-font glyph) | a `bi bi-pencil` / `fab fa-whatsapp` in a bare `<button>` |
| Brand logo glyph (WhatsApp…) | `WhatsAppIcon` from `brandIcons` | `KTIcon iconName="whatsapp"` — the duotone font paints its first layer at 40% opacity, so the mark washes out |
| Close (×) | `WtCloseButton` (`ui/tw/WtCloseButton`) | a `&times;` in an `IconButton` |
| Toolbar filter | `ToolbarFilterSelect` + `FILTER_TONES` | a bespoke `<select>` or `FormControl` |
| Dropdown ENGINE | `WtSelect` | react-select directly, or a new wrapper |
| Dropdown (in a form) | `DropdownInput` (Formik) | react-select directly |
| Dropdown (standalone) | `SelectInput` | a new select component |
| Toggle | `WtSwitch` / `WtSwitchField` | raw `<Switch>`, `.form-switch` |
| Dialog | `GlassDialog` + `GlassHeader` | react-bootstrap `<Modal>` |
| Surface / card | `GlassSurface` / `GlassCard` | `<div className="card">` |
| Config section | `SettingsSection` | a `GlassSurface` with your own accent + header |
| Summary stat | `StatTile` | a bespoke number-in-a-box |
| Chip / badge | `ToneChip` / `StatusBadge` | `<span className="badge">` |
| Exclusive 2–5 way choice | `SegmentedControl` (status filter, view switch) | a row of outlined pills / `ToggleButtonGroup` |
| Icon tile | `IconBox` | a styled `<div>` around a `KTIcon` |
| List layout | `AutoGrid` + `ListHeader` | per-feature grid breakpoints |
| Reorder | `ReorderableGroup` + `DragHandle` | up/down buttons |
| Icon choice | `IconPicker` | an inline grid of buttons |
| Colour choice | `WtColorPicker` | `<input type="color">`, an inline swatch grid |
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

## Form fields

Plain MUI `TextField`, `size="small"`, label **notched into the border**. No
bespoke field styling — the theme owns it, so every form matches and dark mode
works without being handled per screen. The reference is the Sandwich Leave
rule editor.

```tsx
<TextField label="Rule name" size="small" fullWidth
           placeholder="e.g. Diwali Bridge" value={v} onChange={…} />

<TextField label="Description" size="small" fullWidth multiline minRows={2} … />

<TextField select label="Category" size="small" value={v} onChange={…}>
  <MenuItem value="custom">Custom</MenuItem>
</TextField>
```

Rules:
- **Never** a `<label>` stacked above an input, and never a hand-styled
  `<input className="…border rounded-xl…">`. That is what made the FAQ editor
  look like a different app.
- Errors and character counters go in **`helperText`**, with `error` for the
  state — they then share the field's baseline and recolour together, instead
  of being a separate row kept in sync by hand.
- `select` variants are a `TextField select` with `MenuItem` children, not a
  bare `Select` — you get the same label treatment for free.
- Two-up layouts: `Box` with
  `gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }`, so they stack on phones.
- Group a set of fields under an `Eyebrow` inside a `GlassSurface variant="thin"`.
- **Mark every required field with `required`.** MUI renders the `*` on the
  label itself, so it sits with the field and is announced by screen readers —
  never hand-write an asterisk in the label string.

## Capitalisation

Headlines and button labels are title-cased by the KIT, not by call sites:
`GlassHeader`, `SettingsSection`, `SectionHead`, `ListHeader` and `WtButton`
(both twins) all run their text through `toTitleCase`. Write labels naturally —
`"add question"` renders as "Add Question".

`WtIconButton` is deliberately NOT wrapped: its children are a glyph, not a label.

Any word already carrying a capital is left exactly as written, so `FAQ`, `HR`,
`KPI` and user-entered names survive untouched. Minor words (of, and, the, to)
stay lowercase unless they open or close the headline.

Not `text-transform: capitalize` — that capitalises every word ("Rules Of The
Road"), cannot lift lowercase text into an acronym, and leaves copied text in
the original case.

## Colour

`WtColorPicker` — the kit palette plus a custom colour, in one control. It
supersedes `TonePicker` (palette only) and the raw `<input type="color">` that
the Public Holiday and Appearance forms still use with banned Bootstrap classes.

The custom swatch opens the browser's colour picker. Deliberate: it gives a
real gradient + eyedropper on every platform, works on touch, is keyboard
accessible, and adds nothing to the bundle. The popup is OS chrome and does not
follow the app theme — accepted, because unlike `<input type="date">` it neither
formats data by locale nor hides its value, so the mismatch is cosmetic and
lasts only while picking.

Stored values are either a palette name (`blue`) or a hex (`#1E3A8A`). A palette
name is preferred where it fits, because it carries the kit's coordinated
`{fg, bg, border}` triple; a hex derives its own tint with the same alphas.

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


## Selects — one engine, three wrappers

`WtSelect` is the **engine**: menu portalled to `<body>`, `menuPlacement: auto` (flips up
when there is no room below), a bounded self-scrolling menu, z-index above MUI's dialog
layer, windowed rendering past ~80 options, theme-aware light/dark, and keyboard + ARIA
inherited from react-select rather than re-invented.

It exposes what an enterprise select needs and none of the wrappers previously had:
`isMulti`, `isClearable`, `isLoading`, `isCreatable`, `isDisabled`, grouped options with
headings, `error` state, `size`, and `optionVariant` (`plain` | `avatar` | `colour`, with an
optional second `description` line).

The three wrappers stay, because a form field, a toolbar filter and a standalone control
genuinely differ in binding and layout:

| Context | Use |
|---|---|
| Formik form field | `DropdownInput` |
| Standalone / redux-bound | `SelectInput` |
| Toolbar filter | `ToolbarFilterSelect` |

**Do not add a fourth wrapper.** If a screen needs something none of them do, add the prop
to `WtSelect` and let the wrapper pass it through. This codebase already grew nine select
wrappers — two of them (`DropdownInput` and `FormikDropdownInput`) were both Formik +
react-select, i.e. the same component twice — which is exactly how dropdowns ended up
opening downward into nothing on some screens and behind the dialog on others.

`FormikDropdownInput` has since been **deleted**; its six call sites moved to
`DropdownInput`. It always painted a status circle on every option, defaulting to amber,
so lists whose options carried no colour showed a uniform dot that meant nothing. Colour is
now shown only where it carries meaning, via `showColor`.

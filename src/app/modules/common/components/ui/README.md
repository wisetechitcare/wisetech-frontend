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
| **Any labelled input** (text, number, textarea, select) | **`WtField`** | `InputLabel` + `Select`/`TextField` assembled by hand |
| **An amount of money** (salary, fee, expense) | **`WtMoneyField`** (a `WtField` with the currency inside the frame and a live money read-back) | a number box with the unit in its label — "CTC (LPA)", "Lakhs per year" |
| Toolbar filter | `ToolbarFilterSelect` + `FILTER_TONES` (a `WtField` adapter) | a bespoke `<select>` or `FormControl` |
| Currency glyph / code / formatter | `CurrencySymbol` + `useCurrency()` (`hooks/useCurrency`) | `KTIcon iconName="dollar"`, a typed-in `₹`, or `{ style: 'currency', currency: 'INR' }` inline |
| Tooltip / hint on hover | `WtTooltip` (`wrap` for a DISABLED child; an empty title renders nothing) | MUI `Tooltip` imported per screen — 17 files set their own `arrow`/`placement`/delays — or a native `title=`, which never shows on touch |
| Hover on a tinted tile / card | `hoverTileSx(trio, dark)` | another `'&:hover': { transform: 'translateY(-2px)' }` — 61 files have their own |
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
| User data inside an `html:` string | ``safeHtml`…${name}…` `` (or `escapeHtml(v)` for a generated list) | a plain template literal — see below |
| Explanation inside a form or panel (why it is closed, what to fix first, what will happen) | `InlineNotice` (toned, `TRIO`) / `InlineHint` (quiet info line) | a Bootstrap `.alert` div with hard-coded hex, or a private `Notice` per screen |
| Employee picker | `EmployeeSelectionDialog` | a bespoke picker |
| Org filter data | `useOrgScope` | re-deriving an org list per feature |

## Labelled inputs — never build the pairing yourself

`WtField` is the one labelled control. A label, a field, and a hint or error, laid
out once and shared by every control type, so a select and a text box on the same
row cannot disagree about height, radius, focus ring or error colour.

```tsx
<WtField label="Rating scale" value={scale} onChange={setScale}
         options={scales} hint="How each criterion is rated" />

<WtField label="Organization" icon="bank" value={org} onChange={setOrg}
         options={orgs} tone={FILTER_TONES.blue.icon} />
```

**It renders MUI's outlined field with its floating label** — the same control the
"Add Rule" dialog in `pages/company/settings/SandwhichLeave.tsx` uses, which is the
app's reference for a labelled input. There is no second look to choose between.

⚠️ **Never style the label.** MUI cuts the gap with a `<legend><span>` inside the
outline, and that legend renders in the DEFAULT label metrics — it does not see CSS
aimed at `.MuiInputLabel-root`. Make a label bold, uppercase, letter-spaced or
resized and it grows while its gap does not, so it lands on the border line. That is
exactly the bug this codebase paid for one file at a time: `ToolbarFilterSelect`
restated the legend metrics by hand, and `ProjectTablePage` nudged its label with
`top: '-3px'`, a number arrived at by eye and wrong at any other font size.

Uppercase label *text* is fine — MUI measures the characters you pass. Uppercasing
in CSS is not. Everything else on the control may be themed; the label may not.

`labelPlacement="above"` exists only for a control passed as `children`, which cannot carry a
notch. It switches on its own, so passing it by hand is rarely right.

A long single-select takes `searchable`: it renders MUI Autocomplete with the same floating
label, height and outline as a plain select, so the two can share a row. Multi-select and
creatable stay `WtSelect`. Dates stay `WtDateField`. `WtField` owns the frame, not every
engine that can sit in it.

**`sx` is layout for the whole field** (`flex`, `minWidth`, margins) and lands on its outer
frame. Descendant selectors (`'& .MuiOutlinedInput-root'`) still reach the control.

### Money is `WtMoneyField`

```tsx
<WtMoneyField label="Offered CTC" per="year" currency={offer.currency}
              value={form.offeredCtc} onChange={(v) => setForm({ ...form, offeredCtc: v })}
              validate={(v) => annualAmountError('Offered CTC', v)} />
```

The currency sits inside the frame (`WtField`'s `prefix`), and the hint reads the number
back as money while it is typed — `12` shows `₹12 per year`, which is the moment someone
who meant "12 lakh" notices. Pass `currency` with the code the API resolved for the record
(a requisition, an offer); omit it for the viewer's own. The field knows money, not
salaries: domain rules come in through `validate` (`utils/ctc` has the salary one).

A salary is always the **full annual amount**. Never label a field in lakhs or LPA.

## Shared components OUTSIDE this folder — check here too

This index used to cover only `ui/`, and the most-used shared component in the entire
codebase is not in `ui/`. A recruitment drill-down was built on a hand-written `<Table>`
while `MaterialTable` sat one directory up, imported by 84 other files. Searching the index
and finding nothing is exactly the failure this file exists to prevent, so the neighbours
are listed here.

They live in `@app/modules/common/components/` (one level up from `ui/`).

| Need | Use | Imported by | Never |
|---|---|---|---|
| **Any data table** | **`MaterialTable`** | **84 files** | a hand-written `<Table>`/`<TableHead>`/`<TableRow>` |
| Tabbed page shell | `MaterialHeaderTab` | 21 | a bespoke `<Tabs>` row |
| Date-period tabs / nav / filter | `PeriodTabs`, `PeriodNavigator`, `PeriodFilter` | 16 / 16 / 11 | a hand-rolled month stepper |
| Export to Excel/CSV | `ExportButton` | 12 | a bespoke download handler |
| Loading placeholder | `Skeleton` | 11 | a bare `<CircularProgress>` for list content |
| Avatar with fallback initials | `SmartAvatar` | 10 | `<Avatar>` plus your own initials logic |
| Summary card | `CommonCard` | 10 | a `GlassCard` with a hand-built header |
| Employee name + avatar in a cell | `EmployeeIdentityCell` | 8 | re-assembling name and avatar per table |
| Chart drill-down modal | `DrillDownDialog` | 5 | a raw `<Dialog>` (it also fixes the z-index against fullscreen charts) |
| Lazy-mounted section | `LazySection` | 5 | rendering an expensive panel eagerly |

**`MaterialTable` is the one to remember.** It is a lazy boundary over a 2,500-line engine
and brings sorting, per-column search, column show/hide, export, full-screen, and column
preferences persisted per user. Any table written by hand starts without all of it, and the
users of that screen quietly get a worse product than everyone else.

Columns are `MRT_ColumnDef[]` in a `useMemo`. Two rules worth stating, because both have
been got wrong:

- **Sort on the value, render what you like.** Give `accessorFn` the number or date and put
  the chip in `Cell`. Sorting a rendered label orders `"9d"` after `"40d"`.
- **An actions column is not data.** Set `enableSorting`, `enableColumnFilter` and
  `enableGlobalFilter` to `false` on it, or you offer three controls that do nothing.

**If the engine is missing something you need, add it to the engine.** Do not work around
it in a page — that is how the second table gets written.

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

**A structural heading then renders UPPERCASE.** `GlassHeader`, `ListHeader`,
`SectionHead`, `SettingsSection` and `ConfigSectionCard` spread `HEADING_CASE_SX`
over the title, so a dialog header, page header or section lead-in reads as
"BIOMETRIC DEVICES". Stat captions, eyebrows and column headers were already
uppercase and stay that way.

The uppercasing is **CSS, over a title-cased string** — never an uppercased
string. The accessible name stays "Biometric Devices" (a screen reader announces
the words instead of spelling the capitals), copying a heading pastes normally,
find-in-page still matches, and the style is reversible in one constant. An
uppercased string throws the original casing away for good.

Three things stay title-cased, deliberately:

| Not uppercased | Why |
|---|---|
| Buttons (`WtButton`) | Capitals flatten the word outline the eye matches on, so labels read slower and truncate sooner — and a destructive action should not shout. Material dropped all-caps buttons in v3 for the same reason. |
| Input labels | MUI measures the label to cut the notch in the outline and never sees CSS, so an uppercased label outgrows its gap and lands on the border. See the warning above. |
| Card / tile titles carrying CONTENT | A device name, a person, a navigation destination is data, not a region name. `NavCard` keeps title case. |

Where a screen renders its own region title rather than using a kit header,
spread `HEADING_CASE_SX` so it matches.

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

| Context | Use | Engine |
|---|---|---|
| Formik form field | `DropdownInput` | `WtSelect` |
| Standalone / redux-bound | `SelectInput` | `WtSelect` |
| Country / state field | `LocationDropdown` | `WtSelect` |
| Reimbursement type field | `ReimbursementDropdown` | `WtSelect` |
| Toolbar filter | `ToolbarFilterSelect` | **MUI `Select`** — see below |

`ToolbarFilterSelect` deliberately does NOT use `WtSelect`. It is a compact toolbar
control whose floating uppercase label is MUI's own notched `InputLabel`; routing it
through a react-select engine would lose that label and its wiring. Two engines is correct
here — one for rich, searchable, large-list selects, one for small MUI-native controls.
What was never correct was nine wrappers each re-deriving menu behaviour.

`DropdownInput` keeps only what is genuinely its own — the Formik binding, the label row,
the "+ Add" affordance, and the option renderers (colour dot / avatar / titled row). Menu
behaviour, control styling, windowing and ARIA come from the engine. Its appearance is now
driven by **kit tokens, not the vendored Metronic `.react-select-styled` SCSS**, in line
with the MUI + Tailwind standard.

**Do not add a fourth wrapper.** If a screen needs something none of them do, add the prop
to `WtSelect` and let the wrapper pass it through. This codebase already grew nine select
wrappers — two of them (`DropdownInput` and `FormikDropdownInput`) were both Formik +
react-select, i.e. the same component twice — which is exactly how dropdowns ended up
opening downward into nothing on some screens and behind the dialog on others.

`FormikDropdownInput` has since been **deleted**; its six call sites moved to
`DropdownInput`. It always painted a status circle on every option, defaulting to amber,
so lists whose options carried no colour showed a uniform dot that meant nothing. Colour is
now shown only where it carries meaning, via `showColor`.

## `html:` strings — escape at the interpolation, always

React escapes `{value}` in JSX for you. The moment a string leaves JSX — SweetAlert's
`html:`, `dangerouslySetInnerHTML`, a Leaflet `divIcon` — that protection is gone and
the browser parses whatever you hand it as markup. SweetAlert2 says so in its own
typings: *"SweetAlert2 does NOT sanitize this parameter."*

Four dialogs shipped this bug: an employee name, a branch name, an organisation name
and a server error message, each interpolated straight into `html:`. A name of
`<img src=x onerror=…>` then executes in the browser of whoever opens the dialog —
planted once, fired later, usually at someone with more access.

```tsx
// NO — the natural thing to type, and the unsafe thing to type
html: `Delete <b>${org.name}</b>?`

// YES — same markup, every ${…} escaped, nothing to remember
html: safeHtml`Delete <b>${org.name}</b>?`
```

Both arms of a ternary need it. A literal with no interpolation is fine as-is — static
markup carries no user data.

**Generating a list** is the one case `safeHtml` cannot express, because the `<li>` tags
are yours and a tagged template would escape them into visible text. Escape the parts
and join, then silence the lint rule on that line with a comment saying why:

```tsx
// eslint-disable-next-line no-restricted-syntax
html: `<ul>${rows.map((r) => `<li>${escapeHtml(r.message)}</li>`).join('')}</ul>`,
```

Two safety nets sit behind this, and neither is a reason to skip `safeHtml`: the kit's
`toast` / `alertDialog` / `confirmDialog` run every `html` through DOMPurify, and ESLint
rejects an untagged interpolating template assigned to `html:`. Escaping at the
interpolation is still the one that shows intent at the call site.

# Fiscal Year Calendar & Date Picker — Functionality & UI Report

**Primary component:** `FiscalYearRangeField`  
**Architecture:** Product adapter over the design-system kit `DateRangePicker` (popover + shared calendar engine). Not an MUI `Dialog` / `DateCalendar` surface.

**Source of truth (code):**

| File                                                                | Role                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/app/modules/common/components/ui/FiscalYearRangeField.tsx`     | Controlled wire ↔ kit range; draft/confirm; fiscal presets           |
| `src/app/modules/common/components/ui/FiscalYearRangePopover.tsx`   | Popover header (title, hints, Start→End caps), keyboard panel, mode toggle |
| `src/app/modules/common/components/ui/fiscalYearRangePick.ts`       | Day-click selection state machine (`CalendarDate` + dayjs tests)     |
| `src/ds/ui/date-picker.tsx`                                         | Kit `DateRangePicker` (pill field, popover, presets, Cancel/OK)      |
| `src/ds/ui/calendar.tsx`                                            | Shared calendar / range grid engine                                  |
| `src/utils/fiscalYearRange.ts`                                      | Wire format, parse/compose, wire ↔ `CalendarDate` range, fiscal start month |
| `src/utils/dateFormats.ts`                                          | `DISPLAY` (`YYYY.MM.DD`) vs `WIRE` (`YYYY-MM-DD`)                    |
| `src/app/modules/common/components/ui/FiscalYearRangeField.test.ts` | Unit tests for pick logic and presets                                |
| `src/utils/fiscalYearRange.test.ts`                                 | Unit tests for parsing, conversion, defaults, leap years             |

**Runtime context:** Edit Organization Profile → Basic Information → **Fiscal Year** (and other call sites below).

---

## Screenshots

Historical captures under `docs/images/fiscal-year-range-field/` may still show the pre-kit MUI dialog. **Live UI** is the kit popover described in this doc (caps and closed field use `YYYY.MM.DD`).

| Mode     | Title / chrome                         | Caps / inputs                                      |
| -------- | -------------------------------------- | -------------------------------------------------- |
| Calendar | Popover title **Select fiscal year**   | Start → End caps; kit `RangeCalendar` underneath   |
| Keyboard | Popover title **Enter fiscal year**    | Same caps; two typed fields (`YYYY.MM.DD`)         |

Image files (refresh when updating visuals):

- `docs/images/fiscal-year-range-field/calendar-mode.png`
- `docs/images/fiscal-year-range-field/keyboard-mode.png`

---

## 1. Purpose

`FiscalYearRangeField` is the **single shared control** for editing an organization / prefix **fiscal year range**.

- It is for **editing** a start–end range, **not** for browsing periods (lists/dashboards use PeriodFilter / Period Navigator).
- It is a **thin adapter** on kit `DateRangePicker`: pill field + **popover** (not a shared M3 `Dialog` with `TimePickerField`).
- Fiscal-only chrome (bound caps, step hints, keyboard panel, mode toggle) lives in `FiscalYearRangePopover`.
- One calendar for **both** bounds: pick start, then end (or edit either bound via caps / the pick machine).
- Stored value is always a string: `"YYYY-MM-DD to YYYY-MM-DD"`.

---

## 2. Where it appears in the UI

### 2.1 Closed field (trigger)

Shown inside **Edit Organization Profile** → section **Basic Information** (and other call sites below).

| Element                | Behavior / copy                                                                 |
| ---------------------- | ------------------------------------------------------------------------------- |
| Label                  | Default `"Fiscal Year"` (`""` hides the visible label; aria-label still set)    |
| Trigger value          | Kit segmented date inputs in company **DISPLAY** (`YYYY.MM.DD`)                 |
| Empty / placeholder    | Kit range field empty state                                                     |
| Trailing control       | Kit calendar trigger (opens popover)                                            |
| Helper / error         | `description` when valid; `errorMessage` when `error`                           |
| Density                | `comfortable` (default) or `compact` (`data-density` for toolbars)              |
| Unsaved                | Optional `changed` → warning **Unsaved** badge beside the field                 |
| Invalid                | Kit `isInvalid` styling when `error`                                            |

Human-readable range elsewhere (tables, summaries) uses `formatFiscalYearRange` → e.g. `2026.04.01 – 2027.03.31`.

### 2.2 Call sites

| Screen / module                          | Notes                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `OrganizationProfileForm`                | System field `fiscalYear`; helper via `helperText`                    |
| `OrganizationFormModal` / New org dialog | Creates org with fiscal year                                          |
| `Overview` (company)                     | Formik + Yup required                                                 |
| `PerOrgPrefixSettings`                   | `density="compact"`; may use empty label / custom start/end labels; `changed` for unsaved |
| `PrefixSettingsForm`                     | Prefix fiscal year editing                                            |

---

## 3. Popover shell (kit `DateRangePicker`)

| Detail                | Spec                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| Surface               | Kit **popover** (not MUI `Dialog` / Grow / `scrimSx` / `sheetSx`)    |
| Confirm flow          | `confirmSelection` — Cancel / OK; draft until OK                     |
| Title (calendar mode) | **Select fiscal year** (`FiscalYearRangePopoverHeader`)              |
| Title (keyboard mode) | **Enter fiscal year**                                                |
| Step hint (calendar)  | Dynamic — see §5.3                                                   |
| Step hint (keyboard)  | `Type dates as YYYY.MM.DD or 1 Apr 2026`                             |
| Presets               | Fiscal preset chip(s) in the confirm footer (see §7)                 |
| Mode toggle           | `popoverFooterStart` — calendar ↔ keyboard                           |
| Calendar locale       | App locale; override with `calendarLocale`                           |

Closing: Cancel, outside click / Esc (discard draft), or OK (commit) → `onBlur` for Formik touched.

---

## 4. Bound caps strip (Start → End)

Gestalt “one span” header above the calendar / keyboard panel (`FiscalYearRangePopoverHeader`).

```
┌─────────────────────┬───┬─────────────────────┐
│ START               │ → │ END                 │
│ 2026.04.01          │   │ 2027.03.31          │
└─────────────────────┴───┴─────────────────────┘
```

Eyebrows show the last word of `startLabel` / `endLabel` (e.g. **Start** / **End**); full labels stay on `title` / `aria-label`.

| Detail               | Spec                                                                            |
| -------------------- | ------------------------------------------------------------------------------- |
| Default start label  | `"Fiscal Year Start"` (overridable via `startLabel`)                            |
| Default end label    | `"Fiscal Year End"` (overridable via `endLabel`)                                |
| Value format in caps | Company **DISPLAY** via `formatDate` — `YYYY.MM.DD` (e.g. `2026.04.01`)         |
| Empty value          | Em dash `—`                                                                     |
| Active bound         | Primary fill + primary-foreground text                                          |
| Inactive bound       | Transparent on muted wash; foreground text                                      |
| Arrow                | Lucide `ArrowRight`; primary when both ends set, else muted                     |
| End disabled until   | `draftFrom` exists (opacity 0.5, clicks ignored)                                |
| Tap Start / End      | Sets active `bound` (End only if start exists)                                  |

Active bound drives the pick machine and which keyboard field is conceptually focused.

---

## 5. Calendar mode — date picker (detail)

### 5.1 Engine & layout

| Detail              | Spec                                                                          |
| ------------------- | ----------------------------------------------------------------------------- |
| Library             | Kit `RangeCalendar` (`@/ds/ui/calendar`) inside kit `DateRangePicker` popover |
| Values              | `@internationalized/date` `CalendarDate`                                      |
| Outside-month days  | Hidden by default, as in every kit picker; `hideOutsideDays={false}` shows them |
| Week start          | Monday, the calendar engine's default; override with `firstDayOfWeek`         |
| Bounds              | ISO `minValue` / `maxValue` / `isDateUnavailable`; OK stays disabled outside  |
| Picker value        | Incomplete end painted as same-day anchor so hover-preview still works        |
| Draft until OK      | Calendar / preset changes stay in draft while the popover is open             |

### 5.2 Range painting

Visual model comes from the **kit** range calendar: solid endpoints + continuous range band between them (not a custom MUI `RangeDay` slot).

### 5.3 Step hints (calendar)

| Draft state       | Hint copy                                 |
| ----------------- | ----------------------------------------- |
| No start yet      | `Choose the start of the fiscal year`     |
| Start set, no end | `Now choose the end date`                 |
| Both set          | `Tap Start or End to adjust either bound` |

### 5.4 Day-click state machine (`applyFiscalCalendarDayPick`)

Pure function in `fiscalYearRangePick.ts` (CalendarDate).

| Situation                                                    | Result                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| No start yet                                                 | Click → set **start**, clear end, next bound = **end**          |
| Start set, waiting for end (`bound === 'end'`)               | Click → set **end**, keep start, next bound = **start**         |
| Both set **and** active bound is **end**                     | Click → replace **end** only                                    |
| Both set **and** active bound is **start** (or restart rule) | Click → **restart**: new start, clear end, next bound = **end** |

Restart condition (code):

```text
!draft.from  OR  (both from & to set AND bound !== 'end')
```

Important UX implications:

- After a complete range, tapping a day while **Start** is active **clears End** and starts a new range.
- To change only the end, activate the **End** cap first, then click a day.
- End is **not** auto-calculated on start pick; the user (or the fiscal preset) sets the end.
- A one-shot full range (preset / wholesale replace) bypasses the step machine and sets both bounds.

### 5.5 Accept / validation (calendar & keyboard)

| Rule              | Detail                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| OK enabled when   | Both draft ends exist **and** end is not before start (`canConfirm`)                                          |
| On OK             | Dates ordered chronologically; written as ISO via `fiscalStringFromRange`                                     |
| Cancel / dismiss  | Discard draft to open-snapshot; no `onChange`                                                                 |

Segment typing on the **closed** kit field can commit a complete valid range immediately (popover closed path).

---

## 6. Keyboard mode — typed dates

Toggle via footer mode button (calendar ↔ keyboard). Replaces the calendar with `FiscalYearRangeKeyboardPanel` (`popoverBody`).

| Detail              | Spec                                                         |
| ------------------- | ------------------------------------------------------------ |
| Popover title       | **Enter fiscal year**                                        |
| Layout              | Two inputs: Start / End (2-col grid)                         |
| Placeholder         | `YYYY.MM.DD` (`DATE_FORMATS.DISPLAY`)                        |
| `inputMode`         | `numeric`                                                    |
| Helper under fields | `Accepts YYYY.MM.DD or e.g. 1 Apr 2026. Saved as ISO on OK.` |
| Focus on an input   | Sets active `bound` to that side                             |
| Caps strip          | Still visible and interactive                                |

### 6.1 Typed parse

Accepted when parse succeeds (`parseTypedFiscalDate` / range paste via `parseTypedFiscalRangeInput`):

1. **Dotted company display:** `YYYY.MM.DD`
2. **Natural forms** the parsers accept (e.g. `1 Apr 2026`)
3. **Full range paste** on the field wrapper (ISO / dotted / natural with `to` / `-` / `–`)

Invalid / partial typing updates text without overwriting draft dates until parse succeeds.

---

## 7. Footer actions

```
[ ⌨️ / 📅 ]  [ Apr–Mar ]          [ Cancel ]  [ OK ]
```

| Control        | Behavior                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Mode toggle    | Calendar ↔ keyboard (`FiscalYearRangeModeToggle`). Syncs text fields when entering keyboard mode.                                        |
| Fiscal preset  | Kit preset chip from `buildFiscalYearPresets(fiscalStartMonth, fiscalPresetLabel)`. Default label **Apr–Mar** when start month is 4. Does not auto-close (`closeOnPresetSelect={false}`). Tooltip: `Set to current {label} fiscal year`. |
| **Cancel**     | Close without commit                                                                                                                     |
| **OK**         | Commit if `canConfirm`                                                                                                                   |

### 7.1 Fiscal start month

| Prop / helper            | Role                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `fiscalStartMonth`       | Calendar month FY starts (1=Jan … 12=Dec). Default **4** (April).    |
| `fiscalPresetLabel`      | Optional chip label override; else `getFiscalPresetLabel(month)`.    |
| `getDefaultFiscalYear(m)`| Current FY for “today” for that start month (e.g. 7 → Jul–Jun).      |
| `DEFAULT_FISCAL_START_MONTH` | `4` in `@utils/fiscalYearRange`.                                 |

Out-of-range months clamp back to April.

---

## 8. Data formats (critical)

| Layer                      | Format                                | Example                                      |
| -------------------------- | ------------------------------------- | -------------------------------------------- |
| **Wire / storage / API**   | `YYYY-MM-DD to YYYY-MM-DD`            | `2026-04-01 to 2027-03-31`                   |
| **Legacy read**            | `DD/MM/YYYY to DD/MM/YYYY`            | Accepted by parsers; rewritten to ISO on OK  |
| **Legacy year pair**       | `2030-2031`                           | `toCanonicalFiscalYearRange` → Apr–Mar ISO   |
| **Closed field / caps / keyboard DISPLAY** | `YYYY.MM.DD`               | `2026.04.01`                                 |
| **Readable range helper**  | Dotted span via `formatFiscalYearRange` | `2026.04.01 – 2027.03.31`                  |

Writers **always** emit ISO on OK / commit. Org profile wraps value with `toCanonicalFiscalYearRange` before binding.

---

## 9. Props API

```ts
interface FiscalYearRangeFieldProps {
  value: FiscalYearRangeValue; // stored range string
  onChange: (value: FiscalYearRangeValue) => void;
  label?: string; // default "Fiscal Year"; "" hides visible label
  startLabel?: string; // default "Fiscal Year Start"
  endLabel?: string; // default "Fiscal Year End"
  fiscalStartMonth?: number; // 1–12; default 4 (April)
  fiscalPresetLabel?: string; // override preset chip label
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string; // error message while error, else description
  onBlur?: () => void; // popover close or field blur
  density?: "comfortable" | "compact"; // default comfortable
  changed?: boolean; // shows Unsaved badge
  /** @deprecated Kit colours come from theme; kept for call sites. */
  tone?: unknown;
}
```

---

## 10. Internal state (while editing)

| State                         | Meaning                                              |
| ----------------------------- | ---------------------------------------------------- |
| Open session (`openRef`)      | Popover open; draft isolated until OK / discard      |
| `mode`                        | `'calendar'` \| `'keyboard'`                         |
| `bound`                       | `'start'` \| `'end'` — which side is being edited    |
| `draft` (`from` / `to` / `bound`) | `CalendarDate` drafts (not committed until OK) + active bound; mirrored in `draftRef` |
| `text` (`start` / `end`)      | Keyboard field strings                               |
| `presets`                     | Built from `fiscalStartMonth` / `fiscalPresetLabel`  |
| Snapshot (`snapshotRef`)      | Value at open — restore target on Cancel / dismiss   |

On open: seed from current `value` (a stored value is either a full range or empty); force calendar mode; bound = start.

---

## 11. Theming notes

| Layer                         | Use                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| Kit field / popover / calendar | Theme tokens via design system (`primary`, `muted`, etc.)         |
| `TimePickerField` M3 dialog   | Still uses `sheetSx` / `scrimSx` / `M3_MOTION` in `surfaces.ts` — **not** shared with FY |
| Deprecated `tone`             | Ignored for colour; call sites may still pass it                    |

---

## 12. What this is **not**

- Not Flatpickr `mode: 'range'`.
- Not two independent date fields for fiscal editing (call sites should use this control).
- Not automatic enforcement of exactly 365/366 days — any ordered start≤end pair is OK.
- Not an MUI `Dialog` + `DateCalendar` + custom `RangeDay` (that implementation was replaced by the kit adapter).
- Not the same dialog chrome as `TimePickerField`.

---

## 13. UI ↔ code map

| UI                                              | Code                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Closed kit range field                          | `DateRangePicker` in `FiscalYearRangeField`                 |
| Helper / error copy                             | `description` / `errorMessage` from `helperText`            |
| Popover “Select fiscal year”                    | `mode === 'calendar'` title in popover header               |
| Hint “Tap Start or End…”                        | Both drafts set → `stepHint`                                |
| Primary Start / muted End caps                  | Active `bound` styling; values via `formatDate`             |
| Month grid + range band                         | Kit `RangeCalendar`                                         |
| Footer mode + fiscal preset + Cancel/OK         | Mode toggle + kit presets + confirm footer                  |
| “Enter fiscal year” + dotted inputs             | `mode === 'keyboard'` + `FiscalYearRangeKeyboardPanel`      |
| “Saved as ISO on OK”                            | Keyboard panel helper                                       |
| Unsaved badge                                   | `changed` prop → kit `Badge`                                |

---

## 14. Related utilities (non-UI)

| Utility                      | Role                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `getDefaultFiscalYear(m)`    | Current fiscal ISO range for start month `m`                      |
| `getFiscalPresetLabel(m)`    | Chip label (e.g. `Apr–Mar`, `Jul–Jun`)                            |
| `splitFiscalYearRange`       | Parse stored → `{ from, to }` ISO                                 |
| `composeFiscalYearRange` / `composeOrderedFiscalYearRange` | Join wire dates (ordered on write)        |
| `toCanonicalFiscalYearRange` | Normalize legacy / year-pair strings                              |
| `fiscalRangeFromString` / `fiscalStringFromRange` | Stored string ↔ kit `CalendarDate` range     |
| `parseFiscalCalendarDate`    | Strict ISO → `CalendarDate` (rejects impossible days)             |
| `formatFiscalYearRange`      | People-facing dotted span                                         |
| `fiscalYearSegment.ts`       | Prefix / numbering segment formatting (separate from this picker) |
| `fiscalYearHelper.ts`        | Display labels like `FY …` on other screens                       |

---

## 15. Summary

`FiscalYearRangeField` is a **kit `DateRangePicker` adapter** with fiscal popover chrome:

1. A **closed kit field** using company **DISPLAY** dates (`YYYY.MM.DD`).
2. A **Start → End cap strip** that selects which bound to edit (same DISPLAY format).
3. A **calendar mode** on the shared kit range calendar plus the fiscal pick state machine.
4. A **keyboard mode** accepting `YYYY.MM.DD` or natural dates like `1 Apr 2026`.
5. A **configurable fiscal preset** (`fiscalStartMonth`, default April → **Apr–Mar**).
6. Persistence as **`"YYYY-MM-DD to YYYY-MM-DD"`**, with legacy formats accepted on read.

This matches the live Organization / prefix editors and is the baseline for future kit calendar work.

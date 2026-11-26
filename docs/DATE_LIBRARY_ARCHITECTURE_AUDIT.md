# WiseTech — Date Library Evaluation & Architecture Audit (`Day.js` vs `date-fns` vs `@internationalized/date`)

> **Date:** 2026-11-26  
> **Scope:** Read-only repository audit across `wisetech-frontend` and sibling `wisetech-backend`  
> **Decision Summary:** **Specialized Hybrid Architecture** — keep and centralize **Day.js** for application-level date/datetime/timezone/formatting operations, keep **`@internationalized/date`** for the `src/ds` React Aria calendar and DatePicker model, and introduce a thin bootstrap + conversion boundary layer. **Do not migrate to `date-fns`.**

---

## 1. Project Context & System Boundaries

### Repository & Runtime Boundaries
- **Frontend (`wisetech-frontend`)**: React 19.3.1, TypeScript 5.3.3 (`strict: true`), Vite 8.3.8, Tailwind CSS v4, Redux Toolkit + TanStack Query, Vitest + Playwright + Storybook 10.
  - **UI Standard (`OldAGENTS.md`, `DESIGN_SYSTEM.md`, ADR-001)**: New and edited UI targets the `src/ds` kit (shadcn `base-maia` on Base UI + Tailwind v4, **React Aria Components** for date, time, and number inputs). Legacy MUI (`@mui/material`, `@mui/x-date-pickers`), Bootstrap, and Flatpickr are ratcheted down via `.eslintrc.cjs` (`wisetech/no-legacy-ui`, `no-restricted-syntax` banning `<input type="date">` and `.toLocaleDateString()`).
  - **Company Date/Time Standard (`src/utils/dateFormats.ts`, `src/utils/timeFormat.ts`)**:
    - **DISPLAY**: `YYYY.MM.DD` (compact) and `D MMMM YYYY` (long); time follows a 4-tier preference chain (`personal → branch → org → 12h default`).
    - **WIRE**: ISO `YYYY-MM-DD` (date-only) and ISO-8601 UTC instants (`...Z`) for timestamps.
    - **Week Start**: Monday app-wide (`APP_WEEK_START = 1`, bootstrapped in `src/main.tsx` via `configureWeekStart()`).
- **Backend (`wisetech-backend`)**: Separate Git repository (not a pnpm monorepo) running Node + Express + TypeScript 6 + Prisma (MySQL) + BullMQ/Redis.
  - Runs server infrastructure in **UTC**; computes business days per branch IANA timezone (defaulting to `Asia/Kolkata` via `src/utils/istDate.ts` and `TimezoneProvider.ts`).
- **Standing DatePicker Scope (`.cursor/rules/date-picker-standing-scope.mdc`, `.cursor/rules/date-picker-system.mdc`)**:
  - Shared kit lives in `src/ds/ui/calendar.tsx`, `src/ds/ui/date-picker.tsx`, and `src/ds/ui/date-field.tsx` (`@internationalized/date`).
  - Fiscal Year product adapter is `FiscalYearRangeField` (`docs/FISCAL-YEAR-RANGE-FIELD-UI.md`).
  - Consumer replacement scope is Organization / Fiscal Year only until expanded; legacy MUI pickers (`WtDateField`, `PlainDatePicker`, `PeriodFilter`) remain untouched unless explicitly scoped.
- **Recent Phase 1 DatePicker Changes (commit `503397cf`)**:
  - Kit `Calendar`, `RangeCalendar`, `DatePicker`, and `DateRangePicker` extended with Monday-first defaults (`firstDayOfWeek="mon"`), `hideOutsideDays`, `confirmSelection`, popover customization slots, and configurable `fiscalStartMonth` / presets in `FiscalYearRangeField` + `src/utils/fiscalYearRange.ts`.

---

## 2. Deliverable A — Current State & Repository-Wide Usage Audit

### Installed Date-Related Dependencies

| Package | Repo | `package.json` Specifier | Resolved (`pnpm-lock.yaml`) | Active Source Files | Role |
|---|---|---|---|---|---|
| `dayjs` | Frontend | `^1.11.11` | `1.11.21` | **284** (274 prod, 10 test) | Primary date/datetime utility + MUI X adapter |
| `dayjs` | Backend | `^1.11.12` | `1.11.20` | **54** (47 prod, 7 test) | Business-day, timezone, payroll, attendance, cron |
| `@internationalized/date` | Frontend | `3.12.4` | `3.12.4` | **26** (19 prod, 7 test/story) | React Aria calendar & DatePicker value model (`CalendarDate`) |
| `@mui/x-date-pickers` | Frontend | `^7.10.0` | `7.29.4` | **17** | Legacy `WtDateField`, `WtDateTimeField`, `PlainDatePicker`, `TimePickerField`, overview toggles (via `AdapterDayjs`) |
| `flatpickr` / `react-flatpickr` | Frontend | `^4.6.13` / `^3.10.13` | `4.6.13` / `3.10.13` | **5** (wrapper, `configureWeekStart`, 3 legacy screens) | Legacy date/time inputs (`PublicHolidayForm`, `PublicHoliday`, `ProfileDetails`) |
| `@fullcalendar/*` | Frontend | `^6.1.20` | `6.1.20` | **1** (`CustomCalendar.tsx`) | Full-page workspace calendar |
| `countries-and-timezones` | Backend | `^3.9.0` | `3.9.0` | **1** (`utils/countryTimezones.ts`) | Offline ISO2 country → IANA timezone dropdown data |
| `react-intl` | Frontend | `^7.1.14` | `7.1.14` | **0** date usages | Metronic UI string i18n only |
| `date-fns` | Both | *Not installed* | *Not installed* | **0** | Not present |
| `moment` | Frontend | *Transitive only* | `2.30.1` | **0** | Pulled solely by devDependency `@types/chart.js@2.9.37` (and optional peer of `@mui/x-date-pickers`) |
| `luxon` | Backend | *Transitive only* | `3.7.2` | **0** | Transitive lockfile entry only |
| Native `Date` (`new Date(`) | Frontend / Backend | Built-in | Built-in | **171** FE / **247** BE | Timestamps, `toISOString()`, legacy calculations, Prisma `Date` scalars |
| `Intl.DateTimeFormat` | Frontend / Backend | Built-in | Built-in | **7** FE / **5** BE | Browser TZ detection, kit month labels, legacy `dateFormatter` |
| `.toLocaleDateString()` | Frontend / Backend | Built-in | Built-in | **19** FE / **8** BE | Legacy formatting (ESLint-banned in new FE code) |

### Frontend `dayjs` Distribution by Module (Top Modules)

| Module / Area | Files Importing `dayjs` |
|---|---|
| `app/pages/employee/attendance` | 51 |
| `app/pages/employee/reimbursement` | 25 |
| `app/modules` (shared inputs, common UI, table sort, etc.) | 22 |
| `app/pages/employee/companies` | 21 |
| `app/pages/employee/leads` | 17 |
| `app/pages/employee/kpis` | 13 |
| `app/pages/employee/loans` | 13 |
| `app/pages/dashboard` | 11 |
| `app/pages/employee/salary` | 9 |
| `app/pages/employee/entity` | 8 |
| `app/pages/employee/increment` | 8 |
| `app/pages/employee/projects` | 8 |
| `modules/payroll` | 8 |
| `app/pages/employee/timesheet` | 7 |
| `app/pages/employee/calendar` | 4 |
| `app/pages/employee/tasks` | 4 |
| `app/pages/employee/wizard` | 3 |
| Other (`utils/`, `services/`, `hooks/`, `company/`, `forms/`, `meetings/`, `my-team/`, `audit/`, `admin/`, `approvals/`, `billing/`) | 52 |

### Usage Classified by Functionality (All 17 Categories)

| # | Category | Frontend Implementation | Backend Implementation | Primary Modules |
|---|---|---|---|---|
| 1 | **Date formatting** | `dateFormats.ts` (78 imports, Day.js), `utils/date.ts` (24 imports), ~200+ inline `dayjs().format(...)`, 19 `.toLocaleDateString()` | `dayjs().format(...)` (114 `YYYY-MM-DD`, 23 `DD MMM YYYY`, etc.), `istDateTimeRange` | Attendance, Reimbursement, Companies, Leads, KPIs, Loans, Payroll |
| 2 | **Date parsing** | `dayjs(str, fmt)` (13 files, 58+ sites), `dateSort.ts` (strict multi-format), `fiscalYearRange.ts` (regex + `parseDate` + `new Date` + `dayjs`), `calendarKey.ts` (regex-only) | `parseCalendarDateToUtcMidnight` (regex + UTC `Date`), `queryDateRange.ts` (strict ISO regex), `dayjs(str, fmt)` (3 files — **broken**, see §6) | Attendance, Calendar (`PublicHolidayListTwo`), Tables (`dateSort`), Org/Prefix FY, Backend handlers |
| 3 | **Date manipulation** | `dayjs.add/subtract/startOf/endOf` across 150+ files; `CalendarDate.add/subtract/set` in `calendar.tsx` & `fiscalYearRange.ts` | `dayjs.add/subtract/startOf/endOf`, `nextCalendarDay` (pure UTC math), `Date.setDate` (legacy `utils/date.ts`) | Period navigation, Leave, Payroll, Attendance, Cron jobs |
| 4 | **Date comparison** | `isBefore`, `isAfter`, `isSame`, `isSameOrBefore` (110+ sites), `isSameOrAfter`, `isBetween`, `CalendarDate.compare()` | `isBefore`, `isAfter`, `isSame`, `isSameOrBefore`, `isSameOrAfter`, ISO string lexical comparison (`<=`) | Attendance, Leaves, KPIs, Loans, Dashboard, Payroll |
| 5 | **Date range calculations** | `PeriodFilter.tsx`, `periodRange.ts`, `leaveCount.ts`, `leaves.ts`, `rangeCalendar.ts` | `eachDateBetween`, `generateMonthsFromRange`, `parseOptionalDateRange`, `reimbursementDateRange.ts` | Attendance, Leaves, KPIs, Reports, Billing, Reimbursement |
| 6 | **Fiscal Year calculations** | **3 separate utilities**: `fiscalYearRange.ts` (`CalendarDate` + `Date` + `dayjs`), `fiscalYearHelper.ts` (`dayjs`), `utils/file.ts` (`generateFiscalYearFromGivenYear`, `dayjs`), plus regex-only `fiscalYearSegment.ts` | `fiscalYearFormat.ts` (pure regex/string, twin of `fiscalYearSegment.ts`), `documentNumbering` | Organization Profile, Prefix Settings, PeriodFilter, Leave pro-rating, Timesheets, Tasks |
| 7 | **Date-only fields** | Kit `DatePicker`/`DateRangePicker`/`DateField` (`CalendarDate`), `WtDateField`/`PlainDatePicker` (wire `YYYY-MM-DD` via `AdapterDayjs`), `calendarKey.ts` | `parseCalendarDateToUtcMidnight`, `toDateKey` (`dayjs.utc`), `nextCalendarDay` | Org Profile, Reimbursement, Billing, Leads/Projects, Holidays, Attendance |
| 8 | **DateTime fields** | `WtDateTimeField` (`YYYY-MM-DDTHH:mm`), `formatDateTime` / `formatDateTimeLong`, `DateTimePanel.tsx`, `modules/audit/time.ts` | Prisma `DateTime` (`Date`), `dayjs.utc(instant).tz(tz)` | Meetings, Attendance punches, Audit logs, Interviews, Approvals |
| 9 | **Timezone conversions** | `correctionPayload.ts`, `reimbursementFormat.ts`, `OpenAttendanceRequests.tsx`, `utils/date.ts`, `utils/statistics.ts` (6–8 files using `.tz()`); `Intl.DateTimeFormat().resolvedOptions().timeZone` for browser TZ | **Core workload**: 26 files use `dayjs/plugin/timezone` (`istDate.ts`, `TimezoneProvider.ts`, `lateMarkPolicy.ts`, `earlyCheckoutPolicy.ts`, `attendanceCalendar.ts`, `salaryCalculations.ts`, `cron.ts`, `countryTimezones.ts`) | Attendance, Biometric sync, Payroll, Cron jobs, Branch settings |
| 10 | **UTC conversions** | `dayjs.utc()` in 8 files; `.toISOString()` in 59 files | `dayjs.utc()` in 27 files; `Date.UTC()` in `istDate.ts`, `dateHelpers.ts`; `.toISOString()` in 75 files | Attendance instants, Holiday storage, Query bounds |
| 11 | **API date serialization** | `toWireDate` (`YYYY-MM-DD`), `CalendarDate.toString()`, `dayjs().format('YYYY-MM-DD')` (455 sites), `.toISOString()` | `toIstDateString`, `toDateKey`, `getUtcBoundsForIstDate`, Prisma `Date` | All `src/services/*` & backend `handlers/*` |
| 12 | **Calendar & DatePicker operations** | 4 stacks coexisting: (1) `src/ds/ui` React Aria + `@internationalized/date`, (2) `@mui/x-date-pickers` + `AdapterDayjs`, (3) `FullCalendar` (`CustomCalendar.tsx`), (4) `Flatpickr` (3 legacy screens) | N/A | `src/ds/ui/*`, `common/components/ui/dates.tsx`, `FiscalYearRangeField.tsx`, `CustomCalendar.tsx` |
| 13 | **Localization / i18n** | **Minimal**: fixed English `YYYY.MM.DD` / `D MMMM YYYY`; `en-CA` locale wrapper for `YYYY.MM.DD` React Aria segments; `en-GB` for Monday-first grid; `en-IN` in `KitProvider` (for number grouping); **0** `dayjs/locale/*` imports | **0** `dayjs/locale/*` imports; English month/weekday names only | `ds/ui/date-field.tsx`, `ds/provider.tsx`, `configureWeekStart.ts` |
| 14 | **Form validation** | `Yup` (`reimbursementSchema.ts`, Formik schemas), manual comparisons in `DateInput.tsx` & `RecordPaymentModal.tsx` | `Yup` (`yup.date()` across 31 schema rules in `clientCompanies.ts`, `leadImportSchema.ts`, `timeAndTask.ts`, etc.), `queryDateRange.ts` | Forms, Lead import, Reimbursement, Org Profile |
| 15 | **Reporting & filtering** | `PeriodFilter.tsx`, `periodRange.ts`, `dateSort.ts`, KPI/Attendance/Lead/Company/Salary `Daily`/`Weekly`/`Monthly`/`Yearly`/`Custom` toggles | `parseOptionalDateRange`, `KpiRepository.ts`, `salaryCalculations.ts`, `generateMonthsFromRange` | Dashboard, KPIs, Attendance, Payroll, Billing, Leads, Projects |
| 16 | **Scheduling, meetings & attendance** | `CustomCalendar.tsx`, `MeetingFormBody.tsx`, `MeetingsOverviewTab.tsx`, `InterviewsPanel.tsx`, `attendance/` (51 files), `timesheet/` (7 files) | `attendanceCronJobs.ts`, `kpiCronJobs.ts`, `greetingCronJobs.ts`, `cron.ts`, `workCalendar.ts`, `lateMarkPolicy.ts`, `earlyCheckoutPolicy.ts` | Calendar, Meetings, Recruitment, Attendance, Timesheets |
| 17 | **Backend date processing** | N/A | 54 `dayjs` files + 247 native `Date` files; heavy UTC ↔ branch-TZ boundary math, sandwich leave rules, arrear/proration, cron scheduling | `wisetech-backend/src/utils/*`, `services/*`, `db/*`, `handlers/*` |

---

## 3. Deliverable B — Day.js Implementation Audit

### What Is Working Well
1. **Strong newer utilities exist**: `src/utils/dateFormats.ts`, `src/utils/timeFormat.ts`, `src/utils/periodRange.ts`, `src/app/modules/common/components/table/dateSort.ts`, `src/app/modules/common/components/attendance/correctionPayload.ts`, and backend `src/utils/istDate.ts` + `src/utils/queryDateRange.ts` are cleanly typed, documented, and unit-tested.
2. **Consistent timezone model where adopted**: `dayjs.utc(instant).tz(branchTimezone)` cleanly resolves DST-aware IANA zones on both frontend (`correctionPayload.ts`) and backend (`istDate.ts`, `lateMarkPolicy.ts`, `earlyCheckoutPolicy.ts`, `attendanceCalendar.ts`).
3. **Zero locale bloat**: Neither repo pulls in `dayjs/locale/*` bundles.
4. **Compact footprint**: Installed Day.js `1.11.21` core + all 10 plugins is **25.79 KB raw / 11.26 KB gzip** (see §7).

### What Should Be Cleaned / What Is Unnecessarily Complicated
1. **No centralized Day.js bootstrap (root cause of most Day.js bugs)**:
   - **33 frontend files** and **38 backend files** call `dayjs.extend(...)` individually.
   - Because Day.js mutates a shared singleton prototype, files that omit `dayjs.extend(...)` *appear* to work in production only if another route/utility happened to load first — and **silently break** in isolated unit tests, lazy routes, or the backend.
2. **25 unused plugin extensions in frontend + 2 in backend**:
   - `src/utils/date.ts` extends `duration` — never calls `dayjs.duration()`.
   - `src/utils/calculateTotalDuration.ts` extends `duration` — never calls `dayjs.duration()`, and calls `.tz('Asia/Kolkata')` despite its own comment noting the diff of two instants is timezone-invariant.
   - `src/utils/attendanceColorUtils.ts` & `src/app/pages/employee/tasks/tasks/components/TaskTimesheet.tsx` extend `duration` — never call `dayjs.duration()`.
   - `src/utils/file.ts` extends `isBetween` — never calls `.isBetween()`.
   - `src/utils/leaves.ts` extends `utc` & `timezone` — uses neither, while calling `.isSameOrBefore()` without importing it.
   - `EntityTablePage.tsx`, `LeadNewLead.tsx`, `ProjectTablePage.tsx`, `WorkingMethodOptions.tsx`, and 6 KPI views (`kpis/common/{Custom,Monthly,Yearly}.tsx`, `kpis/personal/views/my-kpi/{Custom,Monthly,Yearly}.tsx`) extend `isSameOrBefore`/`isSameOrAfter` without calling them.
   - `src/utils/statistics.ts` calls `dayjs.extend(utc); dayjs.extend(timezone);` **twice** (lines 11–12 and 3990–3991); `wisetech-backend/src/handlers/employees.ts` calls it **twice** (lines 47–48 and 408–409).
   - Backend: `src/services/utils/attendanceVerdictAnnotator.ts` and `src/utils/leaves.ts` extend `timezone` without calling `.tz()`.
3. **Name collisions & duplicate utilities**:
   - `formatDate` exists in `src/utils/dateFormats.ts` (`YYYY.MM.DD`) **and** `src/utils/date.ts` (`"1st January, 2026"` via `toLocaleString`).
   - `formatTime` exists in `src/utils/dateFormats.ts` (no seconds, accepts `DateLike`) **and** `src/utils/date.ts` (with seconds, accepts `Dayjs`).
   - `generateDatesForMonth` and `generateDatesForMonth2` in `src/utils/date.ts:34-72` are copy-pasted duplicates.
   - `src/utils/date.ts` imports `@redux/store`, pulling Redux into any pure utility that touches it (which forced `src/constants/timezone.ts` to be split out).
4. **Manual logic that Day.js already handles**:
   - `src/utils/date.ts:170-192` (`isDateBeforeOrSameAsCurrDate`, `isDateAfterOrSameAsEmployeeOnboardingDate`): manually splits `'DD/MM/YYYY'` and constructs `new Date(...)` instead of `dayjs(date, 'DD/MM/YYYY', true).isSameOrBefore(dayjs(), 'day')`.
   - `src/utils/date.ts:138-151` (`calculateDuration`): approximates remaining days via `now.diff(start, 'day') % 30` instead of advancing `start.add(diffYears, 'year').add(diffMonths, 'month')` and diffing remaining days.
   - `src/utils/date.ts:34-72` (`generateDatesForMonth*`): manually computes `daysInMonth` and hardcoded English month array instead of Day.js or `CalendarDate`.
   - `wisetech-backend/src/utils/date.ts:27-35` (`getTotalDaysBetweenGivenDate`): manually loops `current.setDate(current.getDate() + 1)` instead of `dayjs.utc(end).startOf('day').diff(dayjs.utc(start).startOf('day'), 'day') + 1`.

---

## 4. Deliverable C — `date-fns` Evaluation Against Actual WiseTech Requirements

Evaluated strictly against WiseTech's real operations rather than generic feature comparisons:

| Area | How `date-fns` (v4 + `@date-fns/tz`) Fits WiseTech | Genuine Benefit or Unnecessary Complexity? |
|---|---|---|
| **Formatting & parsing** | Pure functions `format(date, fmt)` & `parse(str, fmt, refDate)`. Strict format parsing is explicit (no plugin forgotten). **However**, uses Unicode TR35 tokens (`yyyy`, `dd`, `a`), whereas WiseTech has **~950+ Moment/Day.js format strings** (`YYYY`, `DD`, `A`) across 338 files. Using `YYYY` in `date-fns` silently formats **week-numbering year** and `DD` formats **day-of-year**. | **Mixed**: eliminates silent missing-`customParseFormat` bugs, but introduces massive migration surface & high token-regression risk. |
| **Date calculations & comparisons** | Clean pure functions (`addDays`, `differenceInMonths`, `isBefore`, `isSameDay`, `startOfWeek(..., { weekStartsOn: 1 })`). No global locale mutation. | **Genuine benefit**: explicit `weekStartsOn: 1` prevents global-mutation bugs like the Tuesday-week bug (§6). |
| **Date ranges** | `eachDayOfInterval`, `eachMonthOfInterval`, `isWithinInterval` replace manual `while` loops in `periodRange.ts`, `leaves.ts`, `dateHelpers.ts`. | **Modest benefit**: backend already abstracted `eachDateBetween` and `generateMonthsFromRange` cleanly. |
| **Fiscal-year calculations** | No built-in fiscal-year primitives. Still requires custom month-offset logic, and native `Date` carries local-TZ hazards that `CalendarDate` already eliminates. | **No advantage** over `@internationalized/date` `CalendarDate`. |
| **Week calculations** | `startOfWeek(d, { weekStartsOn: 1 })` / `endOfWeek(d, { weekStartsOn: 1 })` is pure and immune to global state. | **Genuine benefit**, though equally achievable with Day.js `isoWeek` plugin (`startOf('isoWeek')`). |
| **Locale support** | Modular locale imports (`date-fns/locale/en-GB`). WiseTech uses **zero** non-English date locales (both repos have `0` `dayjs/locale/*` imports). | **Unused advantage** for WiseTech today. |
| **Timezone support** | Requires an additional package (`@date-fns/tz` with `TZDate` in v4). Every timezone-aware site on backend (26 files) & frontend (6–8 files) must rewrite `dayjs.utc(x).tz(zone)` to `new TZDate(x, zone)` and ensure every downstream helper preserves `TZDate`. | **Unnecessary complexity & regression risk**, especially across backend payroll/attendance/cron engines. |
| **Date-only handling** | Operates on native JS `Date` — **no distinct date-only type**. Still vulnerable to local-vs-UTC midnight shifts if callers use `new Date('YYYY-MM-DD')` vs `parseISO`. | **No advantage** over Day.js; **strictly inferior** to `@internationalized/date` `CalendarDate`. |
| **DateTime handling** | Operates on JS `Date` (functions are immutable, though underlying `Date` objects are mutable if touched directly). | Neutral vs Day.js (immutable wrapper objects). |
| **TypeScript support** | First-class native TypeScript types, strict function signatures, zero prototype-augmentation surprises. | **Genuine benefit** — strongest technical point in favor of `date-fns`. |
| **Tree-shaking & modular imports** | ESM per-function tree-shaking. | **Neutral in practice**: WiseTech uses ~20–25 distinct operations (format, parse, diff, add/sub, start/endOf, intervals, relativeTime, TZ), bringing `date-fns` + `@date-fns/tz` to equal or larger gzip size than Day.js (`11.26 KB` gzip). |
| **Bundle size** | Estimated **~15–22 KB gzip** for WiseTech's full operation set + `@date-fns/tz` (*package-level estimate; not installed/measured*). | **No bundle savings** over measured Day.js (`11.26 KB` gzip total for core + all 10 plugins). |
| **API consistency** | Functional (`addDays(d, 1)`) vs fluent chaining (`d.add(1, 'day').startOf('month').format(...)`). Also forces `@mui/x-date-pickers` (`AdapterDayjs` → `AdapterDateFns`) migration across 17 files or shipping **both** libraries simultaneously during transition. | **High friction** during coexistence. |
| **Testing & maintainability** | Pure functions are trivial to unit test with zero global bootstrap. | **Genuine benefit**, but equally achieved by centralizing `dayjs` plugin registration in one bootstrap module. |

**Bottom line on `date-fns`**: Its two genuine technical advantages for WiseTech — **no forgotten plugins** and **no global `weekStart` mutation** — can both be achieved in Day.js in ~1–2 days via a centralized `dayjs` module + `isoWeek`, **without** rewriting 338 files, translating ~950 format tokens, refactoring 26 backend timezone modules, or carrying dual libraries.

---

## 5. Deliverable D — Special Audit: `@internationalized/date`

### Current Usage Across WiseTech (26 files: 19 prod, 7 test/story)
- **`CalendarDate`**: Used in **11 files** (`calendar.tsx`, `date-picker.tsx`, `date-field.tsx`, `FiscalYearRangeField.tsx`, `FiscalYearRangePopover.tsx`, `fiscalYearRangePick.ts`, `fiscalYearRange.ts`, `DateInput.tsx`, `BillDialogs.tsx`, `ProjectStatusControl.tsx`, `period-navigator.tsx`, `RecordPaymentModal.tsx`, `ReimbursementFormDialog.tsx`, `ApplyLeaveScreen.tsx`).
- **`parseDate`**: 18 files; `today` & `getLocalTimeZone`: 4 files; `endOfMonth`/`endOfYear`: 1 file (`calendar.tsx`); `isWeekend`: 1 story (`DatePicker.stories.tsx`); `DateFormatter`: 1 prototype (`ApplyLeaveScreen.tsx`).
- **`CalendarDateTime`**: **0 production usages** (`parseDateTime` appears only in `src/ds/ui/date-field.test.tsx`).
- **`ZonedDateTime`**: **0 usages** anywhere in the repo.
- **`parseTime` / `Time`**: 2 files (stories/tests for `TimeField`).

### Should `@internationalized/date` Remain?
**YES — unequivocally.**
1. **Structural requirement**: ADR-001 standardized `src/ds/ui` on `react-aria-components`. React Aria's `Calendar`, `RangeCalendar`, `DatePicker`, `DateRangePicker`, `DateField`, and `TimeField` **require** `@internationalized/date` `DateValue` types. Neither Day.js nor `date-fns` can replace it.
2. **Superior date-only domain model**: `CalendarDate` represents a pure calendar day `(year, month, day)` with **no time-of-day and no timezone**. `.toString()` always yields ISO `YYYY-MM-DD`, structurally preventing the IST/UTC off-by-one bug (`"15 Sept shows Holiday"`, documented in `src/utils/calendarKey.ts`).
3. **Tiny cost**: Installed `@internationalized/date` `dist/index.mjs` is only **9.09 KB raw / 2.43 KB gzip**.

### Unnecessary Conversions & Duplication Found Today
1. **7 duplicate `wire string → CalendarDate` helpers**:
   - `src/ds/patterns/period-navigator.tsx:13` (`toCalendarDate`)
   - `src/app/pages/employee/reimbursement/components/ReimbursementFormDialog.tsx:83` (`toCalendarDate`)
   - `src/app/pages/employee/reimbursement/components/payment/RecordPaymentModal.tsx:70` (`toCalendarDate`)
   - `src/app/pages/company/organization/OrganizationProfileForm.tsx:91` (`toCalendarDate`)
   - `src/app/pages/employee/entity/detail/ProjectStatusControl.tsx:13` (`asCalendarDate`)
   - `src/utils/fiscalYearRange.ts:66` (`parseFiscalCalendarDate`)
   - `src/app/modules/common/inputs/DateInput.tsx:23` (`toCalendar` from `Dayjs`)
2. **`CalendarDate → ISO → Day.js → Date → Display string` round-trips**:
   - `src/app/modules/common/components/ui/FiscalYearRangeField.tsx:113-114` (`toDisplayText`) and `FiscalYearRangePopover.tsx:92` call `formatDate(day.toString())` — constructing a `dayjs` object (and internal `Date`) just to replace `"-"` with `"."` on a `CalendarDate`.
3. **`wire → JS Date → ISO → JS Date → ISO → CalendarDate` double round-trip**:
   - `src/utils/fiscalYearRange.ts:231-238` (`fiscalRangeFromString`): calls `toCanonicalFiscalYearRange(value)` (which calls `splitFiscalYearRange` → `parseFiscalDateString` (`new Date`) → `toISODateString`), then calls `splitFiscalYearRange` **a second time** (`new Date` → `toISODateString` again), and only then calls `parseFiscalCalendarDate`.
4. **`CalendarDate → ISO → Day.js` comparison**:
   - `src/app/modules/common/inputs/DateInput.tsx:52-53` converts `CalendarDate` → `.toString()` → `dayjs(...)` just to check `isSame(storedDay, 'day')`, and line 66 converts `maxValue` (`CalendarDate`) → `.toString()` → `dayjs(...)` → `.format("DD/MM/YYYY")`.

### Recommended Boundary Architecture
- **Inside `src/ds/ui` & React Aria pickers**: exclusively `CalendarDate` (and `Time` for `TimeField`).
- **Across component props, Formik/RHF state, Redux, React Query, and API**: plain wire strings — `YYYY-MM-DD` (date-only) or ISO-8601 UTC `...Z` (instants). **Never JS `Date` for calendar days.**
- **One shared bridge (`src/utils/calendarDate.ts`)**:
  - `toCalendarDate(wire?: string | null): CalendarDate | null`
  - `fromCalendarDate(date?: CalendarDate | null): string` (`date ? date.toString() : ""`)
  - `formatCalendarDate(date?: CalendarDate | null, fallback = "—"): string` (direct `YYYY.MM.DD` string formatting from `.year`/`.month`/`.day` — zero `dayjs` or `Date` allocation)
  - `todayCalendarDate(): CalendarDate`

---

## 6. Date Handling Problems and Risks (Evidence-Backed)

### A. Timezone Safety Risks

| Severity | File Path(s) | Exact Pattern & Impact |
|---|---|---|
| **High** | **24 frontend sites**, incl. `src/app/pages/employee/leads/lead/LeadWizardModal.tsx` (lines 670, 911–914, 969, 973, 1050–1051, 1155–1158, 2497, 3025), `src/app/pages/employee/courtesy-desk/components/DriveCreate.tsx:120,137`, `src/app/pages/employee/leads/lead/components/ConvertToClientProject.tsx:28`, `src/modules/payroll/components/modals/PaymentModal.tsx:340`, `src/app/pages/employee/attendance/admin/views/overview/DailyAttendance.tsx:165` | `new Date().toISOString().split('T')[0]` / `.slice(0, 10)`. In IST (`UTC+05:30`), between **00:00 and 05:29 AM local time**, this returns **yesterday's date** — defaulting new leads, drives, and payments to the wrong day. |
| **High** | `wisetech-frontend/src/utils/attendanceValidation.ts:61` | `publicHolidaysMap.set(dayjs(holiday.date).format('YYYY-MM-DD'), holiday)` reads UTC-midnight holiday dates in the browser's local timezone. For any viewer west of UTC, every public holiday shifts back 1 day. |
| **High** | `wisetech-backend/src/utils/dateHelpers.ts:227,346,402,594-605,652-665` | Mixes UTC-stored holiday dates with local `dayjs(holiday.date)` (lines 227, 346, 402), and builds month bounds via `new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1))` (lines 604–605) and `new Date(d.getFullYear(), d.getMonth(), 1)` (lines 652–665) — reading local-TZ year/month off a UTC-parsed `new Date('YYYY-MM-DD')`. Safe only when server/dev machine runs in UTC or positive offset; breaks in any negative-offset environment. |
| **Medium** | `wisetech-frontend/src/utils/date.ts:208-211` (`formatNotificationDate`) | Hardcodes `.tz("Asia/Kolkata")` on the notification timestamp, then compares `date.isSame(dayjs(), 'day')` against browser-local `dayjs()` — mismatches near midnight for non-IST viewers. |
| **Medium** | `wisetech-backend/src/services/payroll/payrollEmailService.ts:854-855` | `dayjs(p.paidAt).format('DD MMM YYYY')` formats `paidAt` in server UTC rather than branch timezone — an IST payment recorded between 00:00–05:29 IST prints the previous day on the contract bill email. |
| **Medium** | `wisetech-backend/src/utils/date.ts:27-35` (`getTotalDaysBetweenGivenDate`) | Mutates `current.setDate(current.getDate() + 1)` in server-local time (the exact DST-unsafe pattern warned against in `istDate.ts:168`). |

### B. Date Correctness Risks

| Severity | File Path(s) | Exact Pattern & Impact |
|---|---|---|
| **Critical** | `wisetech-frontend/src/app/pages/employee/timesheet/mytimesheet/component/MyTimeSheetToggle.tsx:50,271`, `.../employeetimesheet/component/MyEmployeeTimeSheetToggle.tsx:48,269`, `src/app/pages/employee/tasks/taskOverView/TaskOverviewToggle.tsx:53,56,151,239,243` | **Live Tuesday-to-Monday week bug**: `configureWeekStart()` (`src/main.tsx:14`) mutates `dayjs`'s `'en'` locale to `weekStart: 1` (Monday). These 3 screens still execute `today.startOf("week").add(1, "day")` (comment literally says `// week should be start from monday to sunday`), shifting their weekly windows to **Tuesday–Monday**. |
| **Critical** | `wisetech-backend/src/handlers/employees.ts:11548`, `wisetech-backend/src/utils/salaryCalculations.ts:587`, `wisetech-backend/src/services/payroll/payrollEmailService.ts:858-859` | **`customParseFormat` is NEVER imported anywhere in `wisetech-backend`**. At `employees.ts:11548`, `dayjs(date, "YYYY-MM-DD", true).isValid()` silently ignores `"YYYY-MM-DD"` and strict mode `true`, letting malformed strings like `"2026"` or `"2026-04-01T12:00:00Z"` pass API validation. At `payrollEmailService.ts:858`, `dayjs(a.paidAt, 'DD MMM YYYY')` falls back to native `Date` and uses `isBefore ? -1 : 1` (non-transitive for equal dates). |
| **High** | **58 frontend call sites** missing `customParseFormat` (e.g. `PublicHolidayListTwo.tsx:354,410-417`, `src/utils/file.ts:152-164`, `DashboardDailyAttendanceOverview.tsx:387-808`, `OpenAttendanceRequests.tsx:51,344,386`, `Overview.tsx:426-1156`, `OverviewView.tsx:192`) | Rely on accidental global side-effect registration of `customParseFormat` from whichever unrelated file imported `utils/date.ts` first. Calling `dayjs('15-08-2026', 'DD-MM-YYYY')` in isolation returns `Invalid Date`. |
| **High** | **110 frontend call sites** & **2 backend sites** (`salaryCalculations.ts:2384,2494`) missing `isSameOrBefore`/`isSameOrAfter`; `src/utils/statistics.ts:2218` missing `isBetween`; backend `LeaveBalanceRepository.ts:215` & `handlers/taskTime.ts:3270-3271` missing `utc` | Runtime `TypeError: ... is not a function` if any of these modules executes in a unit test or lazy route chunk before another module calls `dayjs.extend(...)`. |
| **Medium** | `wisetech-frontend/src/utils/file.ts:125-127` (`generateFiscalYearFromGivenYear`) | Splits `fiscalYearDetails` on `'-'` assuming ISO (`YYYY-MM-DD`). If a legacy row holds `"01/04/2020 to 31/03/2021"`, `split('-').map(Number)` produces `NaN` → `Invalid Date`. |
| **Medium** | `wisetech-frontend/src/utils/fiscalYearHelper.ts:26-27` (`formatFiscalYearLabel`) | Calls `dayjs(start).year()` on raw split segments; legacy `"01/04/2026"` parses as Jan 4 (`MM/DD/YYYY`), and `calculateProRatedMonths` accepts unused parameter `today` while `diff(..., 'month') + 1` can over-count/under-count by 1 month depending on day-of-month. |
| **Medium** | `wisetech-frontend/src/utils/date.ts:138-151` (`calculateDuration`) | Computes days as `now.diff(start, 'day') % 30` (ignores 28/29/31-day months and leap years). |
| **Medium** | `wisetech-frontend/src/utils/leaves.ts:17` (`getLeaveDays`) & `src/utils/attendanceValidation.ts:105` | Date-only comparisons/diffs omit `.startOf('day')` / `'day'` granularity; timestamps with non-zero times can miscalculate inclusive days. |

### C. Architecture & Consistency Risks

| Issue | Evidence (File Paths) | Impact |
|---|---|---|
| **Display-format drift vs `YYYY.MM.DD` standard** | 60 inline `'DD/MM/YYYY'`, 49 `'DD MMM YYYY'`, 43 `'DD-MM-YYYY'`, 37 `'DD MMM, YYYY'`; 19 files using `.toLocaleDateString()`; `DateInput.tsx:9` (`"DD/MM/YYYY"`); `PlainDatePicker.tsx:24` (`"D MMM YYYY"`); `modules/audit/time.ts:13` (`'DD MMM YYYY, HH:mm'`) | Users see 6+ conflicting date formats across screens despite `DATE_FORMATS.DISPLAY = "YYYY.MM.DD"`. |
| **Duplicate / colliding utilities** | `formatDate` & `formatTime` collide between `src/utils/dateFormats.ts` and `src/utils/date.ts`; `generateDatesForMonth`/`generateDatesForMonth2` (`utils/date.ts`); 7 copies of `toCalendarDate`; 3 fiscal-year helpers (`fiscalYearRange.ts`, `fiscalYearHelper.ts`, `utils/file.ts`); `countWeekends`/`countWeekendsOld` (`backend/src/utils/dateHelpers.ts`) | Easy to import the wrong `formatDate`/`formatTime`; fixes applied to one copy miss the others. |
| **Monolithic files mixing 3–4 date engines** | `src/utils/statistics.ts` (4,079 lines — mixes `dayjs`, `Intl.DateTimeFormat`, `.toLocaleDateString('en-GB')`, `new Date().toISOString().split('T')[0]`); `WorkingMethodOptions.tsx` (2,140 lines, mid-file imports at line 1110) | High maintenance cost, violates the 600-line guideline, difficult to test. |
| **4 parallel calendar/picker engines** | React Aria (`src/ds/ui`), MUI X (`@mui/x-date-pickers`), FullCalendar (`CustomCalendar.tsx`), Flatpickr (`PublicHolidayForm`, `PublicHoliday`, `ProfileDetails`) | 4 separate week-start configs, 4 theming surfaces, and unnecessary entry-bundle weight (`flatpickr`). |

---

## 7. Bundle Size and Performance Comparison

### Measured Sizes (from installed `wisetech-frontend/node_modules`, minified on disk + Node `zlib.gzipSync`)

> Note: `dist/stats.json` was not built on disk during this read-only audit (`ANALYZE=1 pnpm run build` generates it via `rollup-plugin-visualizer` in `vite.config.ts:36-38`). The table below distinguishes **measured installed package sizes** from **estimated `date-fns` package sizes**.

| Artifact | Measurement Type | Raw (Minified) | Gzip | Notes |
|---|---|---|---|---|
| `dayjs` core (`dayjs.min.js`) | **Measured (disk)** | 7.16 KB | **3.04 KB** | Bundled in `vendor-utils` (`vite.config.ts:139`) |
| `dayjs/plugin/utc` | **Measured (disk)** | 2.26 KB | 0.97 KB | Used (8 FE / 37 BE files) |
| `dayjs/plugin/timezone` | **Measured (disk)** | 2.19 KB | 1.12 KB | Used (7 FE / 26 BE files) |
| `dayjs/plugin/customParseFormat` | **Measured (disk)** | 3.88 KB | 1.85 KB | Used (6 FE imports; needed by 58+ sites) |
| `dayjs/plugin/duration` | **Measured (disk)** | 4.82 KB | 1.70 KB | **4 of 6 FE importers never call it** |
| `dayjs/plugin/localeData` | **Measured (disk)** | 2.08 KB | 0.71 KB | Only `configureWeekStart.ts` (for MUI X) |
| `dayjs/plugin/relativeTime` | **Measured (disk)** | 1.42 KB | 0.74 KB | Only `modules/audit/time.ts` |
| `dayjs/plugin/updateLocale` | **Measured (disk)** | 0.70 KB | 0.39 KB | Only `configureWeekStart.ts` |
| `dayjs/plugin/isBetween` | **Measured (disk)** | 0.55 KB | 0.29 KB | Used in 3 files |
| `dayjs/plugin/isSameOrBefore` + `isSameOrAfter` | **Measured (disk)** | 0.72 KB | 0.44 KB | Used in 110+ sites |
| **Total Day.js core + all 10 plugins** | **Measured (disk)** | **25.79 KB** | **11.26 KB** | Full current frontend footprint |
| `@internationalized/date` (`dist/index.mjs`) | **Measured (disk)** | **9.09 KB** | **2.43 KB** | Required by React Aria regardless of Day.js vs `date-fns` |
| `@mui/x-date-pickers/AdapterDayjs` | **Measured (disk)** | 18.56 KB | 4.78 KB | Bundled in `vendor-mui` until MUI X retires |
| `flatpickr` (`flatpickr.min.js`) | **Measured (disk)** | **50.68 KB** | **14.54 KB** | **Eagerly loaded in `src/main.tsx` via `configureWeekStart.ts` despite only 3 legacy consumers** |
| `date-fns` v4 (~20 equivalent functions) + `@date-fns/tz` | **Estimated (package-level, not installed)** | ~45–65 KB | **~15–22 KB** | Tree-shakable per function, but `format` + `parse` + `@date-fns/tz` exceed Day.js core + plugins |

### Key Bundle & Performance Takeaways
1. **Switching Day.js → `date-fns` will not shrink WiseTech's production bundle.** Day.js + all 10 plugins is **11.26 KB gzip** inside `vendor-utils` (alongside `axios`, `lodash`, and `jszip`). Replacing it with `date-fns` + `@date-fns/tz` for WiseTech's real operation set would yield **~0 KB savings or a slight increase (+4–10 KB gzip)**, and any phased transition would ship **both** libraries simultaneously.
2. **The real immediate entry-bundle win is `flatpickr` (`14.54 KB` gzip)**, which `src/main.tsx` eagerly pulls into the entry chunk just to set `firstDayOfWeek = 1` for 3 legacy screens (`PublicHolidayForm`, `PublicHoliday`, `ProfileDetails`).
3. **Runtime performance**: No evidence supports a meaningful runtime performance gain from `date-fns` over Day.js in WiseTech. Hot table sorts (`dateSort.ts`) already memoize parsed timestamps in a `Map` (`timeCache`), and `CalendarDate` already handles calendar grid rendering cleanly.

---

## 8. Migration Complexity & Risk Assessment

### Option A — Keep Day.js (As-Is + Cleanup)
- Retains Day.js everywhere and fixes scattered plugins/bugs, but if Day.js is treated as the sole model it leaves the `CalendarDate` ↔ `dayjs` ↔ `Date` boundary undefined, allowing duplicate `toCalendarDate` helpers and round-trips to grow as `src/ds/ui` expands.

### Option B — Migrate to `date-fns` (v4 + `@date-fns/tz`)
- **Files affected**: **338 source files** (**284** in `wisetech-frontend`, **54** in `wisetech-backend`), plus **17** `@mui/x-date-pickers` files (`AdapterDayjs` → `AdapterDateFns`) and unit/integration test suites.
- **Format-token migration risk (CRITICAL)**: **~950+ format strings** (`YYYY`→`yyyy`, `DD`→`dd`, `D`→`d`, `A`→`a`, `dddd`→`EEEE`, `[FY]`→`'FY'`). Because `YYYY` and `DD` are valid TR35 tokens with different semantics (week-numbering year & day-of-year), missed conversions silently corrupt dates or throw `RangeError`.
- **Timezone migration risk (HIGH)**: Rewriting 26 backend payroll/attendance/cron files from `dayjs.utc(x).tz(zone)` to `@date-fns/tz` `TZDate` exposes payroll, late marks, sandwich leave rules, and cron triggers to high regression risk for zero user-facing value.
- **Effort & Risk**: **Very High effort (3–5+ weeks across FE + BE)**, **High regression risk**, **No bundle or capability payoff**, and conflicts with `.cursor/rules/date-picker-system.mdc`.

### Option C — Specialized Hybrid Architecture (Centralized Day.js + `@internationalized/date` + Thin Boundary Layer)
- Clear separation of concerns:
  1. **`@internationalized/date`** (`2.43 KB` gzip): Sole owner of calendar UI & pure date-only picker state (`src/ds/ui/*`, `FiscalYearRangeField`, `PeriodNavigator`).
  2. **Centralized `dayjs`** (`11.26 KB` gzip, dropping toward `~8.8 KB` gzip after dead-plugin cleanup): Sole owner of application formatting (`dateFormats.ts`), dynamic 12/24h time display (`timeFormat.ts`), IANA timezone conversions (FE + BE), durations/diffs, table sorting (`dateSort.ts`), and legacy MUI X `AdapterDayjs`.
  3. **Thin Conversion & Bootstrap Layer**: `src/lib/dayjs.ts` (FE + BE) and `src/utils/calendarDate.ts` (FE).
- **Effort & Risk**: **Low-to-Medium effort (phased, incremental)**, **Very Low regression risk**, directly fixes every real production bug found in §6.

---

## 9. Required Comparison Table

*Scores are out of 10, weighted strictly for **actual WiseTech requirements**.*

| Criteria | Current Day.js | `date-fns` (v4 + `@date-fns/tz`) | Actual WiseTech Importance |
|---|---|---|---|
| **Date formatting** | **8/10** — Powers `dateFormats.ts`, `timeFormat.ts`, and 950+ calls; clean Moment-style tokens; issue is inline drift, not library capability | **7/10** — Capable, but TR35 tokens (`yyyy`/`dd` vs `YYYY`/`DD`) create major drift/bug risk against existing codebase & team familiarity | **Critical** |
| **Date parsing** | **6/10 (→ 8/10 once centralized)** — Silent failure when `customParseFormat` is unextended (62 sites today); solid once registered centrally | **8/10** — Explicit `parse()` never silently ignores format, though requires a `referenceDate` and lacks lenient natural-language parsing (`1 Apr 2026`) | **High** |
| **Date manipulation** | **8/10** — Immutable fluent chaining (`startOf`/`endOf`/`add`/`subtract`) fits PeriodFilter, payroll, leave math cleanly | **8/10** — Pure functions, equally capable; slightly more verbose when chaining 3–4 operations | **High** |
| **Date comparisons** | **7/10 (→ 9/10 once centralized)** — Needs `isSameOrBefore`/`isSameOrAfter`/`isBetween` plugins (110+ unextended call sites today); great granularity (`'day'`, `'month'`) | **9/10** — Built-in `isBefore`, `isAfter`, `isSameDay`, `isWithinInterval` with zero plugin setup | **High** |
| **Date ranges** | **7/10** — Requires small loops (already wrapped in backend `eachDateBetween` and `periodRange.ts`) | **9/10** — Built-in `eachDayOfInterval`, `eachMonthOfInterval`, `areIntervalsOverlapping` | **High** |
| **Fiscal-year operations** | **7/10** — Works, though date-only FY ranges are better served by `CalendarDate` (already done in `fiscalYearRange.ts`) | **6/10** — No built-in FY support; JS `Date` brings local-TZ hazards that `CalendarDate` avoids | **Medium–High** |
| **Timezone handling** | **8/10** — `dayjs.utc(x).tz(branchTz)` is proven across 26 backend files & 7 frontend files with full IANA DST support | **6/10** — Requires extra `@date-fns/tz` (`TZDate`) package and careful propagation so plain `Date` never drops the zone | **Critical (Backend) / Medium (FE)** |
| **Localization** | **8/10** — Zero locale bundles needed (`YYYY.MM.DD` + English); global `updateLocale` is a footgun (caused the Tuesday-week bug) | **9/10** — Modular locales & pure `weekStartsOn: 1` option without global mutation; multi-locale itself is unused in WiseTech | **Low** (English-only; Monday-first is the real need) |
| **TypeScript** | **7/10** — Good types, but plugin prototype augmentation is global (TS won't warn if a file calls `.isSameOrBefore()` without importing the plugin) | **10/10** — Best-in-class native TS; impossible to call an unimported helper | **High** |
| **Bundle size** | **9/10** — **11.26 KB gzip** measured (core + all 10 plugins); drops to ~8.8 KB gzip after dead-plugin cleanup | **7/10** — Estimated **~15–22 KB gzip** for WiseTech's real operation set + `@date-fns/tz`; worse during dual-lib migration | **Medium** |
| **Tree-shaking** | **7/10** — Core is monolithic (3.04 KB gzip); plugins are opt-in per import | **10/10** — Per-function ESM tree-shaking | **Low–Medium** (3 KB core is negligible) |
| **Maintainability** | **5/10 today → 9/10 with Hybrid cleanup** — Scattered `dayjs.extend()` and duplicate utils hurt maintainability; centralizing fixes this cleanly | **8/10** — Maintainable post-migration, but severe multi-month inconsistency while both libraries coexist | **Critical** |
| **Developer experience** | **9/10** — Familiar to entire WiseTech team across FE & BE; matches MUI X `AdapterDayjs` | **7/10** — Clean functional API, but TR35 token traps + `TZDate` + learning curve across 338 files | **High** |
| **Migration complexity** | **10/10** — Zero library swap; incremental, localized cleanup & bug fixes | **2/10** — 338 files, ~950 format strings, 26 backend TZ/payroll/cron files, 17 MUI X adapters | **Critical** |

---

## 10. Deliverable E — Final Recommendation

**Choose Option 3: Specialized Hybrid Architecture**

1. **Calendar & Date-Only UI Layer (`@internationalized/date`)**: Owns `src/ds/ui/calendar.tsx`, `date-picker.tsx`, `date-field.tsx`, `FiscalYearRangeField`, `PeriodNavigator`, and future kit DatePicker consumers. Pure `CalendarDate` with zero timezone or JS `Date` day shifts.
2. **Application Date / DateTime / Timezone Layer (Centralized `dayjs`)**: Single bootstrap/export module (`src/lib/dayjs.ts` in both FE and BE) registering approved plugins once; single display formatting SSOT (`src/utils/dateFormats.ts` + `src/utils/timeFormat.ts`); single backend timezone/business-day SSOT (`src/utils/istDate.ts` + `src/utils/queryDateRange.ts`).
3. **Explicit Wire & Bridge Layer (`src/utils/calendarDate.ts`)**: Wire contract stays `YYYY-MM-DD` (date-only) and ISO-8601 UTC (`...Z`) for timestamps. Single canonical `toCalendarDate`, `fromCalendarDate`, `formatCalendarDate` (`YYYY.MM.DD` directly from `CalendarDate`, zero `dayjs`/`Date` allocation), and `todayCalendarDate`.

---

## 11. Deliverable F — Phased Cleanup & Standardization Plan

> Honors `.cursor/rules/date-picker-standing-scope.mdc` — no consumer migrations of `WtDateField`, `PlainDatePicker`, `PeriodFilter`, or Organization Phase 3 unless explicitly approved.

### Phase 1 — Critical Bug Fixes & Centralized Day.js Bootstrap
1. **Create centralized Day.js modules** registering `utc`, `timezone`, `customParseFormat`, `isSameOrBefore`, `isSameOrAfter`, `isBetween`, and `isoWeek` once (keeping `relativeTime` / `updateLocale` / `localeData` cleanly scoped):
   - Frontend: `src/lib/dayjs.ts` (imported at top of `src/main.tsx` before `configureWeekStart()`).
   - Backend: `src/lib/dayjs.ts` (imported at top of `index.ts` / `src/server.ts`, immediately fixing `employees.ts:11548`, `salaryCalculations.ts:587`, and `payrollEmailService.ts:858`).
2. **Fix the 3 live Tuesday-to-Monday week bugs**:
   - `src/app/pages/employee/timesheet/mytimesheet/component/MyTimeSheetToggle.tsx` (lines 50, 271)
   - `src/app/pages/employee/timesheet/employeetimesheet/component/MyEmployeeTimeSheetToggle.tsx` (lines 48, 269)
   - `src/app/pages/employee/tasks/taskOverView/TaskOverviewToggle.tsx` (lines 53, 56, 151, 239, 243)
   - Replace `startOf("week").add(1, "day")` / `endOf("week").add(1, "day")` with explicit `startOf("isoWeek")` / `endOf("isoWeek")`.
3. **Fix IST/UTC off-by-one bugs**:
   - Frontend: replace `new Date(...).toISOString().split('T')[0]` / `.slice(0, 10)` across the 24 sites (`LeadWizardModal.tsx`, `DriveCreate.tsx`, `ConvertToClientProject.tsx`, `PaymentModal.tsx`, `DailyAttendance.tsx`, `balanceProgressUtils.ts`, `statistics.ts`) with `toWireDate(dayjs())` / `toCalendarKey(...)`.
   - Frontend: fix `src/utils/attendanceValidation.ts:61` (`toCalendarKey(holiday.date)`), line 105 (`'day'` granularity), and `src/utils/date.ts:208-211` (`date.isSame(dayjs().tz('Asia/Kolkata'), 'day')`).
   - Backend: fix `src/utils/dateHelpers.ts:227,346,402` (`toDateKey()`), lines 594–605 & 652–665 (`getUTCFullYear()`/`getUTCMonth()` or `dayjs.utc()`), `src/utils/date.ts:27` (replace `setDate` loop), and `src/services/payroll/payrollEmailService.ts:854-860` (branch-TZ formatting & raw instant sort).

### Phase 2 — Consolidate `@internationalized/date` Boundary & Fiscal Year Utilities
1. **Create `src/utils/calendarDate.ts`** (`toCalendarDate`, `fromCalendarDate`, `formatCalendarDate`, `todayCalendarDate`).
2. **Deduplicate the 7 `toCalendarDate` helpers**: `period-navigator.tsx`, `ReimbursementFormDialog.tsx`, `RecordPaymentModal.tsx`, `OrganizationProfileForm.tsx`, `ProjectStatusControl.tsx`, `DateInput.tsx`, and `fiscalYearRange.ts`.
3. **Eliminate unnecessary round-trips**:
   - `FiscalYearRangeField.tsx:113` & `FiscalYearRangePopover.tsx:92`: use `formatCalendarDate(day)` instead of `formatDate(day.toString())`.
   - `src/utils/fiscalYearRange.ts:231-238` (`fiscalRangeFromString`): parse canonical wire directly to `CalendarDate` without double `splitFiscalYearRange` + `new Date` hops.
   - `src/utils/file.ts:125` (`generateFiscalYearFromGivenYear`): delegate legacy/ISO parsing to `splitFiscalYearRange` so legacy `DD/MM/YYYY` rows never produce `Invalid Date`.

### Phase 3 — Utility Consolidation, Plugin Hygiene & Display Format Burn-Down
1. **Remove 27 unused `dayjs.extend(...)` calls** and duplicate extends (`utils/statistics.ts:3990`, `backend/handlers/employees.ts:408`, `utils/date.ts`, `utils/calculateTotalDuration.ts`, `utils/file.ts`, `utils/leaves.ts`, etc.).
2. **Resolve colliding exports in `src/utils/date.ts`**:
   - Deprecate/rename `utils/date.ts`'s `formatDate` (`formatOrdinalDate`), `formatTime` (`formatTimeWithSeconds`), and delete duplicate `generateDatesForMonth2`.
   - Fix `calculateDuration` (`% 30` bug) and move pure helpers out of `utils/date.ts` so they don't pull in `@redux/store`.
3. **Standardize display formats**:
   - Fix `DateInput.tsx:9` (`"DD/MM/YYYY"` → `DATE_FORMATS.DISPLAY`) and `modules/audit/time.ts:13` (route through `formatDateTime`).
   - Incrementally burn down the 19 `.toLocaleDateString()` files and ~200 inline legacy `.format(...)` calls toward `dateFormats.ts`.
4. **Optional Entry-Bundle Win (requires explicit approval)**:
   - Decouple `flatpickr` (`14.54 KB` gzip) from `src/main.tsx` (`configureWeekStart.ts`) into `src/app/modules/common/inputs/Flatpickr.tsx` so it only loads on the 3 legacy screens that use it.
5. **Prevent Regressions via ESLint**:
   - Add a ratcheted ESLint `no-restricted-imports` rule steering new code to `@/lib/dayjs` instead of raw `dayjs` + ad-hoc `dayjs.extend()`, and banning `new Date().toISOString().split('T')[0]`.

### Compatibility, Testing & Rollback Strategy
- **Wire & API compatibility**: 100% preserved (`YYYY-MM-DD` date-only, ISO-8601 UTC instants, `"YYYY-MM-DD to YYYY-MM-DD"` fiscal year strings).
- **Testing strategy**:
  - Unit tests for `src/lib/dayjs.ts`, `src/utils/calendarDate.ts`, `MyTimeSheetToggle` / `TaskOverviewToggle` week boundaries (Sunday & Monday edge cases), `attendanceValidation.ts` under negative UTC offset (`TZ=America/New_York`), and backend `employees.ts:11548` strict date validation + `dateHelpers.ts` under `TZ=America/New_York`.
  - Run `pnpm exec tsc --noEmit`, `pnpm test` (Vitest unit suite), `pnpm run test:unit` (backend), and `ANALYZE=1 pnpm run build` before/after Phase 3 to verify bundle impact.
- **Rollback**: Each phase is additive or surgical per file with zero dependency or lockfile changes, allowing clean single-commit `git revert` per phase with no schema, wire, or dependency fallout.

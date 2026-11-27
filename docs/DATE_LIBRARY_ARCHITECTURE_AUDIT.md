# Dates in the frontend: what we found and what we should use

*Audit: 2026-11-26. Checked again and updated: 2026-11-27.*

## In one line

We already use one date library (dayjs) almost everywhere, which is good. But it is set up in a fragile way, and a few screens show wrong dates because of it. I recommend moving to **date-fns**.

## What we have today

- **dayjs** is used in about 285 files. It is the main date library.
- **`@internationalized/date`** is used only inside our new date picker. We keep it there.
- Older screens still use MUI date pickers and Flatpickr. FullCalendar is used for the calendar page.
- date-fns, Moment, and Luxon are not used.

## What we found

**1. dayjs needs "plugins", and about 33 files each turn them on by themselves.**
If a file forgets, nothing crashes. The date just quietly comes out wrong. For example, `dayjs('15-08-2026', 'DD-MM-YYYY')` gives *Invalid Date* if the parsing plugin was never loaded. Many screens only work today because another file happened to load the plugin first.

**2. Three screens show the week as Tuesday to Monday.**
The app says weeks start on Monday, but these screens add one extra day on top of that:
- `MyTimeSheetToggle.tsx`
- `MyEmployeeTimeSheetToggle.tsx`
- `TaskOverviewToggle.tsx`

**3. "Today" can be yesterday.**
About 20 places in 16 files get today's date with `new Date().toISOString().slice(0, 10)`. Between 12:00 AM and 5:30 AM India time, that gives *yesterday's* date. It affects new leads, drives, and payments (`ConvertToClientProject.tsx`, `DriveCreate.tsx`, `PaymentModal.tsx`, `balanceProgressUtils.ts`, `statistics.ts`, and others).

**4. The same helper exists twice.**
`formatDate` and `formatTime` exist in both `utils/dateFormats.ts` and `utils/date.ts`, and they do different things. It is easy to import the wrong one.

**5. Dates look different on different screens.**
Our company standard is `2026.11.27`, but many screens still show `DD/MM/YYYY`, `DD-MM-YYYY`, or `DD MMM YYYY`.

**6. Four calendar tools live side by side.**
Our new picker, MUI pickers, FullCalendar, and Flatpickr. Each has its own week-start setting. Flatpickr is also loaded at startup, even though only three old screens use it.

## What I recommend: date-fns

**Why, in plain words:**

- **Nothing to forget.** Each function is imported where it is used. There are no plugins to turn on, so the bug in finding 1 cannot happen.
- **Nothing shared.** The week start is given each time you ask for a week (`weekStartsOn: 1`). Nobody can change it for the whole app, so the bug in finding 2 cannot happen.
- **Mistakes show up early.** It is fully typed. Using something you didn't import fails when you build, not when a user clicks.
- **Small.** You only bundle the functions you use.
- **Works everywhere.** It runs in every browser and every Node version we use. The newer alternative (Temporal) does not work in Safari without extra code.

## What it will cost (so we go in with eyes open)

- **The format letters change.** `YYYY` becomes `yyyy`, `DD` becomes `dd`, `A` becomes `a`. If we get one wrong, it does not fail. It just prints the wrong thing (`YYYY` means something else in date-fns). We need an automated change plus a lint rule. There are about 950 format strings across both repos.
- **Timezones need one extra package** (`@date-fns/tz`).
- **It still works on plain JavaScript dates.** There is no "date without a time" type, so we keep sending days as `YYYY-MM-DD` text.
- **It is a big move.** About 285 files, plus the 17 files that use MUI date pickers.
- **It is not smaller.** The audit estimated about the same size as dayjs, or a little larger. We should measure before promising any saving.

## How we will use it

- A day is sent and saved as `YYYY-MM-DD`, and shown as `2026.11.27`.
- 12-hour or 24-hour is only about how time looks on screen. It never changes what we save or send.
- Timezone comes from the branch. If there is none, use `Asia/Kolkata`.
- Weeks start on Monday.
- Inside our date picker, convert between `CalendarDate` and `YYYY-MM-DD` and nowhere else.
- New code does not use dayjs, `new Date("text")`, or `toISOString().slice(0, 10)`.

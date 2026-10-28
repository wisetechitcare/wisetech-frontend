# Future enhancements register

One place for improvements found while doing other work, so nobody rediscovers them. The UI/UX
migration keeps app behaviour as it is; anything that would change behaviour, data or the backend is
written here instead of being done in passing. Add an entry when you find something; remove it when
it ships (link the PR). Security findings do not go here.

Format: **what** — evidence (file / screen) — suggested fix.

## Backend

- **Dashboard chart endpoint returns HTTP 500** — `/dashboard` console: "Error fetching chart data"
  (seen 2026-10-27/28 on the local stack). — Find the endpoint from the network tab; fix the handler.
- **Birthdays are computed in the browser from every user** — `BirthdayConfetti` fetches `GET api/users`
  on every page load and filters by date client-side. — A `GET api/users/birthdays?date=` endpoint
  (tenant-scoped) returning only today's people.

## Frontend: request fan-out (do with the backend work)

- **`GET api/company/overview` runs 5 times per page load**, not deduped — ColorModeProvider, useHomeBrand,
  HeaderWrapper, useNavigation, HeaderToolbar. — One React Query key shared by all five.
- **`GET api/employee?employeeId=` twice per load** (AsideMenuMain, HeaderToolbar), result unused.
- **Notifications refetch on every route change** (NotificationsBell) although the socket pushes
  `newNotification`. — Fetch once, update from the socket.
- **The routed tree remounts** when time format or currency resolves after first render (App keys the
  Outlet on `${timeFormat}:${currency}`), re-firing every shell request. — Resolve both before mounting.

## Frontend: bugs found in passing

- **KPI page mounts the `KpiStatistics` table twice** sharing one preferences bucket, so they overwrite
  each other's columns and sorting (`[useTablePreferences]` console error on `/employee/report/kpis`).
- **My Profile `Overview` list is missing `key`s** (React warning on `/employee/profile/overview`).

- **Two load-sensitive unit tests** — `DepartmentDesignationFields` ("a configured department offers only its
  designations") and `InterviewsPanel` ("a booked interview can be opened for edit") pass alone but time out in the
  full parallel run on a busy machine: both wait with the default 1s `waitFor` / `findBy*`. — Give those waits an
  explicit timeout, or mock the slow fetch they wait on.

## Design system (ADR-001)

- **One calendar for the whole app** — today: MUI X pickers (`WtDateField`, 20 files), `FiscalYearRangeField`,
  Apply Leave's `LeaveCalendar`, FullCalendar, flatpickr, plus the v2 kit Calendar. Decided 2026-10-28:
  the **v2 kit Calendar (React Aria)** is the single engine; month + year jump by **clicking the title**
  (month grid → year grid); continuous range band and brand tokens (already in the kit); time entry by
  **typing + quick slots, with an optional clock dial**; the fiscal picker's Start/End header, keyboard
  toggle and Apr–Mar preset become a kit `FiscalYearRangePicker`; Apply Leave's day markers (holidays,
  off-days, sandwich preview, booked, tooltips, legend) become a generic day-decorations API while the
  leave rules stay in Apply Leave. Rollout: after Phase 1b, swap the insides of `WtDateField`,
  `WtDateTimeField`, `FiscalYearRangeField` and `LeaveCalendar` behind their existing props, one at a
  time, each checked with `pnpm visual:check`; Apply Leave last.
- **Two Motion versions in the bundle** — the app's `framer-motion` 12 (43 files) and `motion` 14 (brought by
  Animate UI, adopted 2026-10-28). — Move the 43 files to `motion/react` 14 and drop `framer-motion`.
- **Animate UI is young** (package created 2026-10-18; MIT + Commons Clause) — re-check accessibility of the
  wrapped primitives on every upgrade (Storybook a11y runs at error level); keep it pinned.
- **One field family** — `WtField` (162), raw MUI `TextField` (76 files), Bootstrap `form-control`
  (87 files), raw MUI `Checkbox` (11 files): move behind the kit Field/Input/Checkbox with the same API.
- **Buttons not yet on the kit (Phase 3b)** — WtButton renders the kit Button since 2026-10-28; the tw twin
  (`ui/tw/Buttons.tsx`, e.g. "New Gift Run", "New People Group"), raw MUI `Button` and Bootstrap `.btn`
  still draw their own. — Point each at the kit Button the same way (adapter, API unchanged).
- **WtButton call sites that restyle the button through `sx`** — Approvals `InboxItem.tsx` (approve/reject:
  own border, 8px corners, 11px text), `CsvUploadStep` / `MatchReviewTable` (danger text colour),
  `AddAnotherBtn` (dashed). They win over the kit by design, so they are not pills. — Replace each with a
  kit variant (`outline` / `destructive`, or a new tinted variant if approve/reject needs one) and drop the sx.

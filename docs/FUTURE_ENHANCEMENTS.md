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
- **Retire `src/_metronic` (ADR-001 Phase 5)** — the Metronic template: theme SCSS (loaded in `main.tsx`), app shell
  (header, aside, toolbar, MasterLayout), helpers (`KTIcon`, `toAbsoluteUrl`), i18n and demo widgets/modals. 404 app files
  import it (342 from `helpers`); 168 of its 199 code files are reachable from `main.tsx`, ~31 are not (more demo partials
  are reachable only through barrel re-exports). — Delete it in pieces as the kit replaces each part: first the
  unreachable files (list them for sign-off), then demo partials once barrels are trimmed, then the shell, icons and SCSS.
- **WtIconButton `size={34}` call sites now render at 34px** (`LeavesAndBlance.tsx`, `Leaves.tsx`) — the prop was
  silently ignored before (they rendered 44px). Check those rows still align; drop the prop if 44px was intended.
- **Two Motion versions in the bundle** — the app's `framer-motion` 12 (43 files) and `motion` 14 (brought by
  Animate UI, adopted 2026-10-28). — Move the 43 files to `motion/react` 14 and drop `framer-motion`.
- **Animate UI is young** (package created 2026-10-18; MIT + Commons Clause) — re-check accessibility of the
  wrapped primitives on every upgrade (Storybook a11y runs at error level); keep it pinned.
- **One field family** — `WtField` (162), raw MUI `TextField` (76 files), Bootstrap `form-control`
  (87 files), raw MUI `Checkbox` (11 files): move behind the kit Field/Input/Checkbox with the same API.
- **Documented non-button controls onto kit primitives** — the button migration (2026-10-29, 0 legacy buttons left)
  marked 199 controls with `data-wt-control` (docs/BUTTONS.md): tabs, segmented controls, toggles, option cards,
  swatches, calendar cells, accordions, menu items, rows. They keep their old look. — Move each family onto a kit
  primitive when it exists: `tab`/`segmented` → kit Tabs / a ToggleGroup, `accordion` → an Accordion, `menuitem` →
  DropdownMenu, `row`/`option` → kit `Item` rendered as a button. Run `pnpm audit:buttons` for the list by kind.
- **Dead CSS left by the button migration** — class rules for buttons that now render the kit: `.wt-btn*`
  (`crmWizardTheme.css`, `forms/shared/Workspace.css`), `.report-ghost-btn` / `.primary-go-btn` / `.mf-btn-*`
  (company overview Map), `.ob-photo-action-btn`, `.ob-file-upload-view/-clear`, `.wt-card__actbtn`, `.wt-iconbtn`
  (notifications), `.wt-textbtn`. — Delete each rule once a grep shows no element still carries the class.
- **Header user name is dark-on-dark in dark mode** — the avatar pill in the top bar (`HeaderEmployee`) renders the
  name in a dark ink on the dark header (also in the pre-migration baseline). — Give it the header text token.
- **KPI test panel ships in the production bundle** — `attendance/personal/views/overview/KPITestPanel.tsx` (raw
  dev buttons, marked `data-wt-control="dev"`), and `pages/MenuTestPage.tsx`. — Gate behind a dev flag or remove.
- **Buttons whose old submit default was kept as `type="submit"`** — the migration gave every native `<button>`
  that had no `type` an explicit `type="submit"` (its old default), including many outside any form, where it is
  harmless. — When a screen is next touched, set `type="button"` on those that are not form submits.
- **WtButton call sites that restyle the button through `sx`** — Approvals `InboxItem.tsx` (approve/reject:
  own border, 8px corners, 11px text), `CsvUploadStep` / `MatchReviewTable` (danger text colour),
  `AddAnotherBtn` (dashed). They win over the kit by design, so they are not pills. — Replace each with a
  kit variant (`outline` / `destructive`, or a new tinted variant if approve/reject needs one) and drop the sx.
- **Project → Billing phone layout no longer stretches the row's main action** — `ProjectBillingTree.tsx`
  (`narrow` sx on the actions Stack) targets `.MuiButtonBase-root:not(.MuiIconButton-root)`, but the row's
  `WtButton`s render the kit Button since #316, so the full-width rule matches nothing. — Target
  `[data-slot="button"]:not(.billing-row-more)` and check the result on a phone.

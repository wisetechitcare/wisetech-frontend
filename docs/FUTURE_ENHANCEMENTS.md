# Future enhancements register

One place for improvements found while doing other work, so nobody rediscovers them. The UI/UX
migration keeps app behaviour as it is; anything that would change behaviour, data or the backend is
written here instead of being done in passing. Add an entry when you find something; remove it when
it ships (link the PR). Security findings do not go here.

Format: **what** — evidence (file / screen) — suggested fix.

## Backend

- **The reimbursement form downloads whole lists on every open** — `GET .../projects/reimbursement-options`
  (up to 10,000 leads, ~1.5s in the dev log) and `GET .../client-companies?pageSize=9999` (~1.6s), now
  family-scoped but still full. (found 2026-11-09) — A typeahead search endpoint for each, plus a Redis cache
  keyed by org family and cleared on lead/company writes.

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

- **`.bg-slate-50 { … !important }` in `src/main.css`** — the `!important` beats every `dark:` override on an
  element that also carries `bg-slate-50`, so it stays light in dark mode. (found 2026-11-09) — Drop the
  `!important` (or the rule: it equals Tailwind's own slate-50) after checking its users.

- **KPI page mounts the `KpiStatistics` table twice** sharing one preferences bucket, so they overwrite
  each other's columns and sorting (`[useTablePreferences]` console error on `/employee/report/kpis`).
- **My Profile `Overview` list is missing `key`s** (React warning on `/employee/profile/overview`).

- **Two load-sensitive unit tests** — `DepartmentDesignationFields` ("a configured department offers only its
  designations") and `InterviewsPanel` ("a booked interview can be opened for edit") pass alone but time out in the
  full parallel run on a busy machine: both wait with the default 1s `waitFor` / `findBy*`. — Give those waits an
  explicit timeout, or mock the slow fetch they wait on.

## Design system (ADR-001)

- **Column reorder has no keyboard path yet** — kit `DataTable` (`src/ds/patterns/data-table.tsx`): headers move
  by pointer drag only, while rows move with ↑ / ↓ on a focused grip. Suggested: Move Left / Move Right in the
  Columns panel (`data-table-columns.tsx`), announced like the row moves.

- **Kit DataTable: sort, page size and search text are not remembered** — `stateKey` persists column
  visibility, order, pin and width only; the legacy `MaterialTable` also kept sort, rows-per-page and the search box
  between visits, so every kit table (Payment History, Payment Queue, Submissions) now opens on its defaults.
  — Persist `sorting`, `pageSize` and `globalFilter` under the same `stateKey`. (found 2026-11-13)

- **Kit DataTable: per-column / faceted filters and nested sub-rows are not built** — shadcn's examples
  (ui.shadcn.com data-table, shadcn.io "Data Table with Filters" / "Expandable Sub-Rows", shadcnstudio blocks)
  show both; the kit has a global search, `renderDetail` panels and the status rail (SegmentedFilter) instead,
  which is all the reimbursement tables use. — Add `facets` (a status/category dropdown per column) and
  `getSubRows` when the first screen needs them, not before. (found 2026-11-09)

- **`ExportButton` (14 users) still draws an MUI menu and MUI icons** — the kit DataTable now reaches it
  through `table/DataTableExport`, so the engine is shared but the button looks legacy. — Rebuild its menu on
  the kit `DropdownMenu` + lucide icons; keep the CSV/Excel engine as is. (found 2026-11-09)
- **Reimbursement: two colour maps left to fold into `STATUS_TONE`** — `PAYMENT_TONE` in
  `utils/reimbursementFormat.ts` is a hex palette (light-only) used by `PaymentQueueTable`; `BatchWorkflowPanel`
  keeps its own status map (Needs info = cyan "Query"). — Replace both with the tone tokens when the Payment
  tables and the batch panel move to the kit. (found 2026-11-09)
- **Reimbursement migration — what is still legacy** (tracking, 2026-11-09): the Submission detail modal
  (MaterialTable + `UnsavedChangesModal`, a `<style>` block, hex backgrounds), the payment history table, the
  Payment tab's queue/history tables, the admin tables (All Employee, By Project, limits), the module's
  `MaterialHeaderTab` page tabs.

- ~~**App content background stays light in dark mode**~~ **Fixed 2026-11-09 (`ae4e95ed`):** dark `.content` now uses the kit `--background` token (src/main.css). Original note — `#kt_content` (`.content`, `$content-background:
  #F6F9FC` in `_metronic/.../layout/_content.scss`) has no dark override, so it shows through wherever a page
  has no surface of its own (measured on Reimbursement → Payment and Company → Branches). Light-on-light text
  is the symptom. — Give `.content` a `[data-bs-theme="dark"]` background from the `--gh-*` palette, then re-run
  the whole visual suite: it changes every page's dark mode.
- **Kit `Tabs` "line" variant draws no underline** — `src/ds/ui/tabs.tsx` positions the active underline with
  `group-data-horizontal/tabs:*`, but the Base UI root sets `data-orientation="horizontal"`, not
  `data-horizontal`, so the `::after` is zero-sized. Reimbursement → Payment uses the default (pill) variant
  until this is fixed. — Key the variants on `data-[orientation=horizontal]`, with a story test.
- **Shared table in dark mode** — `MaterialTableImpl`'s header row and search box stay light, and numeric
  cells read dim on dark rows (visible in the reimbursement payment baselines). Due with the `DataTable` swap.

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
- **Data Table must reach MaterialTable parity before the swap** — the v2 design (Storybook Patterns/Data Table,
  2026-11-03) covers sort, search, column show/hide, selection bar, paging, density and the load/empty/error states.
  The live `MaterialTableImpl` also has per-column filters (22 screens), column pinning (6), row virtualisation (5),
  column drag (5), full screen (5), resizing (4), grouping (4), expandable rows (4), saved column preferences
  (`useTablePreferences`, all screens) and export. — Build each into the kit Data Table before any screen moves,
  so no screen silently loses one (Kit Map lists them).
- **Self-host the phone flags** — v2 Phone Field (fixed 2026-11-03: emoji flags rendered as letters on Windows)
  now uses `react-international-phone`'s `FlagImage`, like the live `WtPhoneField`; both load Twemoji SVGs from
  cdnjs. — Serve the SVGs from our own origin (pass `src` to `FlagImage`) so the field needs no third-party
  request (CSP, offline, privacy).
- **Imperative confirm API for v2** — the live `showDialog()` / `confirmDialog()` / `alertDialog()` (and the
  SweetAlert shim, 82 sites) render through `DialogServiceHost`. v2 has the `ConfirmDialog` component only. — At the
  Wave 1 swap, point `DialogServiceHost` at the v2 ConfirmDialog so the 82 imperative call sites change with no edits.
- **Configurable colours resolve through one helper in v2** — colours stay admin-configurable (decided
  2026-11-03). The live picker stores a swatch NAME (`KIT_SWATCHES`, from `TRIO`) or a hex; v2's `toneStyle()`
  resolves the same seven names plus any hex. — At each swap, read the stored value through `toneStyle()` /
  `Badge variant="custom"` instead of `TRIO` lookups, so stored colours keep rendering unchanged.
- **Charts onto Recharts** (decided 2026-11-03: one engine) — four libraries in use today (`Graphs`, ApexCharts,
  Nivo, Recharts). — Move each chart to Components/Chart when its screen is rebuilt; drop each library when its
  last chart has moved.
- **Live `StatTile` users get a bigger tile** — the v2 compact Stat Card (its replacement) now follows the benchmark:
  44px icon, 24px value, glow and lift (decided 2026-11-03). — Re-check the 11 `StatTile` screens' row density at
  the swap.
- **Project → Billing phone layout no longer stretches the row's main action** — `ProjectBillingTree.tsx`
  (`narrow` sx on the actions Stack) targets `.MuiButtonBase-root:not(.MuiIconButton-root)`, but the row's
  `WtButton`s render the kit Button since #316, so the full-width rule matches nothing. — Target
  `[data-slot="button"]:not(.billing-row-more)` and check the result on a phone.
- **Every live calendar onto the one v2 calendar engine** (decided 2026-11-03: one engine, customised through
  `getDayState` / `rangeStyle` / `size`; guarded in `src/ds/consistency.test.ts`). The live app has six calendar
  systems: MUI X date pickers (20 files, mostly via `ui/dates.tsx`, `inputs/DateInput.tsx`,
  `inputs/PlainDatePicker.tsx`, `TimePickerField.tsx`, `PeriodNavigator.tsx`), `FiscalYearRangeField` (9 users),
  Apply Leave's own `LeaveCalendar`, `inputs/Flatpickr.tsx`, native `type="date"`/`"month"` inputs (4 files) and
  FullCalendar (`CustomCalendar`, `MeetingFormBody`, `tw/MonthGrid`). — Swap the shared wrappers first (each one
  converts its screens at once), then Apply Leave (Storybook Screens/Apply Leave is the target), then the native
  inputs. FullCalendar is an event scheduler, not a date picker: keep it until a v2 scheduler is designed, but
  give it the engine's tones.
- **A generic File Field for attachments** — the kit has `ImageField` (one image) only; Apply Leave's "Attach
  Document" is a plain button in Storybook. — Build a kit `FileField` (several files, any type, preview, remove,
  type/size checks) from `ImageField`'s logic and use it in Apply Leave, documents and claims.
- **Dates read through the tenant date format** — Apply Leave (Storybook) formats dates with a fixed
  `en-GB` `DateFormatter` (marked TODO). — Route it through the per-tenant date-format setting once it is built.
- **`StatCard size="sm"` accepts `hint` and never renders it** — the one-row tile returns before the footer, so a
  caller that passes `hint` loses it with no warning (no current caller does; found while merging the v2 stat card,
  2026-11-09). — Either render it under the value in that branch or drop `hint` from the `sm` contract, so the prop
  cannot be passed into a void.
- **`MediaGallery` `UploadMedia` story asserts a photo limit that no longer exists** — it expects
  `/over the 10 MB photo limit/` against a 12 MB fixture, but `IMAGE_MAX_MB` has been 100 since the merge base
  (`38b13838` "Increased Uploading size of both Image & video"), so the warning never renders and the story has been
  red on every branch since. — Derive both the regex and the fixture size from `IMAGE_MAX_MB` so raising the limit
  cannot rot the test again.
- **DataTable row reorder is client-paged only** — `rowReorder` reorders the rows the table holds; with
  `server` paging it only sees the current page, so a keyboard move cannot cross a page boundary (2026-11-09). —
  When a server-paged list needs ordering, pass a `position` offset or a move-relative callback
  (`onMove(id, beforeId)`) so the server applies the move to the full list.
- **"Send for Approval" is all-or-nothing only for the approver check** — the backend now resolves the approval
  chain before writing (no more batch-with-no-approver), but each month's batch commits in its own transaction and
  `createApprovalInstanceForApprovers` opens its own, so a database failure between months leaves earlier months
  sent (2026-11-12). — Let the approval engine accept a Prisma transaction client, then wrap the whole send in one.

## Icon migration (Lucide)

- **Icon size normalisation, then a size lint** — converted icons keep the exact pixel size the old font class
  produced (`fs-5` → `size-[17px]`), so the app now carries a long tail of odd sizes (13, 14, 16, 17, 18, 21, 23,
  26, 29 px). — After Phase 2 converts every module, snap them onto a small scale (for example 12/14/16/20/24 px)
  in one reviewed pass, then add the D10 lint so new code can only use the scale. Sizes must stay in px, because
  the app's root font is 13px (`size-4` is 13px in the app and 16px in Storybook).
- **5 Bootstrap names on configuration cards still use the Bootstrap font** — `ConfigSectionCard` keeps a
  Bootstrap `<i>` fallback for `bi-123`, `bi-bullseye`, `bi-house-door`, `bi-table` and `bi-truck`, because the
  registry has no mapping for them. — Map them (Phase 3), then delete the fallback branch.
- **`ci-spin` is defined in one screen only** — the spinner class lives in an inline style block in
  `entity/detail/sections/AuditSection.tsx`, so `ci-spin` on an icon anywhere else does nothing. — Use Lucide's
  `animate-spin` (Tailwind) for icon spinners, and delete the local class once AuditSection is converted.
- **`NeedsYourAttention` `STYLE[].icon` is dead data** — the reimbursement attention cards declare an icon per
  style that nothing renders (found in the pilot). — Render it or delete the field.
- **Dismissal belongs in the kit `Badge`** — `Badge` has no `onRemove`, so a chip that can be dismissed
  hand-rolls the affordance (QueryConversation's attachment chips, 2026-11-13). The kit Button cannot be
  used for it: the smallest icon size is `size-6`, which is the full height of an `h-6` badge, so each
  site writes its own 16px button and marks it `data-wt-control="chip"`. — Add `onRemove` to the kit
  `Badge` (with its own story), then delete the hand-rolled buttons and their markers.
- **`pnpm run lint:ui:baseline` fails under pnpm on Windows** — the script uses a shell redirect, `rm -f` and an
  unexpanded `"src/**/*.{ts,tsx}"` glob, so it reports "No files matching" (found regenerating the baselines,
  2026-11-13). Run the same steps by hand with `eslint src --ext ts,tsx -f json`. — Port it to a Node script like
  `gen-rule-baseline.cjs`.
- **`.eslint-ui-baseline.cjs` was stale** — regenerating it dropped 121 files unrelated to Reimbursement (their
  `no-restricted-syntax` Bootstrap-class reports moved to `wisetech/no-legacy-ui`) and added 3 that grew new
  violations since the last run (`ProfileDetails`, `AppSettingsModal`, `KPISettings`). — Regenerate it in the PR
  that touches each module, and migrate those 3.
- **Pre-existing hard lint errors outside Reimbursement** — `CompanyLeadReferences.tsx` (hardcoded currency
  symbol, line 100), `leads/overview/components/Custom.tsx` (`no-unused-expressions`, line 476) and
  `constants/eventKeys.ts` (`{}` type, lines 93-97) fail `eslint --quiet src`. — Fix in their own modules.
- **`rebootShield.test.ts` guards Reimbursement only** — the Reboot override on raw `h1-h6`, `p`, `label`, `ul`,
  `ol`, `li`, `button` and `a` bites every module. Its scanner skips tags on a line that opens a template
  literal (HTML strings). — Promote the scan to a repo-wide test (or an ESLint rule) as each module is converted.

## Frontend: auth & app shell (found 2026-11-14, auth section moved to the kit)

- **Header and aside menus still carry their own sign-out** — `_metronic/partials/layout/header-menus/HeaderUserMenu.tsx`
  and `_metronic/layout/components/aside/AsideDefault.tsx` each repeat the logic now in
  `app/modules/auth/core/signOut.ts` (used by `/logout` and the idle timeout). — When the app shell moves to the
  kit (Sidebar / App shell), call `signOut(dispatch)` and delete both copies.
- **Sign-in footer links** — the old Login showed "FAQs / Plans / Contact Us", all linking to `/` (dead), so they
  were dropped. — If wanted, add them back pointing at real public pages (Auth Layout `footer` slot).
- **Links read green in dark mode** — the app's dark palette maps `--primary` to green, so `link` buttons (e.g.
  "Forgot password?") are green while the CTA stays brand blue. — Decide the dark `--primary` in the theme, not per
  screen.
- **Logout leaves some user data in the browser** — onboarding wizard drafts in `sessionStorage` (bank, CTC) and
  search history not tied to a user (audit C-08). — Clear user-scoped keys in `signOut()` once they are listed.

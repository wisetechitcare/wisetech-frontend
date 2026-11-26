# Future enhancements register

One place for improvements found while doing other work, so nobody rediscovers them. The UI/UX
migration keeps app behaviour as it is; anything that would change behaviour, data or the backend is
written here instead of being done in passing. Add an entry when you find something; remove it when
it ships (link the PR). Security findings do not go here.

Format: **what** — evidence (file / screen) — suggested fix.

## Backend

- **Prod `APP_URL` for email one-click unsubscribe** — digests/greetings already emit RFC 8058
  `List-Unsubscribe` / `List-Unsubscribe-Post`; one-click needs `APP_URL` or `API_PUBLIC_BASE_URL`
  pointing at the API so `POST /api/public/email-unsubscribe?token=…` is reachable. Until then the
  HTTPS link falls back to in-app Preferences. (deferred 2026-11-24) — Set the env in each API
  environment; smoke with a signed token from `signEmailUnsubToken`.

- **Per-tenant Slack/Teams digest webhooks** — `FeatureConfigurations` module
  `notificationIntegrations` (`slackWebhookUrl`, `teamsWebhookUrl`, `digestToSlack`,
  `digestToTeams`) is read by manager leave digest fan-out; no tenant UI yet. (deferred
  2026-11-24) — Seed JSON per org that wants chat digests, or add a Settings surface later.

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

- **`<style>{KEYFRAMES}</style>` is pasted into the DOM by 17 files** (2026-11-20) — the configuration
  animations (`cfgFadeIn`, `cfgSlideIn`, `cfgPulse`) and the `.cfg-tab-btn` focus rules ride along in a
  `<style>` block injected by every Configure page, by `ConfigPageLayout` and by `ErrorBoundary`. They are
  load-order dependent by accident: `Departments.tsx` deleted its own copy on the grounds that the layout
  already injects one, so that page's fade now depends on which component mounted first. A `<style>` block is
  banned by the UI rules, and this is 17 copies of one. — Replace `.cfg-fade-in` / `.cfg-slide-in` with a
  Tailwind animation (or `src/ds/effects`) and the focus rules with the kit's own `focus-visible`, then delete
  all 17 injections. `cfgPulse` goes last: `ConfigSettingsRow` and `ConfigStatsCards` still draw their
  skeletons with it, and both should move to the kit `Skeleton` as `ConfigSectionCard` has.

- **Billing's own files are kit-only; its dependency GRAPH is not** (2026-11-20) — every `.tsx` under
  `src/app/pages/billing` is now free of MUI, KTIcon and Metronic imports, but
  `node scripts/legacy-ui-reach.mjs src/app/pages/billing` still reports 45 files, every chain ending in a legacy
  adapter: `MaterialHeaderTab`, `ModuleOrgFilter`, `PerOrgPrefixSettings`, `ui/buttons`, `ui/checkbox`, `ui/chips`,
  `ConfigColorChip`, `DetailCard`, `EntityPageHeader`, `ui/glass`, `ui/patterns`, `SegmentedControl`,
  `WtColorPicker`, `WtField`, `ConfigPageLayout`, `ConfigSectionCard`, `MaterialTableImpl`, `ui/dates`,
  `FloatingLabel` — plus one cross-module screen, `tasks/TaskFormDialog`. Billing therefore cannot join
  `MUI_FREE_ROOTS` yet, and the last step is not an adapter at all: five billing screens sit on `MaterialTable`,
  whose swap KitMap gates until kit Data Table gains per-column filters, pinning, virtualisation, export and saved
  column preferences. — Convert the adapters (each is a KitMap row); `src/app/pages/billing` can only join
  `MUI_FREE_ROOTS` after the Data Table swap, which is last by design.

- ~~**`BillingLayout` still uses Metronic `PageTitle` and `MaterialHeaderTab`**~~ **Partial (2026-11-26):**
  tab bar → kit `PageTabs`. `PageTitle` kept as app-wide breadcrumb context (same as Reimbursement /
  Org Profile). Full Metronic breadcrumb retirement stays with the app-shell wave.

- **Tax-rate "retired" rail changed shade** (2026-11-20) — `TaxRateSections` painted its retired-row rail
  `#cbd5e1` (Tailwind slate-300), which has no token equivalent; it now takes the SSOT's `inkFaint` (`#97A1AF`),
  slightly darker. Live rails are untouched: `vivid.blue` / `vivid.amber` are character-for-character the hexes that
  had been inlined. All three stay hex STRINGS because `ConfigColorChip` feeds the value through `toneAlpha()`,
  which parses six hex digits and returns its input untouched on failure — a `var(--token)` would paint a
  fully-opaque fill instead of a 16% hover tint. — The indirection dies with the Master List move.

- ~~**Column reorder has no keyboard path yet**~~ **Done (2026-11-26):** Columns panel Move Left / Right
  (`data-table-columns.tsx`), announced on the table live region like row ↑ / ↓.

- ~~**Kit DataTable: sort, page size and search text are not remembered**~~ **Done (2026-11-26):**
  `stateKey` already writes `sorting`, `pageSize` and `globalFilter` with layout (see `SavedTableState` /
  `writeTableState` in `data-table.tsx`). Story coverage extended under RemembersWidths / remount.

- ~~**Kit DataTable: faceted filters**~~ **Done (2026-11-26):** `meta.facet` multi-select chips, active-filter
  chips + Clear all, range line names the sort, shift-click range select; `employeeColumn` defaults
  `meta.pin: "start"`, `actionsColumn` defaults `pin: "end"`.
- **Kit DataTable: nested sub-rows are not built** — expandable nested rows (`getSubRows`) are not.
  — Add `getSubRows` when the first screen needs them. (found 2026-11-09, narrowed 2026-11-26)

- ~~**`ExportButton` (14 users) still draws an MUI menu and MUI icons**~~ **Already fixed (checked 2026-11-17):**
  `ExportButton` renders the kit `DropdownMenu` + lucide icons and reaches no legacy UI
  (`node scripts/legacy-ui-reach.mjs src/app/modules/common/components/table` lists nothing for it).
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
- ~~**Shared table in dark mode**~~ **Superseded (2026-11-26):** MaterialTable removed; kit DataTable owns
  light/dark via tokens. Re-check reimbursement payment tables visually if any residual contrast issues.

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
- ~~**Data Table MaterialTable parity**~~ **Done (2026-11-26)** — Waves A–H complete;
  `MaterialTable` / `MaterialTableImpl` and `material-react-table` removed. Plan:
  `summary/plans/2026-11-26-materialtable-datatable-waves.md`.
- **`DataTableExport` kit move (done 2026-11-26)** — `src/ds/patterns/data-table-export.tsx` +
  `registerDataTableExportButton`; thin adapter under `components/table` still wires ExportButton.
- **Legacy `ui/ConfirmDialog.tsx` still draws its own GlassDialog** — used by `IdleLogoutGuard`,
  `ConfirmDiscardDialog`, `useConfirmDialog` and `usePromptDialog`, while `DialogServiceHost` (every
  `showDialog` / `errorConfirmation` call) already renders the kit Confirm Dialog. — Turn it into a thin adapter
  over `@/ds/patterns/confirm-dialog` (old prop names only), then retire it with its last caller. (found 2026-11-17)
- **Organization module → kit: what is still legacy** (tracking, 2026-11-17; phases 1–5a merged into
  `feat/multi-tenancy`, `18e3dc8a`; phase 5b moved the Biometric Devices dialog onto the kit Data Table and the
  profile page's Branches frame onto the kit Form Dialog). **2026-11-17: `FormSchemaManager` (Manage form fields)
  moved to a kit Form Dialog, which cut the last legacy chain; `pages/company/organization` and
  `FormSchemaManager` are locked in `MUI_FREE_ROOTS`.** Still legacy elsewhere:
  - `MaterialHeaderTab` should become a thin adapter over the kit `PageTabs` (affects every screen using it).
  - `PerOrgPrefixSettings` (inside the New Organization dialog) still renders MUI fields.
  - `UnsavedChangesModal` (react-bootstrap `Modal` wrapper, ~47 screens) and the legacy `ui/ConfirmDialog` (MUI)
    remain. Turning `UnsavedChangesModal` into a kit adapter re-skins all 47 at once, and several host MUI fields
    whose popups a kit (Base UI) dialog would trap — do it screen by screen, or with an explicit go-ahead.
  - `SmartLocationPicker` (Leaflet map + search) still renders MUI; its Nominatim calls now live in
    `services/geocoding.ts`, so the picker only needs its UI moved.
  - `organizationInfo/` (Rules, FAQs) still uses Metronic classes and `bi-*` icons.
  - Branding tab: Save is a `console.log` stub (decision pending: build or remove).
  - `DropdownInput` (17 users) should become an adapter over the kit `SearchSelect`.
  - Biometric Devices: deleting a device no longer fades its row to 50% while the request runs (the kit Data Table
    has no per-row opacity); the row's More button shows the spinner instead. — If the fade is wanted, add a
    `rowBusy` predicate to the Data Table (with a story) rather than styling the row in the screen.
  - ~~Organization profile edit form width~~ done 2026-11-17: `size="2xl"` + `AutoGrid stretch` field rows.
- **Stale lint rule removed (2026-11-17)** — `no-restricted-syntax` matched any `<Switch>` by tag name, so it fired
  on the kit Switch too (it predates the kit). A raw MUI Switch is still caught by its import
  (`no-restricted-imports`, `wisetech/no-legacy-ui`).
- **`officeGeofence.test.ts` fails on `feat/multi-tenancy`** — `058ac173` ("office geofence blocks when branch center
  or GPS is missing") returns `misconfigured` where the test "no radius, a 0 radius, no branch pin, or no reading"
  still expects `unconfigured`. (found 2026-11-17, not touched: another session's change) — Update the test to the
  new rule, or narrow the rule, whichever the geofence owner intended.
- **Two required markers became one (2026-11-17)** — the kit had two competing `*`s: `FieldLabel required` (added
  2026-11-16) and the CSS rule in `styles/components.css` that reads the control's own `required` /
  `aria-required` (2026-11-09). Together every required label showed `**`. The label prop is removed; the CSS rule
  is the single marker (Field story `Required` asserts exactly one). — Any NEW required field must set `required`
  (or `isRequired`) on the control itself; a label never claims it.
- **Fixed 2026-11-17, found from the user's screenshots (laws of UI/UX pass):**
  - `InputGroupButton size="sm"` was an empty variant, so the inner Button fell back to 40px and filled the 40px
    field (Master List's "Add town" pill). It is now 32px; Master List nests it 3px inside on every side (story
    `AddValue` measures it).
  - Organization profile "At a glance": identifiers (GST, PAN, TAN, fiscal year) were Stat Cards — a KPI's headline
    figure clipped the GST number under its icon and wrapped the fiscal year. Now a Description List
    (`columns="auto"`, new, story `AutoColumns`) at reading size; "Founded" shows in the company date format.
  - Branch form Preferences: Time format is a Select with the same floating label as Timezone (it was a
    label-above ToggleGroup, so the two controls started at different heights).
- **Stat Cards showing text instead of figures elsewhere** — the profile page used Stat Card for registration numbers;
  other screens may do the same (a Stat Card is for a KPI: a number, a trend). — Grep `<StatCard` whose `value` is
  an id, a code or a sentence and move those to a Description List. (found 2026-11-17)
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
- **Sign-in shows "KAIZNOVA" initials, not a logo** (2026-11-19) — `AuthScreen.tsx` `PLATFORM_LOGO` is `null`
  because no KAIZNOVA logo file exists yet; the old public `GET api/company/logo` (it served the oldest tenant's
  logo to every tenant's sign-in) is removed. — Drop the KAIZNOVA lockup into `public/media/brand/` and point
  `PLATFORM_LOGO` at it. Splash, favicon and PWA icons are still the WiseTech set (`media/brand/wisetech-logo.png`,
  `icons/pwa-*`) — replace with the KAIZNOVA set in the same pass.
- **Tenant-branded sign-in** — a tenant's own logo on its sign-in page needs a tenant hint first (subdomain, e.g.
  `acme.app.kaiznova.com`) and a public endpoint that answers by that hint only (Wave 1 #407). — Build after the
  domain move; never pick "a" tenant's brand without one.

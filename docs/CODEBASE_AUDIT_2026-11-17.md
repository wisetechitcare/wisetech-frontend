# WiseTech Frontend: 360° Codebase Audit

**Date:** 2026-11-17 · **Branch:** `codebase-revamp` · **Type:** audit only, no code was changed.

**Method.** The repo was mapped first. Six read-only audits then covered architecture and routing, code quality and reuse, performance and bundle, state and data flow, API and auth, and security, dependencies and tooling.

The highest-impact claims were re-checked by hand:

- Vite 8.3.4 is what's installed.
- `chart.js` is imported only in `main.tsx`.
- 36 screenshot files are tracked under `e2e/.visual`.
- The meeting link reaches `window.open` unvalidated.
- Two toast systems are mounted.
- There are two framer-motion copies.
- `react-hook-form` has 0 importers.
- An editor `.tmp` file is tracked.

One audit claim was wrong and is corrected below (M13): `ErrorBoundary` *is* mounted. Counts come from grep, so treat them as close estimates.

**Second pass: the whole frontend folder.** The first pass went deep on `src/` only. A second pass of four read-only audits covered everything else. Section 10 holds its findings, and the roadmap in section 9 includes them.

| Area | Files accounted for |
|---|---|
| Root config files (`index.html`, `amplify.yml`, `customHttp.yml`, vite/vitest/playwright/ts configs, `.npmrc`, `.gitattributes`, `.gitignore`, `.cursor*`, lint-staged, `.eslintrc.cjs` + 3 baselines, `package.json`, `pnpm-workspace.yaml`, lockfile, `patches/`, `dist/`) | 25 / 25 |
| `scripts/`, `eslint-rules/`, `devtools/`, `.husky/`, `.harness/`, `.task-tests/`, `.github/` | 51 / 51 |
| `public/` | 76 / 76 |
| `e2e/` | 43 / 43 |
| `.storybook/` | 2 / 2 |
| Docs (11 at the root, 18 in `docs/`, 4 md/mdx in `src/`, 2 others) | 35 / 35 |
| `src/ds` | 233 / 233 |
| `src/_metronic` (ts/tsx + scss) | 531 / 531 |
| `src` root files, `preferences`, `shared/form-engine`, `modules/audit`, `modules/payroll`, `components` | 140 / 140 |
| Test files | 166 / 166 |
| Stories | 101 / 101 |

`node_modules/` was checked only through the lockfile and installed versions. Its contents are third-party code and were not audited.

The second pass's highest-impact claims were also re-checked by hand:

- **CI diff base:** CI diffs against `github.event.before` instead of `main`.
- **Pre-push hook:** it has no ESLint step.
- **Public sample CSV:** `public/sample-lead-import.csv` is tracked, served publicly and holds 5 rows with mobile-format numbers.
- **Broken images:** `TaskTimesheet.tsx` points at `/media/details/*.png`, which no longer exist.
- **Notifications:** two notification systems are mounted.
- **CSS gap:** `main.css` doesn't import `tw-animate-css` or Inter Variable, but the Storybook CSS does.

---

## Contents

1. [Architecture overview](#1-architecture-overview)
2. [Folder structure](#2-folder-structure)
3. [Existing patterns](#3-existing-patterns)
4. [Findings by priority](#4-findings-by-priority)
5. [Duplicate implementations](#5-duplicate-implementations)
6. [Performance opportunities](#6-performance-opportunities)
7. [Reusability opportunities](#7-reusability-opportunities)
8. [Recommended folder structure (proposal)](#8-recommended-folder-structure-proposal-only)
9. [Final recommendations and roadmap](#9-final-recommendations)
10. [Whole-folder audit: outside `src/` and remaining `src/` areas](#10-whole-folder-audit-outside-src-and-remaining-src-areas)

---

## 1. Architecture overview

- **Stack.** An HRMS single-page app on React **19.3** (AGENTS.md still says 18) and TypeScript strict. The bundler is **Vite 8.3.4 / Rolldown**: `package.json` asks for `^7`, but an unbounded override in `pnpm-workspace.yaml` pulled in 8.
- **Startup.** `src/main.tsx` installs the Buffer polyfill, sets up the axios interceptors and the QueryClient, bootstraps the session (with retries), then renders `App.tsx`.
- **Providers.** `App.tsx` stacks I18n, Layout, two theme providers, the Kit, toasts and unsaved-changes. It also hosts the global timer, idle, PIN and PWA components.
- **Routing.** `AppRoutes.tsx` holds the data router and the auth gate. It hands off to `PrivateRoutes.tsx`, a single 1,001-line route table with about 170 routes. 76 pages are lazy-loaded; Billing has its own lazy nested router.
- **State.**
  - Redux Toolkit: 19 slices, 6 of which fetch through thunks.
  - React Query: one client with good defaults, plus a key factory (`src/lib/queryKeys.ts`).
  - Also present: an event bus (`utils/EventBus.ts`), a hand-rolled request cache (`services/_requestCache.ts`) and about 30 contexts.
- **API.** The global axios instance is configured by `setupAxios`; 51 of 55 service files call it directly. Endpoints live in `constants/api-endpoint.ts`. A second axios instance exists in `src/lib/apiClient.ts`.
- **UI.** Three generations coexist:
  1. Metronic and Bootstrap: `src/_metronic`, plus 80 files using react-bootstrap.
  2. MUI: 499 files.
  3. The `src/ds` kit (shadcn base-maia): 505 importers, plus 604 importers of the legacy adapters in `app/modules/common/components/ui`.

  Lint ratchets stop new legacy code. Current baselines: UI 263 entries, legacy-UI 849, icons 567.

## 2. Folder structure

| Folder | Files | Purpose and verdict |
|---|---|---|
| `src/app/pages` | 995 | Screens; `employee/` alone holds 812. The de facto home of each domain. |
| `src/app/modules` | 423 | Mixed. Holds the Metronic demos (`apps/`, `widgets/`, `wizards/`, `accounts/`), `auth/`, `errors/`, the catch-all `common/` (281 files, 28 of them domain-specific) and feature modules. `offer-v2/` is 11 empty files. |
| `src/app/routing` | 3 | `AppRoutes`, `PrivateRoutes`, `tabPaths`. |
| `src/app/{components,hooks,utils,theme,pwa}` | 7/9/3/8/4 | App-level guards, hooks, color mode and the service worker. |
| `src/ds` | 224 | **The design-system kit**: tokens, ui, patterns, effects and stories. Clean boundary: only 1 import from `app`. |
| `src/_metronic` | ~200 | The vendored theme: layout shell, partials and SCSS. |
| `src/components` | 69 | Shell UI: workspace, navigation, notifications. |
| `src/services` | 55 | The API layer. |
| `src/utils` | 105 | Dates, currency and permissions (`can.ts`). Also holds `statistics.ts` (4,087 lines), which is really a service. |
| `src/hooks` | 33 | Hooks shared across features. |
| `src/redux` | 21 | The store and slices. |
| `src/modules` | 47 | A second "modules" root, under the `@modules` alias. `audit/` and `payroll/` are live; `crm/` and `projects/` are stubs nothing imports. |
| `src/lib` | 3 | The second axios client, `queryKeys` and `cn`. |
| `src/shared` | 17 | The form engine (`EnterpriseFormWizard`). |
| `src/{models,types,constants,contexts,preferences}` | 10/2/9/2/2 | Types, endpoint constants, two contexts and the preference resolver. |

**Parallel roots.** Components live in 3 roots, hooks in 3, utils in 4 and modules in 3. With no placement rule, the same concept gets built two or three times. For example:

- `usePersistedState`, `useStoredState` and `useRememberedChoice` all do the same job.
- There are two `Skeleton.tsx` files.
- There are three `cn()` helpers. One merges conflicting Tailwind classes and the other two don't.

## 3. Existing patterns

**Consistent:**

- Lazy routes behind `SuspensedView`.
- Endpoint constants kept in one file.
- `can.ts` as the single permission engine (152 importers).
- `MaterialTableImpl` as the single table engine (102 users).
- `apiErrorMessage` for API errors (74 files).
- The `queryKeys` factory, used in recruitment and tasks.
- Formik as the form library in practice: 135 files, while `react-hook-form` has 0 importers even though AGENTS.md lists it.

**Inconsistent:**

- Fetching: roughly 212–340 files fetch inside `useEffect` (the count depends on method), against about 93 that use React Query.
- Route guards come in 5 styles.
- 2 toast systems, 3 or more confirm paths, 4 chart libraries, 2 motion packages and 4 phone-input layers.

---

## 4. Findings by priority

### Critical

| # | Where | What's wrong | Why it matters | Fix |
|---|---|---|---|---|
| C1 | `vite.config.ts:120-146`, `pnpm-workspace.yaml:22` | The override `vite: '>=7.3.7'` installed **Vite 8 (Rolldown)**. Rolldown pulls each module's dependencies into its `manualChunks` group, so `buffer`/`events` land in `vendor-pdf`, react-dom internals in `vendor-calendar`, and react-query in `vendor-table`. All of these load at entry. | `dist/index.html` modulepreloads **209 chunks, about 3.27 MB gzip, on the sign-in page**. Every user downloads the PDF, chart, calendar and table code. | Cap the override (`^7.3.7`) or move to Rolldown's chunking API. Move `buffer`/`events` and react-query out of the heavy groups, and split the three chart libraries. Track the modulepreload count. |
| C2 | `src/main.tsx:18,62`, `src/app/routing/PrivateRoutes.tsx:6` | `chart.js` is registered globally but has **zero consumers**. `DashboardWrapper` is imported eagerly, which pulls in echarts and leaflet. | These two lines pin `vendor-charts`, `vendor-echarts` and `vendor-maps` to the entry. | Delete the chart.js lines and the package. `lazy()` the dashboard, and lazy-load `PrivateRoutes` from `AppRoutes`. |
| C3 | `e2e/.visual/**` (36 tracked files) | Visual-test screenshots are committed. `.gitignore:59-60` and the e2e README say this folder holds **real data and a live session cookie**. The images were not opened during this audit. | Possible employee PII in repo history. | `git rm --cached -r e2e/.visual`. Review the contents and decide whether history needs purging. |

### High

| # | Where | What's wrong | Why it matters | Fix |
|---|---|---|---|---|
| H1 | `src/app/modules/auth/core/AuthHelpers.ts:39-48`, `customHttp.yml` | The JWT is stored in localStorage (labelled a "temporary" hotfix) and there is **no CSP**. The file's own header and `src/lib/apiClient.ts:11-18` still claim "httpOnly cookie, XSS-safe". | Any XSS can take over the session, and the comments mislead reviewers. | Correct the comments now. Ship CSP in report-only mode. Track the same-domain migration back to cookie auth. |
| H2 | `src/utils/socketClient.ts:9-25`, `src/hooks/useRealtimeSync.ts:60` | The socket authenticates by cookie only, which the HTTP layer says browsers block cross-site. `joinRoom` also sends user and employee ids chosen by the client. | Either realtime is silently unauthenticated, or, if the backend trusts `joinRoom`, users can receive each other's events. | Pass the token in `auth`. **Confirm on the backend** that rooms come from the session. |
| H3 | `src/lib/apiClient.ts:44-67` vs `AuthHelpers.ts:145-188` | Two axios clients whose interceptors have **drifted apart**. The second has a different error shape, no `backend-down` event and no exit-date message, and it forces a JSON `Content-Type` onto FormData. | The same call behaves differently depending on which client a file imported. | Keep one policy: `apiClient` wraps the global axios, or its 2–3 users move off it. |
| H4 | `src/services/lead.ts`, `leads.ts`, `leadService.ts` | Three lead services. `lead.ts` and `leadService.ts` share **46 export names**, and the "re-exports from here" comment is false. | Nobody knows which one to extend, and screens get two different error shapes. | Make the two older files re-export `leadService`, then delete the duplicates. |
| H5 | `BillingOperationDetailPage.tsx:73`, `RecordPaymentDialog.tsx:99`, `VerifyPaymentDialog.tsx:38`, `DocumentEditorPage.tsx:147` | Mutations invalidate keys that no query uses (`billing-operations`), or miss related keys entirely. | With a 5-minute `staleTime`, lists and **totals stay wrong** after a status change or a payment. | Add a `billing` branch to `queryKeys.ts` under one `billing.all` root, the same pattern as `tasks.all`. |
| H6 | `PrivateRoutes.tsx:209-224,337`, `src/app/modules/apps`, `widgets`, `wizards` | Metronic demo routes are live in production. user-management calls `undefined/users/query`, and the relative URL passes the "own API" check, so the JWT is attached. | Fake screens and dead code, reachable from the theme menus. | Delete the routes, the modules and the menu links. |
| H7 | `PrivateRoutes.tsx` | Five guard mechanisms are mixed. The inline `hasPermission` reads `store.getState()`, so it doesn't react to changes, and about 9 routes are unguarded. These guards are UX only. | A guard is easy to forget, and access changes during a session aren't reflected. The backend must enforce access regardless. | Use one `<RouteGuard section/pack/perm>` built on `SectionGuard`, which already reacts to changes. |
| H8 | `auth.currentUser`, `employee.currentEmployee`, `rolesAndPermissions.emp` (a string), raw `wise_tech_login` parses in 13 files | The current user exists in 4–5 copies with 5 bootstrap paths, and `fetchRolesAndPermissions` is dispatched in about 22 places. | The copies drift, and every dispatch re-renders all subscribers. | Use one source (`currentEmployee`) loaded once, add a `getSessionUserId()` helper, and remove the extra dispatches. |
| H9 | ~212 files, e.g. `WorkingMethodOptions.tsx`, `NewCompanyForm.tsx`, `EntityTablePage.tsx` (0 `useQuery`) | Hand-rolled fetching inside `useEffect`, with 234 manual `loading` flags. | No cancellation, deduplication or caching, so race conditions (one already hit in tasks, per `queryKeys.ts`) and redundant requests. | Migrate module by module, starting with the shared lookups: employees, branches, geo. |
| H10 | `src/app/pages/employee/entity/EntityTablePage.tsx:591-700,894-907` | A 4-stage request waterfall: leads, then 6 lookups, then states for each country, then cities for each state (N+1). Nothing is cached, the whole chain reruns on 6 event-bus events, and states are concatenated in quadratic time. | This is the slowest common screen. | Fetch lookups and geo with `useQuery` (reuse `['geo','countries']` from `useCurrency.ts`), run them in parallel, and invalidate on events. Long term, move to server-side paging (already in AGENTS.md). |
| H11 | `my-leaves/ApplyLeave.tsx:539-988`, also `Graphs.tsx:1134` and 5 other files | About 17 components are **defined inside the render body**. | They remount on every keystroke and lose focus and file-input state. This is a correctness bug. | Move them to module scope, or call them as plain functions. |
| H12 | `src/main.tsx:114` and `src/app/App.tsx:229` | Two toast systems are mounted at once. react-toastify is hard-coded to `theme="light"` and imported directly in 33 files. | Toasts overlap and ignore dark mode. | Route `ui/feedback.ts` to the kit Toaster and migrate the 33 files. |
| H13 | 81 files; `src/utils/date.ts:116,153` vs `src/utils/dateFormats.ts:73,113` | 203 non-standard date formats, 43 `toLocaleDateString` calls (lint-banned) and about 15 local `fmtDate` helpers. **Functions with the same name produce different output** depending on the import path. | Breaks the `YYYY.MM.DD` company standard. | Remove or rename the `date.ts` versions and route everything through `dateFormats`. |
| H14 | `yearlyAnalyticsUtils.ts:29`, `projectAnalyticsUtils.ts:222`, `ExportButton.tsx:115`, about 10 more | Local money formatters hard-code Cr/L/K or `en-IN`. One of them drops the minus sign on negative values. | Wrong for branches outside India. | Use `formatCurrencyCompact` and the other `currency.ts` helpers. |
| H15 | `WorkingMethodOptions.tsx` (997 of 2,145 lines commented), `RaiseRequestForEmployee.tsx` (399/533), `App.tsx` (123/255); ~19k comment lines repo-wide | Whole old implementations are kept as comments. | Hides the live code and pollutes search results. | Delete them; git keeps the history. |
| H16 | `common/inputs/PhoneInput.tsx` (dead), `app/components/PhoneNumberInput.tsx`, `WtPhoneField.tsx` (MUI), `ds/patterns/phone-field.tsx` (used only by its story) | Four phone-input layers. | The kit version exists and goes unused. | Make `WtPhoneField` forward to the kit field and delete the dead one. |

### Medium

| # | Where | What's wrong and the fix |
|---|---|---|
| M1 | `src/app/pages/employee/MeetingViewModal.tsx:140` (42 `window.open` calls in the repo) | A user-entered `meetingLink` goes straight to `window.open`, so a `javascript:` URL would run. **Fix:** promote the existing http(s) check (`GenericDetail.tsx:39`) into a shared `safeUrl()` in `ui/safeHtml.ts`. |
| M2 | `src/app/pages/billing/documents/DocumentSheet.tsx:105` | Server HTML is injected unsanitised and relies on the backend escaping it. **Fix:** add a backend escaping test, or run DOMPurify with `style` allowed. |
| M3 | `NewEmployeeWizard.tsx:182-215`, `PipelineView.tsx:228` | The onboarding draft, including bank details and CTC, is kept in sessionStorage. **Fix:** strip those fields, or clear the draft on sign-out. |
| M4 | `src/app/pages/company/Branches.tsx:519-557` | Browser-side Google Geocoding with a key AGENTS.md says is dead. **Fix:** use `SmartLocationPicker`. |
| M5 | `src/utils/can.ts:23`, `src/utils/statistics.ts` (44 sites), attendance views; 88 `getState()` sites in total | Permission and settings reads are not reactive. **Fix:** add a `useCan()` hook over `useSelector`, and keep `getState` for non-React code. |
| M6 | Slices `attendanceStats` (its `toggleChange` flag works as a refetch trigger, 85 refs), `allEmployees`, `leaderboardCache`, `salaryData`, `appSettings`, and others | Redux caches server data, and the event bus (80 emits) acts as a second invalidation channel. **Fix:** move these to React Query as screens are touched. |
| M7 | `src/utils/statistics.ts` (4,087 lines, 97 exports; imports the store, services, axios and a page type) and `src/services/employee.ts` (3,373 lines, 262 exports) | Oversized modules with inverted layering. **Fix:** split into pure, testable maths and per-domain services. |
| M8 | `src/app/App.tsx:213-217` | Two theme providers (Metronic `ThemeModeProvider` and `ColorModeProvider`) both write `data-bs-theme`. **Fix:** point the 4 `useThemeMode` readers at `useColorMode` and remove the Metronic provider. |
| M9 | `src/app/routing/AppRoutes.tsx:21-31` | `jwtDecode` isn't wrapped in try/catch, `currentUser?.token` is always undefined, and there is an unguarded `JSON.parse`. **Fix:** one guarded `hasValidSession()` shared with `main.tsx`. |
| M10 | `auth/core/signOut.ts`, `AsideDefault.tsx:28`, `HeaderUserMenu.tsx:38`, `AuthHelpers.ts:106` | Sign-out exists in 4 places and each clears a different set of keys. **Fix:** route all of them through `signOut`. |
| M11 | `AuthHelpers.ts:178-185`, `App.tsx:94-137` | `backend-down` is dispatched but its only listener is commented out, so outages show no feedback. **Fix:** re-enable the listener or remove the dispatch. |
| M12 | 115 reads of `response?.data?.message`; 79 `.catch(()=>{})`; 52 empty `catch {}` blocks | Users see "Bad request" instead of the real message, and failed loads show as blank UI. **Fix:** use `apiErrorMessage` everywhere and add a global `QueryCache.onError`. |
| M13 | `src/app/routing/AppRoutes.tsx` (no `errorElement`) | *Correction:* `ErrorBoundary` does wrap page content (`_metronic/layout/components/Content.tsx:23`). Crashes in the layout or auth routes, and stale-chunk 404s after a deploy, still fall through to React Router's default screen. **Fix:** add an `errorElement` that reuses the boundary UI. |
| M14 | `src/_metronic/assets/sass/style.react.scss` | The entry CSS is **2.02 MB raw**. It ships socicon, prism and nouislider (0 uses each) and line-awesome (1 use). **Fix:** remove those, and move animate.css and the flatpickr CSS to the components that use them. |
| M15 | `framer-motion@12` (43 files) and `motion@14` (the kit) | Two copies are bundled, and the kit's `MotionConfig` doesn't reach the other copy. **Fix:** standardise on `motion`. |
| M16 | `src/constants/api-endpoint.ts:1` and 5 more files | `import { get } from "lodash"` (CommonJS) pulls all of lodash into the entry. **Fix:** use optional chaining. |
| M17 | `_metronic/layout/core/PageData.tsx:45`, `LayoutProvider.tsx:67`, `SidebarCollapseContext.tsx:59` | Context values at the app root aren't memoised, so the whole shell re-renders. **Fix:** wrap them in `useMemo`. |
| M18 | `*/Monthly\|Yearly\|Weekly\|Custom\|Daily.tsx` (about 33 files) | Period views are copied per module, each with its own fetching. **Fix:** one `PeriodView` plus a query hook per domain. |
| M19 | `LeadWizardModal.tsx` (3,384 lines, 53 `useState`) passes 56 props to `LeadWorkspace`, which passes 44 to `LeadSections` | Heavy prop drilling. **Fix:** sections read the Formik context, and a small wizard context carries lookups and handlers. |
| M20 | `EntityTablePage.tsx:345-362` | Filters live in component state, so they're lost on reload and can't be shared. `useStickyFilters` already solves this but only 1 file uses it. **Fix:** adopt it here. |
| M21 | `utils/modal` (142 files), `ConfirmDialog` (67), `DeleteConfirmationModal`, `window.confirm` | Several separate confirm paths. **Fix:** make them all delegate to `ds/patterns/confirm-dialog`. |
| M22 | `documents/saveBlob.ts` vs `reimbursementFormat.ts:198`; 3 CSV and 3 PDF exporters | Duplicated download code. One copy revokes the blob URL synchronously, which its sibling's own comment says can cancel the download. **Fix:** one `saveBlob` plus shared exporters. |
| M23 | `src/lib/utils.ts`, `ui/tw/cn.ts`, the npm `cn` package | Three `cn` helpers with different merge behaviour. **Fix:** make the local two re-export one. |
| M24 | `: any` ×4,333, `as any` ×533; 999 API calls with no generic type | Type safety is eroding. **Fix:** type the `RootState` reads first, then the busiest list endpoints, and make `apiClient` default `T` to `unknown`. |
| M25 | 18 `eslint-disable no-restricted-syntax`, 94 `exhaustive-deps` disables | Lint workarounds that AGENTS.md forbids. **Fix:** burn them down with the ratchet. |
| M26 | The parallel folder roots (section 2) | There is no placement rule. **Fix:** write one into AGENTS.md and merge duplicates as files are touched. |

### Low

**Stale code and leftover files**

- 5 sites read `localStorage.getItem('token')`, a key that is never written: `services/employee.ts:25,2616`, `utils/statistics.ts:3510`, `app/utils/search.tsx:357`, `hooks/usePushSubscription.ts:27`.
- 545 no-op `catch (e) { throw e }` wrappers in services.
- `_requestCache.ts` caches alongside React Query, a second cache layer.
- 375 `console.log` calls, some logging salary payloads, and nothing strips them in production builds.
- Tracked files that shouldn't be: `debug-storybook.log` (it contains a local Windows path) and `Daily.tsx.tmp.23824…`.
- 13 empty files, 11 of them in `offer-v2/`.
- Orphan files: `MenuTestPage.tsx`, `layout-builder/`, `pages/employee/billing/*`, `dmsStore.tsx`, `src/utils/search.tsx`, `src/modules/crm`, `src/modules/projects`.
- Heavy asset: `balloons.png` (1.96 MB, unreferenced).
  - *Correction:* the "463 KB favicon" in the first pass came from the stale `dist/` build. `public/favicon.ico` is 7.7 KB; see section 10.3 for the separate blurry-logo issue.

**Dependencies and config**

- Packages with 0 imports: puppeteer (downloads Chromium on every install), jsonwebtoken, radix-ui, react-phone-input-2, react-hook-form, json2csv (alpha), pdfmake, pdf-lib, @react-pdf/image, both Google Maps libraries, supercluster, react-query-devtools, @formatjs/intl-pluralrules, tailwind-merge. `@types/chart.js` is pinned to v2 types.
- Dependency overrides have no upper bound.
- The bare `app` alias has 0 uses.
- `package.json` still says name `demo7`, version 8.2.4.
- `public/service-worker.js:58` builds a URL by string concatenation.
- Typos in paths: `employeTeamLevel`, `Calender`, `Blance`, `Porject`, `Satatus`.

**Documentation drift**

- AGENTS.md is outdated on the React version, react-hook-form, the baseline count (says 286, actual 263) and the override count (says 9, actual 15).
- The root `DESIGN_SYSTEM.md` ("Liquid Glass") contradicts ADR-001.
- The planning docs in the repo root belong in `docs/`.

**Tooling gaps**

- Storybook and axe tests don't run in CI.
- 161 test files against 2,254 source files, with no coverage threshold.
- GitHub Actions are pinned by tag rather than by SHA.

---

## 5. Duplicate implementations

| Concern | Implementations |
|---|---|
| HTTP clients | 2 axios clients |
| Lead services | 3 |
| Company services | `company.ts` and `companies.ts` |
| Caching | 2 layers (React Query plus `_requestCache`) |
| Toasts | 2 systems |
| Confirm dialogs | 3 or more paths |
| Phone input | 4 layers |
| Charts | 4 libraries |
| Animation | 2 motion packages |
| Theme | 2 providers |
| `cn` | 3 helpers |
| Persisted-state hooks | 3 |
| Skeletons | 2 |
| DMS stores | 2 |
| `SearchEmployee` screens | 4 |
| Period views | about 33 |
| Date helpers | about 15 |
| Money formatters | about 12 |
| CSV exporters | 3 |
| PDF exporters | 3 |
| `saveBlob` | 2 |
| Sign-out paths | 4 |
| Route-guard styles | 5 |
| Current-user copies | 4–5 |

## 6. Performance opportunities

In order of payoff:

1. **C1 + C2:** the entry bundle. Mostly deletions plus `lazy()`.
2. **M14:** the 2 MB entry CSS.
3. **H10:** the `EntityTablePage` waterfall.
4. **H11:** the `ApplyLeave` remounts.
5. **M15–M17:** duplicate motion copy, full lodash, unmemoised root contexts.
6. **H9:** migrating to React Query.

Track each step with the `rel="modulepreload"` count in `dist/index.html`. It is **209** today.

## 7. Reusability opportunities

Almost every fix points at shared code that **already exists**; none needs a new library:

- `dateFormats.ts` and `currency.ts` replace the local helpers (H13, H14).
- `ds/patterns/phone-field` and `ds/patterns/confirm-dialog` replace the legacy paths (H16, M21).
- `useStickyFilters` for URL-backed filters (M20).
- `queryKeys` for billing (H5).
- `SectionGuard` as the single route guard (H7).
- `safeHtml.ts` gains `safeUrl` (M1).
- One `saveBlob` (M22).
- A `useCan()` hook over the existing `can.ts` (M5).

## 8. Recommended folder structure (proposal only)

This target is reached gradually, as files are touched; there is no big-bang move.

```
src/
  app/                  shell only: App, routing, providers, theme, pwa, auth
  ds/                   the kit (unchanged)
  app/pages/<domain>/   stays the feature home; per-domain components/, hooks/, api.ts (query hooks)
  services/<domain>.ts  one file per domain (split employee.ts; merge the 3 lead files)
  components/           the ONE shared-component root (absorbs app/components; common/components shrinks into ds)
  hooks/                the ONE shared-hook root (absorbs app/hooks, common/hooks)
  utils/                pure functions only (absorbs app/utils, common/utils; statistics.ts I/O moves to services)
  lib/                  apiClient (single), queryKeys
  redux/                client state only
  models/ types/ constants/
```

- Fold `src/modules` (audit, payroll) into `app/pages` or `services`.
- Delete the Metronic demo modules.
- Leave `_metronic` vendored until the shell is migrated.

---

## 9. Final recommendations

### 9.1 Already done well (preserve)

- **Design system and guardrails:** the `src/ds` kit, the ratcheting lint baselines, `consistency.test.ts`, `MUI_FREE_ROOTS`, the husky hooks and the CI gates.
- **Session and request safety:**
  - `isOwnApiUrl` in `setupAxios` keeps the JWT off third-party hosts.
  - `endSessionAndRedirect` is loop-safe.
  - `bootstrapSession` retries.
  - The security-PIN replay has a loop guard.
  - `apiError.ts` extracts the right error message.
- **Single engines:**
  - `can.ts` for permissions.
  - `MaterialTableImpl` for tables. Don't move screens off it until Data Table reaches parity.
  - `queryKeys.ts`, with its documented invalidation contracts.
- **Realtime:** the socket is a singleton, and every `.on` has a matching `.off`.
- **Routing:** lazy routes, `tabPaths`/`tabRoutes`, `useReturnContext` and the legacy-URL redirects.
- **Billing:** the document engine design (`DocumentSheet` renders server HTML), server-side paging in Billing Ops, and the optimistic update in `ProjectBillingWorkspace`.
- **Lazy heavy libraries:** exceljs, jspdf, pdfjs and Amplify are loaded with dynamic imports.
- **Security plumbing:** `safeHtml` with DOMPurify, `customHttp.yml` and `verify-build-env.mjs`.

### 9.2 Improve immediately

- **C1–C3**
- **From section 10:**
  - **W-C1:** handle the HR data committed to `origin/main`
  - **W-H1:** the public CSV
  - **W-H2:** the CI diff base
  - **W-H3:** the unbounded overrides
  - **W-H5:** the double notifications
- **H1:** fix the misleading comments and ship CSP in report-only mode
- **H2:** needs a backend check
- **H5, H6, H11**
- **M1**

Most of these are small diffs.

### 9.3 Do not change unnecessarily

- **No sweeping rewrites:** no big-bang folder move and no framework migration.
- **Keep the state libraries:** no state-library swap. Redux plus React Query is the right pair; the problem is *what* is stored where.
- **Keep Formik:** it is the de facto standard (135 files vs 0).
- **Leave the table engine** until Data Table reaches parity.
- **Leave `_metronic`** alone beyond deleting the demos.
- **Keep wire dates ISO.**
- **No new libraries:** every fix above uses code already in the repo.

### 9.4 Phased roadmap

**Phase 0: hygiene and quick wins (days, almost all deletions)**

- Untrack `e2e/.visual`, the log and the `.tmp` file.
- Delete the chart.js registration.
- Lazy-load the dashboard and `PrivateRoutes`.
- Cap the Vite override and fix `manualChunks`.
- Delete the Metronic demo routes and modules, the zero-import dependencies, the empty and orphan files, and the commented-out code.
- Correct the AuthHelpers comments and AGENTS.md.
- *Whole-folder items:*
  - Delete or replace `public/sample-lead-import.csv`.
  - Bound the overrides.
  - Switch the CI diff base to `merge-base origin/main`.
  - Untrack the stray agent file, and stop ignoring `CLAUDE.md` in `.gitignore`.
  - Fix `.gitattributes` (`eol=lf` for `.husky/*` and `*.sh`).
  - Remove the Google Fonts link from `index.html`.
  - Delete the one-off scripts (`_patch_mrt_search.mjs`, `_probe_mrt.mjs`, `erase-git-summary.mjs`) and `.harness/`.
  - Delete the dead `_metronic` files and the unused `public/` assets.
  - Add superseded banners to `DESIGN_SYSTEM.md`, `UI_RESOURCES.md`, `NEXTJS_MIGRATION_PLAN.md` and `LEAVE_MANAGEMENT_REDESIGN_PLAN.md`.
  - Fix the broken TaskTimesheet images.

**Phase 1: correctness and security (1–2 weeks)**

- Ship CSP in report-only mode, add `safeUrl` and fix socket auth.
- Consolidate to a single axios client and merge the lead services.
- Fix the billing query keys.
- Move the `ApplyLeave` render-body components out.
- Consolidate to one toast system.
- Add an `errorElement`.
- Share `hasValidSession`.
- Consolidate to a single sign-out.
- Decide `backend-down`: re-enable the listener or drop the dispatch.
- *Whole-folder items:*
  - One notification system.
  - Mount the kit Toaster.
  - Close the `main.css` vs Storybook CSS gap.
  - Add a `vite:preloadError` reload, and exclude asset paths from the SPA rewrite.
  - Add the missing pre-push lint, or correct the docs.
  - Block deletion of protected branches in pre-push.
  - Run `test-storybook` and `audit:choices` in CI.
  - Typecheck the config files, `scripts`, `eslint-rules` and `e2e`.
  - Fix the service-worker `notificationclick` URL.
  - Fix the ESLint overrides that drop bans.

**Phase 2: data layer (ongoing, per module as touched)**

- React Query for the shared lookups, then for the Redux server slices. This retires `toggleChange` and the event bus.
- `useCan`, and a single current-user source.
- Consolidate date and currency formatting.
- Split `statistics.ts` and `employee.ts`, and add a shared `PeriodView`.
- Fix the `EntityTablePage` waterfall, then move it to server-side paging.

**Phase 3: long tail**

- Burn down the legacy-UI ratchet (MUI, Bootstrap, react-bootstrap) and unify the confirm and phone paths.
- Consolidate the folder roots.
- Type the API layer.
- Run Storybook tests in CI and add coverage thresholds.
- *Whole-folder items:*
  - Move the Metronic shell into `src/app/shell` and retire `_metronic`.
  - Rebuild the form-engine shell on the ds Stepper and Form Dialog.
  - Add tests for payroll, salary, billing, `can.ts`, `dateFormats.ts` and AuthHelpers.
  - Fold `test:tasks` into vitest.
  - Consolidate the docs into one current set.

---

## 10. Whole-folder audit: outside `src/` and remaining `src/` areas

IDs are prefixed `W-` so they don't collide with section 4.

### 10.1 Critical

| # | Where | What's wrong | Why it matters | Fix |
|---|---|---|---|---|
| W-C1 | `e2e/.visual/**` (36 files, 5.7 MB); commit `6409d6d8` | Section 4's C3, now **confirmed by viewing a baseline**: `approvals--loaded.png` shows the signed-in employee's name, a candidate's name with interview details, and offer reference numbers. The ignore rule was added on 2026-10-28 (`b59b623d`) and the files were force-added the next day. The commit is reachable from `origin/main`, `origin/dev` and other branches. `playwright.config.ts:6-7` and `e2e/visual/README.md:7` both say these files are gitignored, which is false. The HTML report and `.last-run.json` contain no tokens or cookies, and `e2e/.auth/` was never committed. | Personal HR data sits on the main remote branch and in its history. | Run `git rm -r --cached e2e/.visual`. Add the `e2e/.visual` and `e2e/.auth` paths to `scripts/hooks/guard.mjs` so a force-add is blocked. Decide with the data owner whether to purge history (filter-repo plus a coordinated force-push). |

### 10.2 High

| # | Where | What's wrong | Why it matters | Fix |
|---|---|---|---|---|
| W-H1 | `public/sample-lead-import.csv` (since `fa98588c`, 2026-08-25) | Nothing references it; `LeadBulkImport.tsx:352` generates its own template. It holds what look like real staff and contact names, mobile-format numbers (5 of 7 rows), client company names and PO numbers. | Anyone can download it from `/sample-lead-import.csv` without logging in, and it ships in every build. | Delete it, or replace it with obviously fake data. Check whether it needs removing from history. |
| W-H2 | `.github/workflows/ci.yml:67-90` | The secret scan and the lint step diff against `github.event.before`, i.e. the previous push. On a branch's first push they fall back to `HEAD~1`. | A red push can be followed by a push that touches other files and goes green. A new branch pushed with 10 commits only has its last commit scanned. This is the check the docs call unbypassable. | Use `base=$(git merge-base origin/main HEAD)`. `fetch-depth: 0` is already set, and `pnpm verify` already does this (`scripts/hooks/run.mjs:360`). |
| W-H3 | `pnpm-workspace.yaml:11-25` | Every security override is `>=X` with no upper bound, and most resolved across a major version: minimatch 10.2.6 (eslint 8 expects 3.x, though the comment says "stays in-major"), nanoid 6.0.1 (postcss expects 3.x CJS), js-yaml 5, fast-uri 4, undici 8, vite 8. The `nth-check` override matches nothing in the lockfile. | The file says it pins "the lowest patched version" but does the opposite. The build works by luck plus Node 24. This is also the root cause of C1. | Use bounded or selector-scoped overrides, e.g. `minimatch@<3.1.3: ^3.1.3`, `nanoid@<3.3.8: ^3.3.8`, `vite: ^7.3.7`. Drop `nth-check`. |
| W-H4 | `scripts/hooks/run.mjs:296-331` vs AGENTS.md "Git hooks" and `docs/CI_CD.md` Stage 0 | Pre-push runs only the protected-branch check and `type-check`. There is **no ESLint**, although both docs say there is. | Developers trust a gate that doesn't exist. | Add the lint step (reuse `verify()` at `run.mjs:345-394`), or correct the docs. |
| W-H5 | `_metronic/layout/components/header/HeaderToolbar.tsx:131` (`NotificationsBell`) and `_metronic/layout/MasterLayout.tsx:66` (`NotificationCenter`) | Two notification systems are mounted. Both fetch `fetchNotificationsByEmployeeId` and both listen to `socket.on('newNotification')`. The Bell refetches on every route change (`NotificationsBell.tsx:61-64`, `location.pathname` is a dependency). | Two requests per page load plus one per navigation, and two unread counts that can disagree. | Keep `NotificationProvider`. Make the Bell a view over `useNotificationCenter()` and drop the pathname dependency. |
| W-H6 | `.storybook/preview.tsx` vs `ci.yml` | axe is set to `test: 'error'` and 96 of 101 stories have `play` functions, but CI never runs `test-storybook`. | The promise that every story fails on an accessibility violation only holds when someone runs it by hand. | Add a CI job for `pnpm test-storybook` (Playwright Chromium). |
| W-H7 | `src/ds` vs `app/modules/common/components/ui` | 46 kit modules have no importer outside `src/ds`, and 34 of 120 non-story ds files can't be reached from `main.tsx`. Unreachable examples: `page-header`, `stepper`, `entity-card`, `phone-field`, `master-list`, `sonner`, `drawer`, `slider`. Of the 78 legacy adapters, only 15 import `@/ds` and 50 still import MUI at runtime (e.g. `switch.tsx:2`, `stepper.tsx:32`). | AGENTS.md says the adapters "forward to src/ds — no own look, palette or MUI" and that every list view uses Page Header. The live app actually renders MUI, so agents follow guidance that doesn't match the code. KitMap itself is accurate. | Correct AGENTS.md. Swap adapters in KitMap order, starting with the low-risk ones: Switch, Stepper, PageHeader. |
| W-H8 | `src/modules/payroll/hooks/useSalaryCalculations.ts:6-53` (417 lines, 19 `any`), `payroll/utils/salarySlipExport.ts` (1,843 lines, 54 `any`, 24 hex) | Deduction types are classified by substring (`includes('professional') && !includes('fund') && !includes('tax')`). There are no tests under `modules/payroll`, `pages/billing` or `pages/employee/salary` (110 files). | This is money logic, and renaming a component key silently reclassifies a deduction. | Add an explicit component-type field and table-driven tests. |
| W-H9 | `src/main.css` vs `src/ds/styles/globals.css` | Storybook loads `tw-animate-css`, `shadcn/tailwind.css`, `@fontsource-variable/inter` and `typeset.css`; the app loads none of them. So in the app the kit's `animate-in`/`slide-in-*` classes do nothing (e.g. `combobox.tsx:119`), Inter Variable never loads, and `typeset` does nothing. | A passing story doesn't prove the screen looks the same in the app. | Import the missing four in `main.css` (and remove the Google Fonts link), or document each gap. |
| W-H10 | AGENTS.md (9 links), `docs/HANDBOOK.md`, `docs/DRY.md`, `docs/multi-tenancy.md`, `HOOKS.md`, `UI_RESOURCES.md` | Broken links: `../docs/leads/*`, `../docs/billing/*`, `../BILLING/INDEX.md`, `summary/…`, `.cursor/rules/…`, `GIT_HOOKS_GUIDE.md`, `ENGINEERING_PRINCIPLES.md`, `components/SmartLocationPicker.md`. None of these exist in this workspace. | Agents and new developers are told to read these docs first. | Move them into a repo, or link by URL and mark them as cross-repo. |
| W-H11 | `docs/HANDBOOK.md` §3, `common/components/ui/README.md:7,18,41`, `DESIGN_SYSTEM.md`, `UI_RESOURCES.md`, `LEAVE_MANAGEMENT_REDESIGN_PLAN.md`, `docs/bootstrap-to-kit-migration.md` | These docs still name MUI, Liquid Glass, KTIcon or `Glass*`/`WtField` as the standard. `UI_RESOURCES.md` describes `components.json` as `new-york` with `cssVariables: false`; the real file is `base-maia` with `true`. | They contradict ADR-001 and each other, so the guidance an agent gets depends on which file it reads. | Add superseded banners, and rewrite HANDBOOK §3 and the ui README "North star" section to defer to ADR-001 and KitMap. |

### 10.3 Medium

| # | Where | What's wrong and the fix |
|---|---|---|
| W-M1 | `amplify.yml:75-78` + `customHttp.yml` | The SPA rewrite `/<*>` → `/index.html` (200) also catches missing `/assets/*.js`. A tab running the old build gets HTML instead of a 404 after a deploy, and there is no `vite:preloadError` handler. **Fix:** a rewrite regex that excludes file extensions, plus `addEventListener('vite:preloadError', () => location.reload())`. |
| W-M2 | `customHttp.yml` | Both `/assets/**` and `**` set `Cache-Control`, and the security headers exist only under `**`. How Amplify merges overlapping patterns is unconfirmed. **Fix:** `curl -I` one asset and one route in production. |
| W-M3 | `tsconfig.json:50` (`include: ["src"]`), `tsconfig.node.json` | Plain `tsc` doesn't build project references, so `vite`/`vitest`/`playwright` configs, `.storybook`, `scripts/*.ts`, `eslint-rules/*.test.ts` and `e2e/**` are never typechecked. One test file has 4 real errors (`eslint-rules/no-legacy-ui.test.ts:90-91`). `vitest.shims.d.ts` is in no tsconfig, so it does nothing. **Fix:** add `tsc -p tsconfig.node.json` (widened) and `tsc -p e2e` to `type-check`. |
| W-M4 | `tsconfig.node.json` | It is `composite` with no `noEmit`/`emitDeclarationOnly`, so `tsc -b` would emit `vite.config.js`, which Vite resolves before `.ts`. The `tsconfig.node.tsbuildinfo` (71 KB) at the root suggests it has been run. It is also not `strict`. **Fix:** add `emitDeclarationOnly` + `outDir`, and `strict`. |
| W-M5 | `.eslintrc.cjs:294-322, 391` | The react-select override replaces the `no-restricted-imports` paths, so 10 files lose the MUI `Switch`, sweetalert2 and antd bans. The Swal ratchet downgrades the `Switch` ban to a warning in 19 files. Both contradict the file's own comment at lines 69-72 ("can never regress"). **Fix:** repeat the full `paths` list in each override. |
| W-M6 | `.eslintrc.cjs:158,167,171,199,187,1,110,284` | Lint messages tell developers to use MUI `sx`, MUI `<Tooltip>` or `background.paper`, all of which `no-legacy-ui` then bans. The `type=time` message recommends `TimeWheelField`, which no longer exists. The comments say "React 18" and "Radix + Tailwind". **Fix:** point every message at the `src/ds` replacement. |
| W-M7 | `index.html:23` | A render-blocking Google Fonts link (old v1 API, no `display=swap`, no preconnect). Inter is also bundled by the kit and imported again by `main.tsx` and the Metronic scss. It sends the visitor's IP to Google and complicates CSP. **Fix:** remove it (after W-H9). |
| W-M8 | `index.html:40-44` | The pre-paint theme script accepts only `light`/`dark` from the legacy key, but `appearance.ts:170` can write `system`. Users on "system" with a dark OS get a light flash. **Fix:** treat `system` as `matchMedia('(prefers-color-scheme: dark)')` in this one place. |
| W-M9 | `pnpm-workspace.yaml:38`, `package.json` | `puppeteer` is a runtime dependency with `allowBuilds: true`, so every CI and Amplify install downloads Chromium (outside the cached store). Its only users are `.harness/*.cjs`. **Fix:** remove it (with `.harness`), or set `PUPPETEER_SKIP_DOWNLOAD=1`. Set `core-js` and `fontawesome` builds to `false` too. |
| W-M10 | `pnpm-lock.yaml` | Duplicate versions: framer-motion 12.40.0 and 14.7.0, @tanstack/react-table 8 and 9, react-is ×3, clsx ×3, uuid ×3, immer ×3. `@types/chart.js@2.9.37` pulls in `moment`. **Fix:** standardise on `motion` and remove `@types/chart.js`. |
| W-M11 | `public/media/login/WTgif.gif` (3.5 MB, used by `AuthScreen.tsx:22`) | It's deferred behind a still image, but it's still 3.5 MB on the login screen. **Fix:** convert it to WebM/MP4 or animated WebP. |
| W-M12 | `.cursorignore` | The file starts with a UTF-8 BOM, so the first pattern reads `﻿.env` and Cursor may not ignore `.env`. Unconfirmed; the local `.env` holds no keys. **Fix:** re-save without the BOM. |
| W-M13 | `scripts/hooks/run.mjs:205` | Pre-push skips delete refspecs (`localSha === ZERO`), so `git push origin :main` passes the hook. **Fix:** block protected-branch deletes too. GitHub branch protection is the real backstop. |
| W-M14 | `package.json` `lint:ui:baseline`, `scripts/gen-ui-baseline.cjs` | It relies on `;`, `>` and `rm -f`, which break under cmd.exe on Windows (no `script-shell` set). The generator rewrites the list from current lint output, so new offenders get silently baselined, contradicting "the list can only shrink". **Fix:** route it through `gen-rule-baseline.cjs`, which is shrink-only with a `--grow` flag. |
| W-M15 | `scripts/hooks/guard.mjs:23-37, 86, 116, 156-199` | **Patterns missing:** AWS `ASIA…`, OpenAI/Anthropic `sk-`/`sk-proj-`/`sk-ant-`, SendGrid `SG.`, `npm_`, `glpat-`, `GOCSPX-`, Slack webhooks, Azure `AccountKey=`, and generic `password = "…"`. **Files missing:** `.npmrc` with `_authToken`, `credentials.json`, `service-account*.json`. **Allow too loose:** `guard:allow` works anywhere on a line, even inside the secret, with no reason required. **Skip by basename:** any file named `guard.mjs` is skipped. **Self-test:** covers only 2 of 10 rules. **Fix:** add the patterns; require `// guard:allow <reason>`; compare the full path; widen the self-test. |
| W-M16 | `audit:choices`, `push:test`, `test-storybook`, `visual:check` | None of these run in CI. `audit:choices` currently **fails** with 4 violations. **Fix:** add them to the checks job, or drop the claims from the docs. |
| W-M17 | `.github/dependabot.yml:18-21`, `ci.yml:56,154`, `.github/actions/setup/action.yml:11,14` | `directory: /` probably doesn't cover the composite action (not verified against Dependabot's docs), so `setup-node` and `pnpm/action-setup` may never be updated. The third-party actions are pinned by tag. **Fix:** `directories: ["/", "/.github/actions/*"]`, and SHA-pin `pnpm/action-setup`. |
| W-M18 | `src/_metronic` | It's no longer vendored: 575 files have been edited since import, and `premium-layout.css` (1,760 lines, 18 commits) is team code. 23 files are unreachable (`Header.tsx`, `MegaMenu`, `MenuInner*`, `Topbar`, `Aside{Footer,Tabs,Toolbar}`, `aside/Tabs/*`, `Sidebar.tsx`, `help-drawer`, `Languages`, `Dropdown3`, `icons-config`). About 3.6k more lines are exported but never mounted. `partials/widgets` (14.3k lines) is kept alive only by the demo routes. **Fix:** move the live shell into `src/app/shell`, then delete the dead files and the demo routes. |
| W-M19 | `_metronic/assets/sass/_init.scss`, `style.scss`, `style.react.scss` | `_init.scss` emits CSS (leaflet, react-pdf, full-calendar, step-form, `.present`/`.leave`) and both stylesheets import it, so that CSS ships twice. socicon, line-awesome, animate.css and nouislider are loaded globally with zero users. **Fix:** move the CSS out of `_init` and drop the unused vendor imports. |
| W-M20 | `src/main.css` (1,018 lines, 130 `!important`, 89 hex) | The global scrollbar is a hard-coded light track with a navy thumb, so it ignores dark mode and the tenant brand. About 19 selectors are dead (`.loading-shimmer`, `.modal-dropdown*`, `.team-form-container`, …). **Fix:** use tokens and delete the dead rules. |
| W-M21 | `src/shared/form-engine` (`GroupedWizard.tsx` 771 lines, MUI, 50 inline styles), `WtWizardDialog`, `FullscreenWizardModal`, `NewEmployeeWizard`, `LegacyMigrationWizard` | Five wizard implementations, while the kit's Stepper and Form Dialog `sections` have no consumers. **Fix:** rebuild the engine shell on the ds Stepper and Form Dialog. |
| W-M22 | `src/modules/audit/tokens.ts` (static hex palette; about 300 inline styles in the module; `tokens.ts:17` uses the `bi-currency-rupee` icon) | Light-only, ignores the tenant brand, and the icon breaks the "no currency-specific glyph" rule. **Fix:** use kit tokens and the `wallet` icon. |
| W-M23 | `src/components/DateSelector.tsx` (used by 4 screens) | Hard-coded light hex, hover done by mutating `style`, and icon buttons with no `aria-label`. It duplicates the ds Period Navigator. **Fix:** swap to the kit pattern. |
| W-M24 | `src/ds/consistency.test.ts:13` | It scans only `ds/prototypes` and `ds/patterns`, while AGENTS.md says it fails the build on any hand-built button or input. **Fix:** widen its scope or reword the doc. |
| W-M25 | AGENTS.md facts | It says React 18 (actual ^19.3.1), 9 overrides (15), "~2.4k lines" for EntityTablePage (2,725), the Source column bug at `:692` (now `:805-806`), `SummarySection.tsx:135` (now `:152`), `MaterialTableImpl` "84 files" (8 reference the impl, 117 reference `MaterialTable`), and a UI baseline of 286 (263). **Fix:** update the numbers, or drop line numbers in favour of symbol names. |
| W-M26 | Root plans and `docs/` plans | `NEXTJS_MIGRATION_PLAN.md` has been "decision pending" since July, there is no `next` dependency, and it cites a missing file. `MEETING_LIFECYCLE_PLAN.md` is complete. The two `WtChoiceField` plans describe a component that already exists, and one has a passed end date. Five wizard docs are "Proposed 1.0-draft" although the engine is used in 14 files. `docs/COMPANY_PROFILE.md` names hooks that don't exist. **Fix:** archive what's done or abandoned, and keep one current doc per topic. |
| W-M27 | `SETUP.md`, `HOOKS.md` | Both document `VITE_APP_API_URL` and `VITE_APP_OPEN_CAGE_API_KEY`, which nothing reads. Both say pre-push blocks main/develop (the code also blocks master). HOOKS.md mentions a "CI on PR" run, but CI is push-only. **Fix:** correct them. |
| W-M28 | `src/app/pages/employee/tasks/tasks/components/TaskTimesheet.tsx:250,258,266` | It points to `/media/details/*.png`, deleted on 2026-06-16, so the images render broken on a live screen. Another 31 `media/` paths in `src` don't exist in `public/`, mostly in Metronic demo code. **Fix:** replace them with Lucide icons. |

### 10.4 Low

**Repo hygiene**

- **Tracked files `.gitignore` excludes:** `.github/agents/attendance-duration-deduction.agent.md` (a one-off Copilot agent from March), `CLAUDE.md` (needed, so remove its ignore line instead), and `debug-storybook.log`. The `.claude` ignore lines appear 3 times.
- **`.gitattributes`:** the `.githooks/*` rule targets a directory that doesn't exist. `.husky/*` and `*.sh` have no `eol=lf` and check out CRLF. Git Bash copes; dash and WSL don't.
- **One-off and orphan scripts:**
  - `scripts/_patch_mrt_search.mjs` would string-splice `MaterialTableImpl.tsx` between markers that no longer exist (it would throw), and its replacement text has hex and inline styles.
  - `scripts/_probe_mrt.mjs` is a debug print.
  - `scripts/hooks/erase-git-summary.mjs` is referenced nowhere.
  - `.husky/post-commit` starts node for a no-op mode.
  - `.harness/` (puppeteer probes for MUI-era code) is referenced nowhere.

**Scripts and config**

- **Backend copy-paste:**
  - `sync-deps.sh:8` gives a Prisma hint, but this repo has no Prisma.
  - `push.sh:8` and `commit.sh:42` mention "migration drift".
  - `devtools/run.mjs:1` has a "Test comment" line, and its usage string is stale.
- **`package.json`:**
  - `stage`/`gstage` and `dev`/`dev:host` are duplicates, because `vite.config.ts:40` already binds `0.0.0.0`, so `pnpm dev` is LAN-exposed by default.
  - There is no `engines` field and no `.nvmrc`, although pnpm 11 needs Node ≥22.13.
  - `"version": "8.2.4"` is Metronic's.
- **`.npmrc`:** `node-options` is ignored by pnpm 11.
- **`gstage`:** "Choose files…" runs `git reset` first, which discards `git add -p` hunk staging.
- **ESLint rules:**
  - `no-legacy-ui` checks only `className`, so `*ClassName` props, class strings in variables, and `cn()` outside JSX are missed.
  - `tokensOf` ignores the computed `tail` (false positives possible).
  - `no-legacy-icons` misses re-exports, `require` and dynamic imports.
- **Baselines:**
  - UI baseline: 1 stale path out of 263.
  - Legacy-UI baseline: 2 stale paths out of 849.
  - Icon baseline: its header says 585 entries; the real count is 567.
  - Hand-listed override paths that no longer exist: `TimeWheelField.tsx`, `EditMeetingModal.tsx`, `MeetingsForm.tsx`, `AttendanceCalendar.tsx`.
- **cmdk:** the patch still applies; pin `"cmdk": "1.1.1"` exactly. cmdk pulls in about 60 `@radix-ui/*` packages, so "never Radix" doesn't hold at the dependency level.
- **`verify-build-env.mjs:69`:** prints the first 4 and last 2 characters of keys in Amplify logs, and its REQUIRED/RECOMMENDED list is hand-maintained.

**`dist/`**

- It's stale (built Nov 14, 32 MB, 584 files, no sourcemaps) and `vite preview` serves it.
- `/icons` and `/media` are revalidated on every load (`max-age=0`) even though they're `?v=` cache-busted.

**`index.html` and branding**

- `index.html`: a commented-out `react-grab` block, plus Metronic leftovers (`kt_body`, `layout-styles-anchor`, `#root-modals`).
- `theme-color` is `#000000` in `index.html` but `#1e3a8a` in the manifest.
- Three product names: page title "Wisetech MEP…", the manifest's "KAIZNOVA and workforce management" (a find-and-replace artifact), and the service worker's "WiseTech Attendance".
- `WT-logo.ico` is a byte-for-byte copy of `favicon.ico` (16/32 px), shown at 72 px in `main.tsx:278,404` and `HeaderWrapper.tsx:15`, so it renders blurry. Use `icons/pwa-192.png`.

**`public/service-worker.js`**

- `notificationclick` builds `origin + path` from the push payload, so a `@host` path leaves the site.
- `client.navigate()` runs on uncontrolled clients and its promise isn't returned.
- `skipWaiting()` makes the "update available" prompt pointless.
- It registers in dev too.
- The cache name is bumped by hand.
- **Fix:** `new URL(path, origin)` plus an origin check.

**`public/` assets**

- About 331 KB is unreferenced or reachable only from unmounted Metronic code: `patterns/pattern-1.jpg`, `misc/streak.svg`, `misc/pattern-1.jpg`, `misc/bg-2.jpg`, `upgrade.svg`, `taieri.svg`, `svg/files/*`, `infography.svg`, 5 brand logos, and `login/backgroundImage.png`.
- About 77 KB more is used only by the demo routes.

**Docs**

- `README.md` is 19 lines, says "Metronics", and links nothing. Make it an index.
- `docs/multi-tenancy.md` has a BOM and 16 lines of garbled `Γ…` characters. Re-save it as UTF-8.

**e2e**

- Never typechecked.
- Live data isn't masked.
- Baselines don't cover `meetings` or `reimb-*`.
- The README's scope is stale.

**Storybook**

- `ConfirmDialog.stories.tsx` imports MUI without the MUI theme.
- The `wisetech-storybook` MCP server isn't registered in any repo config.

**`src` leftovers**

- **Dead files:**
  - `src/components`: NavContainers (5 files), `reactbits/BlurText`, `reactbits/Particles`, `workspace/components/ModuleStrip`, `workspace/index.ts`.
  - payroll: `StatusBadge`, `ContractBillSection` (293 lines), `normalizePayrollRecord.ts` (329 lines).
  - `src/typeset.css`: unimported, a near-copy of `ds/styles/typeset.css`.
  - `ds/lib/appearance.ts`: imports from the app (a kit → app dependency) and is unused.
  - `ds/prototypes` (1,741 lines): used only by stories.
- **Duplicates:**
  - Title-case logic exists twice (`ds/lib/text.ts:25` and `common/ui/text.ts:49`).
  - Three `useIsMobile`/`useMediaQuery` hooks with different breakpoints (768 vs 991.98), plus 18 files using MUI's.
  - Payroll has two service facades, and `payrollService.ts` calls axios directly with its own `API_URL`.
- **Kit colours:**
  - Hard-coded colours in `ds/ui/button.tsx:22,34,37`, `slider.tsx:51` and `smart-avatar.tsx:239`.
  - `ds/lib/sortable.tsx:160,245`: the `|| '#fff'` fallback never applies (`getComputedStyle` returns `rgba(0,0,0,0)`), so the drag ghost is see-through.
- **Toaster and env:**
  - `App.tsx:229` mounts raw sonner with no `theme`; the theme-aware `ds/ui/sonner.tsx` has no importers.
  - `vite-env.d.ts` declares `VITE_APP_API_URL`, which nothing reads.
- **Tests:**
  - `OrgFilterToolbar.test.tsx` and `useRememberedChoice.test.ts` don't call RTL `cleanup` (vitest globals are off).
  - `tasks/__tests__/taskDomain.test.ts` uses its own `node:test` runner. Switching the import to `vitest` would remove `test:tasks`, the esbuild step and `.task-tests/`.

### 10.5 Test coverage map (166 files)

| Tested well | Thin or indirect | Untested |
|---|---|---|
| `currency`, `safeHtml`, `apiError`, `ctc`, `signOut` (incl. server failure), `dateSort`, `workingDays`, `timeFormat`, `preferences/core`, form-engine (4), common components (44), reimbursement (13), recruitment (8), ds (10), eslint-rules and scripts (5) | `authAbac` (2 cases); `can.ts` (only mocked); `dateFormats.ts` (only through `date-field.test`) | `statistics.ts` (4,087 lines, 73 importers), `AuthHelpers`/`setupAxios`/interceptors, `lib/apiClient.ts`, `leaveAllocation.ts`, `fiscalYearHelper`, all payroll, salary and billing |

There are no `.skip`, `.todo` or `xit` calls and no snapshot-only tests. The only `.only` hits are RuleTester wiring.

### 10.6 Done well outside `src/`

- **CI:** least-privilege `permissions`, `persist-credentials: false`, concurrency with cancel-in-progress, a `blob:none` clone, an audit gate that tolerates registry outages, and a preview smoke test.
- **Amplify:** an env check runs first, `--frozen-lockfile`, the store is cached in the workspace, and an empty `dist` blocks the deploy.
- **devtools:** variables are quoted, there's no `eval`, `reset --hard`, `clean`, stash or force-push, branch names are validated, `GIT_TERMINAL_PROMPT=0` is set, and hooks are never skipped.
- **Ratchets:** `gen-rule-baseline` is shrink-only, the button ratchet is fully burned down (`{}`), and the custom ESLint rules have real RuleTester suites.
- **lint-staged:** batches files for the Windows argument-length limit and checks partially staged files correctly.
- **Service worker:** caches no app code; navigation goes to the network with an offline fallback, and the cache headers are right for immutable assets.
- **e2e fixtures:** frozen clock, seeded randomness, forced theme, animations off, service workers blocked, and login stores no credentials.
- **Storybook:** reuses the Vite config, loads no Metronic CSS, axe failures fail the test, and every public kit component has a story.
- **Accurate docs:** `docs/CI_CD.md`, `docs/BUTTONS.md`, `docs/FUTURE_ENHANCEMENTS.md`, `docs/EXPORT_ARCHITECTURE_AUDIT.md`, KitMap and Introduction are current. ADR-001 clearly states what it supersedes.
- **Kit accessibility** (10 components sampled): every icon-only button has an `aria-label`, `aria-pressed` and `aria-current` are used correctly, rows can be reordered from the keyboard, and there are no clickable `div`s. There is no Radix in `src/ds` itself.

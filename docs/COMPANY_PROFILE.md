# Company Profile: requirements and implementation plan

**Status:** Chunk 0 (API audit) done, see [COMPANY_PROFILE_API_AUDIT.md](COMPANY_PROFILE_API_AUDIT.md).
Chunk 1 (API strategy) approved, see [section 5.4](#54-api-strategy-chunk-1-output).
Chunk 4 (backend: B1 roster in sparse list, B2 projects-only `scope=projects`, B3 `company_types.project_role`) done
2026-11-04. Chunk 2 (frontend data: `useProfileData`, `profileAdapter.ts`) done 2026-11-05, **awaiting approval**.
Next: Chunk 3.
**Estimate:** 7 to 10.5 working days for one developer for the mandatory chunks; up to 13.5 with the
conditional Chunk 4. Delivered in chunks 0 – 8 (Chunk 7 dropped), one at a time, each approved before the next.
**Prototype:** `src/app/modules/company-profile/`, Storybook story **Screens / Company Profile** (`pnpm storybook`).
**Reference:** the existing brochure, *WISETECH MEP Company Profile Rev.27* (73 pages, PowerPoint).

---

## 1. Goal

Generate the company profile as a presentation (16:9 slides) from the app's own data, instead of
maintaining a 73-page PowerPoint by hand. The user picks what each slide shows, presents it full screen
in the app, and exports it as a PDF.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Design source | **Fixed design**: the slides are the app's own React layouts. No PowerPoint template (parked; may be revisited later). |
| Export format | **PDF, 16:9** (1280 × 720 page), always light theme. |
| Export method | **In the browser, like the app's existing Excel / CSV exports** (`ExportButton.tsx`): no server rendering, no backend endpoint. See Chunk 6. |
| Deck size | **Capped at 20 slides** (`MAX_SLIDES`). The default deck is 18. |
| Hardcoded slides | Cover (brand, tagline, four pillars; no numbers), About us (with live totals), Who we are (vision / mission / values), Contact. Text lives in code. |
| Fetched slides | Everything else comes from the app, and shows **only what the user picked**. |
| Project images | Only a project's **Gallery cover** (`Lead.coverImageUrl`). A project without a cover cannot be placed on a slide. |
| Services | From CRM: **`ProjectService`** (with `LeadService` for "N projects" per service). |
| Logos | From Companies: **`Company.logo`**, grouped by company type. |
| Maps | India and World dot maps, drawn from Natural Earth's **India-worldview** boundaries (official Indian depiction). Data is pre-generated in `mapGrid.ts`; no map library, no network. |
| Saving picks | **Not saved.** As in the prototype, picks reset on reload; every visit starts from the default deck. |
| API strategy | **Decided by audit, not upfront.** Existing APIs are reused where they meet the requirements; targeted backend changes or dedicated endpoints are added only for proven gaps (section 5.1). |

## 3. Scope

### In scope (exactly what the Storybook prototype does)

**Builder screen**
- Section list: drag to reorder (shared `ReorderableGroup` + `DragHandle`, arrow keys also work), show / hide, edit, remove.
- A section that spans several slides (projects, the client logo wall) lists each slide under it; each can be hidden on its own (e.g. hide High-rise 3 of 5).
- "Add projects" and "Add logos" buttons.
- "N of 20 slides" badge; turning on a section, saving a picker, or adding is refused past 20.
- Stage with previous / next, slide filmstrip, keyboard navigation (arrows, Home / End, Page Up / Down).
- **Present**: full screen.
- **Export PDF** button.

**Slides**

| Slide | Source | What the user picks | Limit |
|---|---|---|---|
| Cover | Hardcoded text (no counts) | — | — |
| About us | Hardcoded text + **live** numbers (projects, completed, clients, years, team) | — | — |
| Who we are | Hardcoded | — | — |
| Services | CRM `ProjectService` + project counts | Which services, in order | 12 |
| Project slides (any number of sections) | Projects + Gallery cover | Group by category / city / client / architect; which projects (order = slide order, #1 = hero); at least 5 projects; up to 9 per slide (tall hero + portrait tiles in two rows), spread evenly so no slide has fewer than 5 (10 → 5 + 5, 19 → 7 + 6 + 6); caption fields (architect, client, area, status) | Splits into several slides; counts against the 20 cap |
| Our Clients (logo wall) | Companies (logo + company type); architects are one of the groups, no separate slide | Which companies; type filter; group order follows pick order | No cap: groups shelve side by side and overflow onto further slides |
| Repeat clients | Companies + project counts, as a ranked bar chart (logo, count, share of all projects) | Which companies (same picker, "Repeat chart" mode) | 10 |
| India map | Project locations, by city | Which cities get a pin | 40 |
| World map | Project locations, by country (India highlighted) | Which countries get a pin | 40 |
| Contact | Hardcoded | — | — |

Per-project captions: name, city, architect, client, area (lakh sq ft above 1,00,000), and **project
status** (Completed, Ongoing, On Hold, …) in place of the prototype's size line ("40 floors · 140 m").
Project slides also show the section's total project count and its top repeat client
("5 repeat projects · Crescent Group").

### Out of scope

- Saving or naming decks.
- A settings screen for the hardcoded text (it is edited in code).
- Footer on slides, PowerPoint export, PowerPoint template.
- HR "team by department" slide.

## 4. Data contract

The frontend already defines it: **`ProfileData`** in `src/app/modules/company-profile/profile.ts`.
The contract is fixed: whichever API strategy Chunk 1 approves, the data layer must produce exactly
this shape. Every count, badge, map pin and slide split is computed on the frontend from it.

```ts
type ProfileData = {
  org: OrgProfile          // hardcoded copy, supplied by the FRONTEND (content.ts), not the API
  totals: { projects: number; completed: number; clients: number; team: number; countries: number; cities: number; inHomeCity: number }
  projects: ProfileProject[]
  companies: ProfileCompany[]
  services: ProfileService[]
}
```

The data layer supplies `{ totals, projects, companies, services }` (from existing APIs, a dedicated
endpoint, or a mix, per Chunk 1); the frontend adds `org`.

### Where each field comes from

These are the **database sources** of each field. Which API delivers them is decided in Chunks 0 and 1.

| Field | Source |
|---|---|
| `project.id`, `name` | `Lead.id`, `Lead.title` |
| `project.city`, `country`, `lat`, `lng` | `AdditionalDetails.city / country / latitude / longitude` |
| `project.typology`, `tags` | Project **categories**, exactly as the Projects section reads them: every `lead_categories` row, falling back to the old `Lead.projectCategoryId` only when there are none (`categoryIdsOf` in `ProjectListTable.tsx`). A project can have several. How they fill the two fields is set in Chunk 1 (proposal: `tags` = all category names, `typology` = the first one) |
| `project.client` | `ProjectExternalTeam` (the project's External Team card) row whose company type has project role **Client**, else **Builder** → `Company.companyName`. Not `Lead.company`: it is empty on every project (audit G3). Roles: `CompanyType.projectRole`, section 5.4 |
| `project.architect` | `ProjectExternalTeam` row whose company type has project role **Architect** → `Company.companyName` |
| `project.areaSqft` | `AdditionalDetails.builtUpArea` + `builtUpAreaUnit`, parsed and converted to sq ft (free text, see risks) |
| `project.status` | Project status name (`execution.projectStatus`: Completed, Ongoing, …). **Replaces** the prototype's `metric` size line; `CaptionField` `"metric"` becomes `"status"` in Chunk 2 (the one agreed change to the contract) |
| `project.cover` | `Lead.coverImageUrl` (presigned if the bucket is private) |
| `company.logo`, `types` | `Company.logo`; `CompanyCompanyTypeMapping` → `CompanyType.name` |
| `service.projects` | Count of `LeadService` rows over the organization's projects |
| `totals.projects` | Count of the organization's projects |
| `totals.completed` | Projects whose **project status** (`execution.projectStatus`) is Completed |
| `totals.clients` | Distinct client companies (as `project.client` above) over those projects |
| `totals.team` | Active employees of the organization |
| `totals.countries` / `cities` / `inHomeCity` | Cover slide: distinct countries; distinct Indian cities (`normaliseCity`); projects in `org.homeCity` |

**Which leads are projects:** the same rule as the Projects section, nothing from the Leads side.
A lead becomes a project when its status has `LeadStatus.isProjectTrigger` set
(`ProjectTablePage.tsx` filters on it; backend `db/leadKind.ts`). Never test `name === 'Received'`.
Active (`isActive`) and not cancelled, as the Projects section already applies.

**Companies returned:** only those linked to the organization's projects (as client or architect).
That keeps the list scoped and relevant.

**Scoping:** on `organizationId` (with `companyOverviewRepo.getOrgFamilyIds` for org families).
Never `tenantId`; it has no writer. This applies to every API used, existing or new.

---

## 5. Implementation plan

### 5.1 Approach: requirement-driven, frontend-first

We do not commit upfront to reusing existing APIs or to building dedicated Company Profile APIs.
The choice comes from an audit of what the existing APIs actually return.

Decision process:
1. Understand the complete requirements and the `ProfileData` contract.
2. Audit the existing frontend services and backend APIs.
3. Inspect actual responses, backend queries, relationships and permissions.
4. Map every required field to an available API.
5. Evaluate completeness, accuracy, organization scoping, pagination and performance.
6. Decide whether the existing APIs meet the requirements efficiently.
7. Reuse existing APIs wherever they do.
8. Where they do not, name the exact gaps.
9. Close those gaps with targeted backend changes or dedicated APIs, only where genuinely necessary.

The final architecture may use existing APIs only, existing APIs with targeted backend improvements,
dedicated Company Profile APIs, or a combination.

**Architectural rules**
- Do not create a dedicated endpoint just because Company Profile is a separate module.
- Do not force reuse of existing APIs that cannot meet the requirements efficiently.
- Avoid unnecessary backend work and duplicated business logic; reuse existing utilities.
- Prefer the simplest maintainable architecture.
- Keep the `ProfileData` contract stable.
- Keep backend and frontend responsibilities clearly separated.
- Use React Query caching, request deduplication and on-demand fetching; never refetch data already in cache.
- Fetch detailed project metrics in batches when needed, not one request per project.
- Every API used keeps organization-level scoping and authorization.

### 5.2 Execution rules

- Only one chunk is actively implemented at a time; chunks are never combined into one task.
- Each chunk has a clear objective and acceptance criteria (below).
- At the end of each chunk: a summary of changes, files affected, tests performed and outstanding issues.
- Explicit approval is required before the next chunk starts.

### 5.3 Chunks, dependencies and estimates

| # | Chunk | Type | Days | Depends on |
|---|---|---|---|---|
| 0 | Requirements & existing API feasibility audit | Mandatory | 1 – 1.5 | — |
| 1 | API strategy & data architecture | Mandatory | 0.5 – 1 | 0; open questions 1, 2 |
| 2 | Frontend data integration | Mandatory | 1.5 – 2 | 1 |
| 3 | Storybook UI integration | Mandatory | 1.5 – 2 | 2 |
| 4 | Backend improvements | **Conditional** | 0 – 3 | 1 (gaps), 2 – 3 (confirmed in use) |
| 5 | Map coordinates & data preparation | Mandatory | 0.5 – 1 | 0 (only the audit; can be pulled forward) |
| 6 | PDF export (in the browser) | Mandatory | 1 – 1.5 | 3 |
| 7 | ~~Project tags~~ | **Dropped** | 0 | Tags are the existing project categories |
| 8 | Real data testing & optimization | Mandatory | 1 – 1.5 | all chunks taken |
| | **Mandatory total** | | **7 – 10.5** | |
| | **+ Chunk 4** (0 if skipped, ~1 for targeted fixes, up to 3 for a dedicated endpoint) | | **7 – 13.5** | |

How these were estimated:
- **Chunk 0** is mostly reading, but every field must be traced to a response and a query, and permissions checked.
- **Chunks 2 and 3** are smaller than the old "frontend module" estimate suggests on its own, but the data
  mapping (now in Chunk 2) carries the parsing helpers and their tests that used to sit in the backend chunk.
- **Chunk 4** is a range, not a fixed cost: the audit decides it. Likely candidates are small (a missing
  relation in a list query, a slow list query); a full dedicated endpoint is the upper bound.
- **Chunk 6** runs in the browser (print layout + `window.print()`), with no backend, so it dropped from
  2 – 3 days (Puppeteer design) to 1 – 1.5.
- Showing project status instead of the size line removed the per-project metrics fetch, which was the
  most likely reason for Chunk 4.
- Waiting for approval between chunks is **not** included.

Sequence: **0 → 1 → 4 → 2 → 3 → 5 → 6 → 8.** (Chunk 7 dropped. Chunk 4 moved before 2 and is no longer
conditional: Chunk 1 found three gaps, section 5.4.)
Chunk 5 depends only on the audit, so it may be moved earlier (for example between 1 and 2) if approved,
so the maps have data by the time the UI lands. The team's data entry (section 6) runs in parallel throughout.

Suggested calendar (one developer, midpoint estimates; ░ = conditional):

```
Day  1  2  3  4  5  6  7  8  9  10
C0   ███
C1      ██
C2        ██████
C3              ██████
C4                    ░░░              conditional: 0 – 3 days, shown at ~1
C5                       ██
C6                         ████
C8                             ████
```

About 10 days with a ~1-day Chunk 4; without Chunk 4, everything after C3 moves a day earlier.

### Chunk 0: Requirements & existing API feasibility audit (1 – 1.5 days, mandatory)

**Objective:** understand the requirements and find out what the existing code already provides.

Tasks
- Review the complete requirements (sections 1 – 4) and the Storybook prototype, including `ProfileData`.
- Audit existing frontend services and hooks (`src/services/*`).
- Inspect the matching backend routes, handlers, services and repositories.
- Verify actual response structures and relationships (call the endpoints, not only read the code).
- Map every `ProfileData` field to an existing API source.
- Identify missing or incomplete data.
- Evaluate organization scoping, permissions, pagination and performance (payload size and response time
  for about 700 projects).
- Identify reusable utilities and existing business logic (e.g. project filters, status rules, location parsing).
- Document all findings.

Starting points (from an initial look; to be verified, not assumed):
- `getAllLeads` (`services/leadService.ts`, backend `LeadRepository.getAllLeads`): always selects
  `coverImageUrl`; the full include has `company`, `additionalDetails`, `services`, `leadCategories`,
  `execution.projectStatus`, `projectExternalTeams`. Sparse `fields` mode may not include external teams.
- `getAllClientCompanies` (`services/companies.ts`): full include returns `logo` and `companyTypeMappings`.
- `getAllProjectServices`, `getAllProjectCategories` (`services/projects.ts`); `fetchEmployeesPage` (`services/employee.ts`).
- Project status (for the caption and `totals.completed`) comes with the lead list via `execution.projectStatus`.

Deliverable
- An API feasibility report, `docs/COMPANY_PROFILE_API_AUDIT.md`: per field, the file path, function,
  endpoint, response path, and status (available / partial / missing), plus scoping, permission and
  performance notes.

Rules
- Audit only: no application code changes, no new endpoints, no database changes.

Acceptance
- Every `ProfileData` field has a documented source or a documented gap.
- Scoping and permissions are confirmed for each endpoint considered.
- Performance of the main project list is measured on realistic data.

### Chunk 1: API strategy & data architecture (0.5 – 1 day, mandatory)

**Objective:** decide the API strategy from the Chunk 0 findings.

Tasks
- Decide which existing APIs are reused.
- Identify fields that need backend improvements, and whether a dedicated endpoint is justified.
- Define the response structure of any new or changed API.
- Finalize the frontend data flow: which queries, what they return, how they become `ProfileData`.
- Define the React Query strategy: query keys, cache and stale times, deduplication with queries other
  screens already make, what loads up front and what loads on demand.
- Decide where the transformation helpers live (frontend or backend), keeping one implementation only.
- Document the final architecture and dependencies, including whether Chunk 4 is needed and its scope.

Deliverable
- An approved API strategy and implementation design, added to this document (or the audit report).

Rules
- Design only: do not implement the backend or frontend.
- Present the proposed approach and wait for approval.

Acceptance
- Every `ProfileData` field has an approved source.
- Chunk 4 is either marked "skip" or has an explicit, itemized scope.

### 5.4 API strategy (Chunk 1 output)

**Status:** strategy **approved** 2026-11-04 (six existing APIs, `useProfileData()` + `profileAdapter.ts`, G1/G2
before the frontend, nullable coordinates, shared category/service helpers). The clarifications below (G8, G2
consumers, G3 role flag, missing covers) and the final Chunk 4 scope are **awaiting approval**.

| Audit gap | Decision |
|---|---|
| G3 client | Roster row whose type has project role **Client**; else **Builder** (provisional, to revisit). Roles come from a stable flag, not names (see G3 below) |
| G6 cancelled | Project status Cancelled: **kept in totals, left out of picks and slides**. (`Lead.isCancelled` is set on no project, so status is the only rule) |
| G7 organizations | **All organizations the viewer can see**; no extra filter |
| G8 viewer scope | **Same count as the Projects page** (see below): the projects this user can see. No gate, no extra API |

**Architecture: existing APIs only, no dedicated endpoint.** Chunk 4 closes G1, G2 and G3 with small, additive
backend changes.

#### G8: project count, same as the Projects page (decided)

`totals.projects` is counted exactly like the Projects page's total (`ProjectTablePage.tsx:962`,
`tableData.length`): the rows of `getAllLeadsComplete(fields, 'projects')` whose `status.isProjectTrigger` is set,
with no other filter (Cancelled included). That is the deck's source call #1, so the count is just
`rows.length`. No separate count API, no page gate.
- Like the Projects page, it is **the projects this user is allowed to see** (record scope on the server), so it can
  differ between users; for a Read-all user it is the whole organization (787 locally). Accepted.
- The other totals follow the same rows: `completed` and `clients` over that set; slides over it minus Cancelled.
- Rejected along the way: a counts-only endpoint (would copy the client rule onto the server) and the existing
  project-status analytics (need a date range, no organization filter).
- Team total (`fetchAllEmployees`) is already scoped to the viewer's tenant; no change.

#### Sources

All six load in parallel, through **existing** service functions; no new service file:

| # | Call | Gives |
|---|---|---|
| 1 | `getAllLeadsComplete(PROFILE_FIELDS, 'projects')` | projects (sparse) |
| 2 | `getAllClientCompanies(true)` (light) | company name, logo, type ids (`companyTypeId` + `companyTypeMappings`) |
| 3 | `getAllCompanyTypes()` | type tree (`parentTypeId`), to resolve each type to its root |
| 4 | `getAllProjectCategories()` | category names |
| 5 | `getAllProjectServices()` | service names |
| 6 | `fetchEmployeesPage(1, 1, { isActive: true })` | `total` = team |

`PROFILE_FIELDS = ['projectName', 'city', 'category', 'service', 'projectStatus', 'externalTeams']`.
`city` brings the whole `additionalDetails` row (city, country, latitude, longitude, built-up area and unit);
the baseline select always adds `coverImageUrl` and `status`. Expected payload is about 0.9 MB for 787 projects
(the audit's lean shape), against 5.5 MB in full mode.

#### Chunk 4 scope (backend, ~1 day): G1, G2, G3

Runs **before** Chunk 2 (approved). Order: 0 → 1 → 4 → 2 → 3 → 5 → 6 → 8.

**B1. G1: roster in sparse mode.** `db/LeadRepository.ts` `LEAD_FIELD_MAP` gets one key:
`externalTeams: { projectExternalTeams: { where: { isActive: true }, select: { companyId: true, companyTypeId: true }, orderBy: { createdAt: 'asc' } } }`.
The `orderBy` makes "first client row" deterministic: 352 of 605 rostered projects have several rows.
`buildLeadSelect` is exported so a unit test can cover it.

Acceptance
- `fields=…,externalTeams` returns `projectExternalTeams: [{ companyId, companyTypeId }]`, active rows only, oldest first.
- A request without `externalTeams` builds exactly the same Prisma select as before (unit test).

**B2. G2: `scope=projects` returns projects only.** `handlers/clientCompanies.ts` `getAllLeads`: when
`scope=projects`, AND `status: { isProjectTrigger: true }` into `where`. Read-all users then download 787 rows, not 1,437.

Consumers checked (`scope=projects` is sent from exactly two places; no other caller, backend or frontend):

| Consumer | Today | After B2 |
|---|---|---|
| Projects table (`ProjectTablePage.tsx:309`) | Filters `status.isProjectTrigger` in the browser | Same rows, smaller download. Its filter stays as a guard |
| Chart drill-downs (`EntityTablePage.tsx:601`, entity scope project or `receivedOnly`) | Filters `isProjectEntity`, which also accepts a legacy `projectId` | One active lead (legacy `projectId`, non-project status) leaves project drill-downs. It is already absent from the Projects table, from users without Read all, and from the chart counts, so the drill-down now matches them |
| Users without Read all | Server already adds `isProjectTrigger` (`authorize.ts:382`) | Unchanged |
| Leads screens (no `scope`) | — | Unchanged; the new condition only runs for `scope=projects` |

Acceptance
- As a Read-all user, `scope=projects` returns exactly the Projects table's count (787 locally), all with a project-trigger status.
- Without `scope`, the total is unchanged (1,437 locally); a non-Read-all user's result is unchanged.
- The route permission (`projects.view.team`) and `summary` behavior are untouched.

**B3. G3: stable project role on company types.** Company type ids are UUIDs created in the UI, not seeded, so
they differ between environments and cannot be hardcoded. Names are editable. The codebase's answer to the same
problem is a flag on the master row: `LeadStatus.isProjectTrigger` (projects), `FaqCategory.slug` (rename-safe key).
- Column `company_types.project_role` (`VARCHAR(20) NULL`, values `CLIENT` | `BUILDER` | `ARCHITECT`); Prisma
  `projectRole String? @map("project_role")`. Two hand-written, idempotent migrations, one concern each: add the
  column; backfill the three **root** types (`Client (All)`, `Builder`, `Architect (All)`, `parent_type_id IS NULL`,
  active). That backfill is the **only** place names are used, once.
- A type takes the role of the **nearest** self-or-ancestor with one, so sub-types ("Client - Hotel", "Architect
  Landscape") inherit it, and the inactive "Vendor Architect (All)" gets none.
- No API change: `getAllCompanyTypes` already returns every column, and the existing update endpoint passes the
  body through, so the role is settable today. A **Configure UI** for it (a "Project role" select on the company type
  form) is **deferred**: it is only needed when someone adds a new *root* client/architect type.

Acceptance
- Migrations apply cleanly on a copy of the database and are safe to run twice; exactly 3 types are flagged locally.
- `GET company-types` returns `projectRole`; renaming a flagged type keeps its role.
- **Before production apply:** confirm the three root names exist there. After apply, run the check query in the
  backfill's header; fewer than 3 rows means a manual fix, not a silent miss.

**All of Chunk 4:** `pnpm exec tsc --noEmit` clean; `pnpm run test:unit` passes (new `buildLeadSelect` test);
response counts above checked against the local database.

#### Frontend data flow (Chunk 2)

- **One query**, `useProfileData()` in the module: `useQuery({ queryKey: queryKeys.companyProfile(), queryFn })`.
  The `queryFn` runs the six calls with `Promise.all` and returns `toProfileData(raw)` (minus `org`). It uses the app
  defaults from `main.tsx` (5 min stale, 1 h cache, no refetch on focus). No query fetches per project, and none is
  deferred; the default deck needs every source up front.
- **Deduplication with other screens** comes from the services' own `cachedRequest` layer, which the existing screens
  share. No other screen reads these lists through React Query today.
- **PDF export (Chunk 6)** reads the same cached `ProfileData`; it fetches nothing.
- Add `companyProfile: () => ['company-profile']` to `src/lib/queryKeys.ts` (the repo's key factory; no inline key arrays).

#### Transformation: frontend only, one place

`toProfileData` and its helpers live in `src/app/modules/company-profile/profileAdapter.ts`, are pure, and are unit-tested.

| Output | Rule |
|---|---|
| project set | `status.isProjectTrigger`; `totals` count all of them; `projects` drops project status **Cancelled** |
| `typology` / `tags` | category names via `categoryIdsOf`: `tags` = all, `typology` = the first |
| `client` / `architect` | first active roster row whose type's **role** is `CLIENT`, else `BUILDER` / `ARCHITECT` → company name |
| type role | `projectRole` of the nearest self-or-ancestor (walk `parentTypeId`); none → no role |
| `city` | `normaliseCity`: trim, title case, aliases (Bombay → Mumbai, Bangalore → Bengaluru, …) |
| `lat` / `lng` | `Number()` of the Decimal strings; missing → `null` (see contract change below) |
| `areaSqft` | `parseAreaToSqft(value)`: strip commas, `Number()`; not a number ("NA") → undefined. Units are only `sqft` / `SFT` (audit), so no conversion |
| `status` | `execution.projectStatus.name` |
| `companies` | companies on a visible project's roster **as client or architect** only; `types` = root names of the company's own types, " (All)" stripped |
| `services` | every service, `projects` = count of projects whose `serviceIdsOf` includes it |
| `totals.clients` | distinct client company ids |

- `categoryIdsOf` / `serviceIdsOf` are reused, not rewritten. They move from `ProjectListTable.tsx` (a page
  component) into a small shared util, and the table imports them from there. That keeps the deck's chunk free of
  the table's imports.
- **Contract changes** (the agreed one, plus one more for approval):
  1. `metric` → `status` (`ProfileProject`, `CaptionField`), as agreed.
  2. **New:** `lat` / `lng` become `number | null`, and `places()` skips projects without coordinates. 141
     projects have none (until Chunk 5). Left as `number`, a single missing pin would turn a city's averaged
     position into `NaN`.

#### Missing Gallery covers (Chunk 3)

Projects without a cover stay **off the slides** (`partsOf` already filters them). The picker already defaults to
"With cover only", shows covered-less tiles as disabled with a "No Gallery cover" placeholder, and counts covered
projects in its header. With 1 cover in 787 today, three gaps remain, all in Chunk 3:
- **Empty picker:** when a group has no covered project, say so ("No project in High-rise has a Gallery cover
  yet; turn off 'With cover only' to see them all") instead of "No projects match".
- **Uncovered tile:** an accessible reason (`aria-describedby` on the disabled tile) and a link to that project's
  Gallery tab (`/project/:id?tab=gallery`, new tab), so the fix is one click away.
- **Empty section:** a project section with no covered picks produces no slides; its row in the section list shows
  "0 slides · no covers", not nothing. The default deck still adds it, so it fills in as covers are set.

#### Known limits

- A **new root** client/architect type gets no role until one is set (by API today, by the deferred Configure select later).
- Companies are matched to projects by **name** in `projectsOf` (prototype logic, unchanged). Two companies with the
  same name would merge their counts.

### Chunk 2: Frontend data integration (1.5 – 2 days, mandatory)

**Objective:** implement the approved data strategy, producing `ProfileData` from real APIs.

Tasks
- Create or update the Company Profile API service (e.g. `src/services/companyProfile.ts`, axios),
  reusing existing service functions where approved; types from `profile.ts`.
- Implement React Query hooks (e.g. `useProfileData()`), with the approved caching and deduplication.
- Integrate the approved existing or dedicated APIs.
- A single, centralized data adapter where several sources are combined.
- Map responses into `ProfileData`, including the frontend transformations and aggregations
  (totals, service project counts, distinct clients, companies linked to projects).
- Pure transformation helpers (no network, no clock), wherever Chunk 1 places them:
  - `parseAreaToSqft(value, unit)`: free text such as `"2.5 Lacs"`, `"17,000"`, `"1.2 lakh"`, sq m.
  - `normaliseCity(name)`: trim, case, common aliases (Bombay → Mumbai, Bangalore → Bengaluru).
- Replace the `metric` caption with `status` in `profile.ts` (`ProfileProject`, `CaptionField`) and the slides.
- Loading, error and empty states at the data layer.
- Unit tests for the pure transformation helpers.

Acceptance
- The assembled data matches `ProfileData` minus `org`, containing only this organization's data.
- Cancelled and inactive leads are excluded; non-project leads are excluded.
- No duplicate requests for data already in cache; nothing is fetched one request per project.
- `pnpm exec tsc --noEmit` clean; the helper unit tests pass.

**Done (2026-11-05).** `useProfileData(homeCity)` caches the six raw responses under `queryKeys.companyProfile()`
and derives `ProfileData` via `select` (`homeCity` feeds `totals.inHomeCity`; Chunk 3 passes `content.ts`'s).
`categoryIdsOf` / `serviceIdsOf` / `subCategoryIdsOf` now live in `src/utils/leadIds.ts`. `normaliseCity` also
folds the geocoder's "Mumbai Suburban" and the Mumbai localities in the data (Andheri, Mulund, Juhu, Jogeshwari).
Checked on a local-DB dump: 787 projects (784 on slides), 446 completed, 171 clients, 6 countries, 109 Indian
cities, 314 in Mumbai; 53 % of projects get a client, 48 % an architect; adapter runs in ~30 ms.

### Chunk 3: Storybook UI integration (1.5 – 2 days, mandatory)

**Objective:** bring the Storybook prototype into the app, running on real data, with Present mode.

The UI is built. The v2 kit's tokens and Tailwind are already loaded app-wide (`src/main.css`), and the
Gallery (same kit) is live in `EntityDetailPage`, so this is wiring, not porting. **Do not redesign or
rewrite the existing Storybook UI.**

Tasks
- Reuse the existing components and layouts (`CompanyProfileDeck.tsx`, `slides.tsx`, pickers).
- Feed real data through the Chunk 2 hooks.
- `content.ts`: the hardcoded copy (`OrgProfile`: legal name, tagline, about, vision, mission, values,
  pillars, address, phone, website, hero image) taken from the brochure.
- `defaultSections(data)`: the default 18-slide deck, moved out of `fixtures.ts` (same logic:
  `autoPick` for projects, top companies for logos and chart, top places for maps). `fixtures.ts`
  stays for Storybook only.
- Builder, pickers and slide management: reorder, show / hide, edit, remove, per-slide hide, add, 20-slide cap.
- Present mode.
- Page and route **`/company-profile`**, menu entry **CRM → Company Profile** (decided 2026-11-05), after
  Gift Managements in `useNavigation.ts`. Like Gift Managements it has no permission section of its own yet:
  visible with the PSA pack when neither `projects` nor `crm.companies` is blocked (the deck reads both lists;
  the project list's route needs the Projects permission). Role-based access is **deferred** (open question 5);
  until then the page shows what the user's Projects / Companies permissions return, and the project count
  matches their Projects page (section 5.4 G8).
- Loading and error states; empty states when a section has nothing to show (no covers, no logos), including the
  missing-cover picker behavior in section 5.4.
- Project picker grouping: "Tag" becomes "Category" (project categories, see section 4); the default
  deck's project sections use category groups.
- "Export PDF" stays disabled until Chunk 6.

Acceptance
- Every Storybook story's behavior works on real data.
- `pnpm exec tsc --noEmit` clean, `pnpm exec eslint --quiet` on touched files, `pnpm test-storybook` green.

### Chunk 4: Backend improvements (0 – 3 days, conditional)

**Objective:** close only the gaps that Chunks 0 – 3 proved real. **Skip this chunk if the existing
APIs meet every requirement efficiently.**

Possible tasks (only those listed in the approved Chunk 1 scope):
- Missing relations or fields in an existing response (e.g. external teams in a sparse list query).
- Query optimization for the project list.
- Presigned asset URLs with `getPresignedUrl` (`services/s3Service.ts`) if covers or logos are in the
  private bucket and not already presigned.
- A dedicated endpoint, only if justified. If built, it follows the backend layering
  (routes → handlers → services → db), e.g. route `src/routes/companyProfile.ts` mounted in `src/server.ts`,
  handler `src/handlers/companyProfile.ts`, service `src/services/companyProfile/profileService.ts`,
  one Prisma read for projects (around 700 rows; no pagination needed).
- Organization-level isolation and authorization: `protect`, plus the Projects module's view permission
  via `authorize()`, scoped as in section 4.

Rules
- No unnecessary endpoints or database changes.
- Business logic is not duplicated between frontend and backend.

Acceptance
- Each change closes a gap named in Chunk 1, and nothing more.
- Responses contain only this organization's data; cancelled, inactive and non-project leads are excluded.
- `pnpm exec tsc --noEmit` clean; `pnpm run test:unit` passes; backend unit tests for any new pure helpers
  (`src/services/companyProfile/__tests__/`).

### Chunk 5: Map coordinates & data preparation (0.5 – 1 day, mandatory)

**Objective:** projects have coordinates, so the India and World maps are not empty.

Tasks
- Audit missing coordinates (count from Chunk 0).
- If needed, script `scripts/backfill_project_coordinates.ts` with `:dry` and `:apply` package scripts,
  following the existing `scripts/backfill_*.ts` pattern.
- For `AdditionalDetails` rows with a city but no latitude / longitude: geocode each unique
  (city, state, country) once via Nominatim (the free geocoder `SmartLocationPicker` already uses;
  max 1 request per second, identifying User-Agent), then write the coordinates.
- Never overwrite existing coordinates or create duplicate records.
- Dry run prints: projects missing coordinates, unique cities, cities that could not be resolved.
- Verify the resulting map pins in the app.

Acceptance
- Dry run reports counts and changes nothing; apply fills coordinates; a second run finds nothing to do.

### Chunk 6: PDF export (1 – 1.5 days, mandatory)

**Objective:** the Export PDF button turns the current deck into a 16:9 PDF in the browser, like the
app's existing Excel / CSV exports: no server, no backend endpoint, no extra data fetch.

Design
1. **Print layout inside the builder:** a print-only container renders every enabled slide stacked,
   light theme forced, one slide per page; hidden on screen. It uses the data already in the
   React Query cache, so nothing is fetched again. A named page rule in `src/main.css`
   (`@page profile-slide { size: 1280px 720px; margin: 0 }`, plus `print-color-adjust: exact` so
   backgrounds print; `<style>` blocks are lint-banned). Slides are sized in container units, so they
   fill the page without layout changes.
2. **Export PDF button:** waits until every slide image has loaded and `document.fonts.ready`, sets the
   document title to the file name (e.g. "WISETECH Company Profile"), then calls `window.print()`.
3. The user picks **Save as PDF** in the dialog (Chrome and Edge remember the choice), and the file downloads.
4. Error handling: if an image fails to load, export continues and the toast names the slides affected.

Why not a direct download with no dialog: it would mean screenshotting each slide into images and packing
them with jsPDF. That needs a new screenshot library (the codebase avoids those; see `src/utils/svgExport.ts`),
cross-origin cover images on S3 block the screenshot unless the bucket allows CORS, the text stops being
selectable, and file size grows. If one-click download becomes a hard requirement, the server-side
option is Puppeteer (already a backend dependency, `src/services/export/htmlPdfConverter.ts`), which
needs a backend endpoint and a way to pass the deck's data to it.

Acceptance
- PDF has one 16:9 page per slide, light theme, correct images and fonts, selectable text.
- Works in Chrome and Edge; no backend changes.
- Exporting does not trigger any new API request.

### Chunk 7: Project tags (dropped)

**Dropped:** "tags" are the project categories that already exist in the Projects section (a project
can have several), so no new tables are needed. The original design is kept below for reference only.

**Original objective:** the "Tag" grouping in the project picker works (High-rise, Heritage, Green Building,
MOEF / CRZ, Government, International, Mivan).

Tasks
- Two tables, mirroring `LeadCategory`: `project_tags` (id, name, color, is_active, organization_id)
  and `lead_project_tags` (lead_id, tag_id, unique pair). Hand-written migrations
  (`migrate dev --create-only`), idempotent, **one DDL concern per file** (see backend `AGENTS.md`).
- Tag list managed in Projects → Configure (`ProjectConfigure.tsx`).
- Tag field on the project, using the shared `MultiSelectWithInlineCreate` input.
- Include `tags` in the project data source approved in Chunk 1; show the Tag grouping again in the picker.

Acceptance
- Tags can be created, assigned, and grouped by in the picker; migrations apply cleanly on a copy of
  the database.

If dropped: remove "Tag" from `FACETS` in `profile.ts` and set the default deck's High-rise and
Heritage sections to typology groups instead.

### Chunk 8: Real data testing & optimization (1 – 1.5 days, mandatory)

**Objective:** validate the complete Company Profile on production-like data.

Tasks
- Walk every slide and picker; verify project and company selections, grouping and slide splits.
- Check the 20-slide cap in every path.
- Verify totals and project statuses against the Projects section.
- Test organization-level permissions (a user of one organization sees nothing of another's).
- Test map data and pins.
- PDF check: page count, layout, fonts, image quality, file size (target under 15 MB for 18 slides).
- API performance and caching: load time, no duplicate requests.
- Loading, error and empty states.
- Light and dark mode on screen; mobile layout of the builder; accessibility (story tests run axe).
- Fix data issues found (unparsed areas, unknown cities) in the Chunk 2 transformation helpers.

Acceptance
- All of the above pass, or remaining issues are listed with an owner.

---

## 6. Data preparation (your team, in parallel)

A slide can only show what has a cover or a logo. Data entry runs alongside development:

- Set a **Gallery cover** on the projects you want to show (about 100 – 150 showcase projects).
- Upload **company logos** for the clients and architects you want on the logo slides.
- Check the **project status** of showcase projects is up to date (it shows on the captions and the
  "completed" total).
- Check that showcase projects have the right **categories** (they drive the project slide groups).

Estimate: 3 – 5 days of data entry, spread across the build.

## 7. Open questions

| # | Question | Needed before |
|---|---|---|
| 1 | ~~Which leads count as projects; which status means "completed"?~~ **Answered:** same as the Projects section (status with `isProjectTrigger`); completed = project status Completed. Nothing from Leads. | — |
| 2 | ~~Typology source?~~ **Answered:** project categories as the Projects section reads them (link table first, old single field as fallback). | — |
| 3 | ~~Keep Chunk 7 (tags)?~~ **Answered:** tags are the existing project categories; Chunk 7 dropped. | — |
| 4 | ~~Size line on captions?~~ **Answered:** show the project status (Completed, Ongoing, …) instead. No size fields needed. | — |
| 5 | **Access:** which roles can open the Company Profile page? **Deferred**; to be decided later. | Before release |
| 6 | ~~PDF data path?~~ **Answered:** export in the browser, like the existing Excel / CSV exports (Chunk 6). | — |

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Few projects have a Gallery cover | Project slides look thin | Team data entry (section 6); the picker already hides projects without a cover |
| Coordinates missing | Empty maps | Chunk 5 backfill |
| Area and city are free text | Wrong totals or duplicate cities | `parseAreaToSqft` and `normaliseCity` (Chunk 2), fixed further in Chunk 8 |
| Existing list APIs are slow or heavy for about 700 projects | Slow builder load | Measured in Chunk 0; sparse fields, caching, or targeted fixes in Chunk 4 |
| Covers and logos in a private bucket | Broken images on slides and in the PDF | Checked in Chunk 0; presigned URLs in Chunk 4 if needed; export waits for every image |
| Print dialog left on a printer, or margins / background graphics changed | Wrong PDF | `@page` size and zero margin plus `print-color-adjust: exact` in CSS; user picks Save as PDF once and the browser remembers |

## 9. References

- Prototype: `src/app/modules/company-profile/` (`profile.ts` contract and logic with unit tests,
  `slides.tsx`, `CompanyProfileDeck.tsx`, `ProjectPicker.tsx`, `ItemPicker.tsx`, `mapGrid.ts`).
- Shared pieces reused: `ReorderableGroup` / `DragHandle`, v2 kit (`src/ds`), Gallery cover
  (`Lead.coverImageUrl`), `s3Service.ts`, `companyOverviewRepo.getOrgFamilyIds`. Existing in-browser
  export pattern: `src/app/modules/common/components/ExportButton.tsx`.
- Existing APIs to audit (Chunk 0): `src/services/leadService.ts`, `companies.ts`, `projects.ts`,
  `projectPoints.ts`, `employee.ts`; backend `src/db/LeadRepository.ts`, `src/db/ClientCompaniesRepository.ts`.
- Map data: generated once from Natural Earth `ne_10m_admin_0_countries_ind` (public domain);
  regenerate only if the grid resolution changes.

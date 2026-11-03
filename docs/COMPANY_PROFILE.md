# Company Profile: requirements and implementation plan

**Status:** prototype done in Storybook, implementation not started.
**Estimate:** 8 to 12 working days for one developer, delivered in 6 chunks.
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
| Deck size | **Capped at 20 slides** (`MAX_SLIDES`). The default deck is 18. |
| Hardcoded slides | Cover, About us, Who we are (vision / mission / values), Scope of services, Contact. Text lives in code. |
| Fetched slides | Everything else comes from the app, and shows **only what the user picked**. |
| Project images | Only a project's **Gallery cover** (`Lead.coverImageUrl`). A project without a cover cannot be placed on a slide. |
| Services | From CRM: **`ProjectService`** (with `LeadService` for "N projects" per service). |
| Logos | From Companies: **`Company.logo`**, grouped by company type. |
| Maps | India and World dot maps, drawn from Natural Earth's **India-worldview** boundaries (official Indian depiction). Data is pre-generated in `mapGrid.ts`; no map library, no network. |
| Saving picks | **Not saved.** As in the prototype, picks reset on reload; every visit starts from the default deck. |

## 3. Scope

### In scope (exactly what the Storybook prototype does)

**Builder screen**
- Section list: drag to reorder (shared `ReorderableGroup` + `DragHandle`, arrow keys also work), show / hide, edit, remove.
- "Add projects" and "Add logos" buttons.
- "N of 20 slides" badge; turning on a section, saving a picker, or adding is refused past 20.
- Stage with previous / next, slide filmstrip, keyboard navigation (arrows, Home / End, Page Up / Down).
- **Present**: full screen.
- **Export PDF** button.

**Slides**

| Slide | Source | What the user picks | Limit |
|---|---|---|---|
| Cover | Hardcoded text + live totals | — | — |
| About us | Hardcoded text + **live** numbers (projects, completed, clients, years, team) | — | — |
| Who we are | Hardcoded | — | — |
| Services | CRM `ProjectService` + project counts | Which services, in order | 12 |
| Scope of services | Hardcoded | — | — |
| Project slides (any number of sections) | Projects + Gallery cover | Group by typology / tag / city / client / architect; which projects (order = slide order, #1 = hero); 3, 5 or 7 per slide; caption fields (architect, client, area, size) | Splits into several slides; counts against the 20 cap |
| Client logos / Architect logos | Companies (logo + company type) | Which companies; type filter | 24 |
| Repeat clients | Companies + project counts | Which companies (same picker, "Repeat chart" mode) | 10 |
| India map | Project locations, by city | Which cities get a pin | 40 |
| World map | Project locations, by country (India highlighted) | Which countries get a pin | 40 |
| Contact | Hardcoded | — | — |

Per-project captions: name, city, architect, client, area (lakh sq ft above 1,00,000), size line
("40 floors · 140 m", "150 beds", "85 rooms"). Project slides also show the section's total project
count and its top repeat client ("5 repeat projects · Crescent Group").

### Out of scope

- Saving or naming decks.
- A settings screen for the hardcoded text (it is edited in code).
- Footer on slides, PowerPoint export, PowerPoint template.
- HR "team by department" slide.

## 4. Data contract

The frontend already defines it: **`ProfileData`** in `src/app/modules/company-profile/profile.ts`.
The backend returns exactly this shape; every count, badge, map pin and slide split is computed on the
frontend from it.

```ts
type ProfileData = {
  org: OrgProfile          // hardcoded copy, supplied by the FRONTEND (content.ts), not the API
  totals: { projects: number; completed: number; clients: number; team: number }
  projects: ProfileProject[]
  companies: ProfileCompany[]
  services: ProfileService[]
}
```

The API returns `{ totals, projects, companies, services }`; the frontend adds `org`.

### Where each field comes from

| Field | Source |
|---|---|
| `project.id`, `name` | `Lead.id`, `Lead.title` |
| `project.city`, `country`, `lat`, `lng` | `AdditionalDetails.city / country / latitude / longitude` |
| `project.typology` | `ProjectCategory.name` (see open question 2) |
| `project.tags` | Chunk 5 (empty array until then) |
| `project.client` | `Lead.company.companyName` |
| `project.architect` | `ProjectExternalTeam` row whose company type is Architect → `Company.companyName` |
| `project.areaSqft` | `AdditionalDetails.builtUpArea` + `builtUpAreaUnit`, parsed and converted to sq ft (free text, see risks) |
| `project.metric` | `ProjectPointValue` for the size masters (floors, height, beds, rooms, site area, units), formatted into one line |
| `project.cover` | `Lead.coverImageUrl` (presigned if the bucket is private) |
| `company.logo`, `types` | `Company.logo`; `CompanyCompanyTypeMapping` → `CompanyType.name` |
| `service.projects` | Count of `LeadService` rows over the organization's projects |
| `totals.projects` | Count of the organization's projects |
| `totals.completed` | Projects in the "completed" status (open question 1) |
| `totals.clients` | Distinct `Lead.companyId` over those projects |
| `totals.team` | Active employees of the organization |

**Which leads are projects:** active (`isActive`), not cancelled, and past the project trigger
(`LeadStatus.isProjectTrigger`, never `name === 'Received'`). Exact rule is open question 1.

**Companies returned:** only those linked to the organization's projects (as client or architect).
That keeps the list scoped and relevant.

**Scoping:** on `organizationId` (with `companyOverviewRepo.getOrgFamilyIds` for org families).
Never `tenantId`; it has no writer.

---

## 5. Implementation chunks

Each chunk is shippable and testable on its own.

| # | Chunk | Days | Depends on |
|---|---|---|---|
| 1 | Backend data endpoint | 2.5 – 3 | — |
| 2 | Map coordinates backfill | 0.5 – 1 | — |
| 3 | Frontend module in the app | 2 – 2.5 | 1 (can start against demo data) |
| 4 | Export PDF | 2 – 2.5 | 1, 3 |
| 5 | Project tags (optional) | 1.5 – 2 | 1, 3 |
| 6 | Testing with real data | 1 – 1.5 | all |
| | **Total** | **9.5 – 12.5** (without chunk 5: **8 – 10.5**) | |

Suggested calendar (one developer):

```
Day  1  2  3  4  5  6  7  8  9  10 11 12
C1   ████████
C2           ██
C3              ███████
C4                     ███████
C5                            ██████        (optional)
C6                                  ████
```

### Chunk 1: Backend data endpoint (2.5 – 3 days)

**Goal:** `GET /api/company-profile` returns `{ totals, projects, companies, services }` for the
caller's organization.

Tasks
- Route `src/routes/companyProfile.ts`, mounted in `src/server.ts`; handler `src/handlers/companyProfile.ts`;
  service `src/services/companyProfile/profileService.ts` (layering: routes → handlers → services → db).
- One Prisma read for projects with the relations above (around 700 rows; no pagination needed).
- Pure helpers in `src/services/companyProfile/profileData.ts` (no Prisma, no clock):
  - `parseAreaToSqft(value, unit)`: free text such as `"2.5 Lacs"`, `"17,000"`, `"1.2 lakh"`, sq m.
  - `normaliseCity(name)`: trim, case, common aliases (Bombay → Mumbai, Bangalore → Bengaluru).
  - `formatMetric(points)`: project points → "40 floors · 140 m".
- Unit tests for the helpers in `src/services/companyProfile/__tests__/`.
- Presign cover and logo URLs with `getPresignedUrl` (`services/s3Service.ts`) if they are in the private bucket.
- Auth: `protect`, plus the Projects module's view permission via `authorize()`.

Acceptance
- Response matches `ProfileData` minus `org`; only this organization's data.
- Cancelled and inactive leads are excluded; non-project leads are excluded.
- `pnpm exec tsc --noEmit` clean; `pnpm run test:unit` passes.

### Chunk 2: Map coordinates backfill (0.5 – 1 day)

**Goal:** projects have coordinates, so the maps are not empty.

Tasks
- Script `scripts/backfill_project_coordinates.ts` with `:dry` and `:apply` package scripts, following
  the existing `scripts/backfill_*.ts` pattern.
- For `AdditionalDetails` rows with a city but no latitude / longitude: geocode each unique
  (city, state, country) once via Nominatim (the free geocoder `SmartLocationPicker` already uses;
  max 1 request per second, identifying User-Agent), then write the coordinates.
- Dry run prints: projects missing coordinates, unique cities, cities that could not be resolved.

Acceptance
- Dry run reports counts and changes nothing; apply fills coordinates; a second run finds nothing to do.

### Chunk 3: Frontend module in the app (2 – 2.5 days)

**Goal:** the builder runs in the app on real data, with Present mode.

The UI is built. The v2 kit's tokens and Tailwind are already loaded app-wide (`src/main.css`), and the
Gallery (same kit) is live in `EntityDetailPage`, so this is wiring, not porting.

Tasks
- `src/services/companyProfile.ts` (axios) and a React Query hook; types from `profile.ts`.
- `content.ts`: the hardcoded copy (`OrgProfile`: legal name, tagline, about, vision, mission, values,
  scope, address, phone, website, hero image) taken from the brochure.
- `defaultSections(data)`: the default 18-slide deck, moved out of `fixtures.ts` (same logic:
  `autoPick` for projects, top companies for logos and chart, top places for maps). `fixtures.ts`
  stays for Storybook only.
- Page and route (for example `/company-profile`), menu entry, section access (Access UI /
  `scripts/setup_section_access.ts` in the backend).
- Loading and error states; empty states when a section has nothing to show (no covers, no logos).
- Hide the "Tag" grouping in the project picker while no project has tags (until chunk 5).
- "Export PDF" stays disabled until chunk 4.

Acceptance
- Every Storybook story's behavior works on real data.
- `pnpm exec tsc --noEmit` clean, `pnpm exec eslint --quiet` on touched files, `pnpm test-storybook` green.

### Chunk 4: Export PDF (2 – 2.5 days)

**Goal:** one click downloads the current deck as a 16:9 PDF, pixel-identical to the screen.

Design
1. **Print page** (frontend route, for example `/company-profile/print`): renders every enabled slide
   stacked, light theme forced, one slide per page. A named page rule in `src/main.css`
   (`@page profile-slide { size: 1280px 720px; margin: 0 }`; `<style>` blocks are lint-banned).
   Slides are sized in container units, so they fill the page without layout changes. It sets
   `window.__PROFILE_READY__ = true` once every image has loaded. This page also works with the
   browser's own Print → Save as PDF, which is the fallback.
2. **Export request:** the builder POSTs its current sections (picks are not saved) to
   `POST /api/company-profile/export`. The backend stores them in Redis under a random single-use
   token (around 2 minutes TTL).
3. **Render:** Puppeteer opens `FRONTEND_URL/company-profile/print?token=…`; the print page loads the
   sections and data by token; Puppeteer waits for `__PROFILE_READY__` and fonts, then prints.
4. **Converter:** extend the shared `src/services/export/htmlPdfConverter.ts` (currently hardcodes
   `format: 'A4'` and takes an HTML string): add a URL input and a page-size option (1280 × 720,
   `printBackground`, `preferCSSPageSize`). Share the existing Chromium launch logic; do not fork the file.
5. Stream the PDF back as a download.

Acceptance
- PDF has one 16:9 page per slide, light theme, correct images and fonts, selectable text.
- A token works once and expires.
- Works locally and on EC2 (Chromium path already handled by the converter).

### Chunk 5: Project tags, optional (1.5 – 2 days)

**Goal:** the "Tag" grouping in the project picker works (High-rise, Heritage, Green Building,
MOEF / CRZ, Government, International, Mivan).

Tasks
- Two tables, mirroring `LeadCategory`: `project_tags` (id, name, color, is_active, organization_id)
  and `lead_project_tags` (lead_id, tag_id, unique pair). Hand-written migrations
  (`migrate dev --create-only`), idempotent, **one DDL concern per file** (see backend `AGENTS.md`).
- Tag list managed in Projects → Configure (`ProjectConfigure.tsx`).
- Tag field on the project, using the shared `MultiSelectWithInlineCreate` input.
- Include `tags` in the chunk 1 response; show the Tag grouping again in the picker.

Acceptance
- Tags can be created, assigned, and grouped by in the picker; migrations apply cleanly on a copy of
  the database.

If dropped: remove "Tag" from `FACETS` in `profile.ts` and set the default deck's High-rise and
Heritage sections to typology groups instead.

### Chunk 6: Testing with real data (1 – 1.5 days)

- Walk every slide and picker on production-like data; check the 20-slide cap in every path.
- PDF check: page count, image quality, file size (target under 15 MB for 18 slides).
- Light and dark mode on screen; mobile layout of the builder; accessibility (story tests run axe).
- Fix data issues found (unparsed areas, unknown cities) in the chunk 1 helpers.

---

## 6. Data preparation (your team, in parallel)

A slide can only show what has a cover or a logo. Data entry runs alongside development:

- Set a **Gallery cover** on the projects you want to show (about 100 – 150 showcase projects).
- Upload **company logos** for the clients and architects you want on the logo slides.
- Fill **size fields** (floors, height, beds, rooms, site area, units) as project custom fields
  (`ProjectPointMaster`, NUMBER type) on showcase projects.
- After chunk 5: tag projects.

Estimate: 3 – 5 days of data entry, spread across the build.

## 7. Open questions (answer before chunk 1)

1. **Which leads count as projects, and which status means "completed"** for the live totals?
2. **Typology source:** `Lead.projectCategoryId`, or the `LeadCategory` link table? (Two sources of one fact today.)
3. **Keep chunk 5 (tags)?** Without it, grouping is by typology, city, client and architect only.
4. **Size fields:** confirm the names of the project custom fields to create.
5. **Access:** which roles can open the Company Profile module?

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Few projects have a Gallery cover | Project slides look thin | Team data entry (section 6); the picker already hides projects without a cover |
| Coordinates missing | Empty maps | Chunk 2 backfill |
| Area and city are free text | Wrong totals or duplicate cities | `parseAreaToSqft` and `normaliseCity`, fixed further in chunk 6 |
| Covers and logos in a private bucket | Broken images in the PDF | Presigned URLs in chunk 1; Puppeteer waits for every image |
| Puppeteer cannot reach the frontend URL from the server | Export fails | Configure `FRONTEND_URL`; browser Save as PDF on the print page is the fallback |

## 9. References

- Prototype: `src/app/modules/company-profile/` (`profile.ts` contract and logic with unit tests,
  `slides.tsx`, `CompanyProfileDeck.tsx`, `ProjectPicker.tsx`, `ItemPicker.tsx`, `mapGrid.ts`).
- Shared pieces reused: `ReorderableGroup` / `DragHandle`, v2 kit (`src/ds`), Gallery cover
  (`Lead.coverImageUrl`), `htmlPdfConverter.ts`, `s3Service.ts`, `companyOverviewRepo.getOrgFamilyIds`.
- Map data: generated once from Natural Earth `ne_10m_admin_0_countries_ind` (public domain);
  regenerate only if the grid resolution changes.

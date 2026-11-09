# Company Profile: API feasibility audit (Chunk 0)

**Date:** 2026-11-04. **Scope:** read-only. No application code, endpoints or database were changed.
**Plan:** [COMPANY_PROFILE.md](COMPANY_PROFILE.md). **Contract:** `ProfileData` in `src/app/modules/company-profile/profile.ts`.

## 1. Verdict

- **Every `ProfileData` field can be filled from existing APIs.** No dedicated Company Profile endpoint is needed.
- **Two small backend gaps** would make it efficient (section 7, G1 and G2). Each is about one line in an
  existing file, so Chunk 4 would be roughly half a day.
- **One serious data gap:** only **1 of 787** projects in the local database has a Gallery cover. A project
  without a cover cannot go on a slide, so project slides are empty until covers are set (section 6 of the plan).
- **The plan's client source is wrong:** `Lead.company_id` is empty on every project. Clients and
  architects live on the project's external team roster (G3).

## 2. Data snapshot (local database `localhost/crm`)

Measured with read-only Prisma counts. Production showed 793 projects on the same day, so this copy is close
but slightly older; recheck the cover and logo counts on production.

| Measure | Count |
|---|---|
| Active leads | 1,437 |
| Projects (active, status with `isProjectTrigger`) | 787 |
| Projects with a Gallery cover (`coverImageUrl`) | **1** |
| Projects with `lead.company_id` set | **0** |
| Projects with an active external team roster (`project_external_teams`) | 605 |
| Projects with lead-stage teams (`lead_teams`) | 473 |
| Projects with categories (`lead_categories`) | 770 (none rely on the old single field) |
| Projects with services (`lead_services`) | 771 |
| Projects with a city | 783 (119 distinct cities) |
| Projects with latitude + longitude | 646 (141 missing, same as the Projects page "Missing address 141") |
| Projects with a country | 648 (139 missing; India 628, DR Congo 15, Kenya 2, Guinea, Bhutan, Iraq 1 each) |
| Projects with a built-up area | **101** with a number (corrected in Chunk 2: of the 778 non-null values, 676 are empty strings); units `sqft` 749, `SFT` 38; one "NA" |
| Project status | Completed 446, On Ongoing 301, Partly Completed 23, On Hold 14, Cancelled 3 |
| Projects by organization | WISETECH MEP CONSULTANTS Pvt. Ltd. 780, WISETECH AND ASSOCIATES 7 (4 organizations exist) |
| Companies | 839, of which 232 have a logo |
| Companies on any project roster | 305, of which 142 have a logo |
| Employees | 69, of which 37 active |

Roster rows by company type (active, on projects): Architect (All) 515, Builder 368, Client (All) 206,
Consultant (All) 140, Client 26, Architect 21, vendor types 68, no type 15, others 4.

## 3. Existing APIs considered

| Data | Frontend function | Endpoint | Backend | Auth | Scoping | Paging | Client cache |
|---|---|---|---|---|---|---|---|
| Projects | `getAllLeads` / `getAllLeadsComplete(fields, 'projects')` (`services/leads.ts`) | `GET api/lead-project-companies/client-companies/leads?scope=projects` | `handlers/clientCompanies.ts` `getAllLeads` → `db/LeadRepository.ts` `getAllLeads` | `protect` + `authorize('projects.view.team')` when `scope=projects` | `isActive`; non-admins limited to their org family; project record rule (section 5) | `pageSize` ≤ 1000 (helper uses 500 and fetches the rest in parallel) | `cachedRequest`, in-flight dedupe only (TTL 0) |
| Companies + logos | `getAllClientCompanies(light)` (`services/companies.ts`) | `GET api/lead-project-companies/client-companies?light=true` | `handlers/clientCompanies.ts` `getAllClientCompanies` → `db/ClientCompaniesRepository.ts` `getAll` | `protect` only | none: companies are a shared master (no `organizationId` on `Company`) | up to 10,000 | `cachedRequest`, `MUTABLE_TTL` |
| Company type names | `getAllCompanyTypes` (`services/companies.ts`) | company types list | — | not checked | shared master | all | — |
| Categories | `getAllProjectCategories` (`services/projects.ts`) | project categories list | — | used by the Projects page | shared master | all | `cachedRequest` |
| Services | `getAllProjectServices` (`services/projects.ts`) | project services list | — | used by the Projects page | shared master | all | `cachedRequest` |
| Project statuses | `getAllProjectStatuses` (`services/projects.ts`) | project statuses list | — | used by the Projects page | shared master | all | `cachedRequest` |
| Team total | `fetchEmployeesPage(1, 1, { isActive: true })` (`services/employee.ts`) | `GET api/employee/all?isActive=true&page=1&limit=1` | `routes/employees.ts` `/all` → `fetchAllEmployees` | `protect` only | not checked | yes; `total` read from one row | none |

Covers and logos are **public bucket URLs** (`publicUrlForKey` in `handlers/projectMedia.ts`), so no
presigning is needed; they already render in the Projects table and Gallery.

React Query (`@tanstack/react-query` 5) is installed and used in 92 files; the CRM services above use the
app's own `cachedRequest` (`services/_requestCache.ts`) for in-flight dedupe and short TTLs.

## 4. Field mapping

The project list can be fetched in **sparse mode** (`fields=…`, only what those columns need) or **full
mode** (no `fields`, the heavy list-view include).

| `ProfileData` field | Source in the existing response | Status | Notes |
|---|---|---|---|
| `project.id`, `name` | `lead.id`, `lead.title` (sparse key `projectName`) | Available | |
| `project.cover` | `lead.coverImageUrl` (always selected) | Available | **Data gap:** 1 of 787 set (G4) |
| `project.city` | `additionalDetails.city` (sparse key `city`) | Available | Free text; normalise case and aliases |
| `project.country` | `additionalDetails.country` | Partial | 139 missing (G5) |
| `project.lat`, `lng` | `additionalDetails.latitude / longitude` | Partial | 141 missing (Chunk 5). Prisma `Decimal` arrives as a string; convert with `Number()` |
| `project.typology`, `tags` | `leadCategories[].category.id` + `getAllProjectCategories` for names; reuse `categoryIdsOf` (`ProjectListTable.tsx`) | Available | 17 projects have no category |
| `project.client` | `projectExternalTeams[]` rows whose company type is a client type → company name from the companies list | **Gap (G1, G3)** | `lead.company` is empty everywhere. Roster is in full mode only |
| `project.architect` | `projectExternalTeams[]` rows whose type is under "Architect (All)" | **Gap (G1)** | Same as above |
| `project.areaSqft` | `additionalDetails.builtUpArea` + `builtUpAreaUnit` | Available | Clean: `Number(value.replace(/,/g, ''))`; `SFT` = sq ft; "NA" → empty |
| `project.status` | `execution.projectStatus.name` (sparse key `projectStatus`) | Available | |
| `company.id`, `name`, `logo` | companies list (`light=true` keeps every scalar, `logo` included) | Available | 142 of the 305 project companies have a logo |
| `company.types` | `companyTypeMappings[].companyTypeId` + `companyTypeId`, names from `getAllCompanyTypes` | Available | Types are a tree (`parentTypeId`); group by root ("Client (All)", "Architect (All)", "Builder") |
| `service.id`, `name` | `getAllProjectServices` | Available | |
| `service.projects` | count of `lead.services[].serviceId` over the projects; reuse `serviceIdsOf` | Available | Computed on the frontend |
| `totals.projects` | number of project rows | Available | Depends on viewer (section 5) |
| `totals.completed` | rows whose `execution.projectStatus.name` is Completed | Available | 446 locally |
| `totals.clients` | distinct client companies over the projects | Available after G3 | |
| `totals.team` | `total` from the employee list with `isActive=true` | Available | 37 locally |

## 5. Scoping and permissions

- **Projects list, `scope=projects`:** route gate `projects.view.team`. The record rule
  (`middlewares/authorize.ts` `applyRecordScope` → `services/recordScope.ts` `projectScopeWhere`):
  - **Projects Read all** (and Admins): no restriction. The server returns **every active lead**, projects
    and non-projects, and the browser filters on `status.isProjectTrigger` (as `ProjectTablePage.tsx` does).
  - **Otherwise:** only projects whose internal team or project managers include the user, already
    filtered to `isProjectTrigger` on the server.
  - So **the deck's totals depend on who opens it.** A team member sees only their projects and smaller
    totals. This ties into the deferred access decision (plan, open question 5).
- **Organization:** non-admins are limited to their org family (`getTenantFamilyIds`); Admins see all
  organizations. Two organizations have projects (780 + 7). An `organizationIds` filter already exists.
- **Companies:** no organization column; the list is a shared master open to any signed-in user
  (it is a "relationship view", unscoped). The deck must keep only companies linked to the visible projects,
  which the frontend can do from the roster.
- **Money:** `guardMoney` strips commercial fields per the Commercials permission. The deck uses no money
  fields (area comes from `additionalDetails`), so this does not affect it.

## 6. Performance

Prisma timings on the local database (query only; HTTP, JSON transform and gzip not included):

| Shape | Rows | Time | JSON size |
|---|---|---|---|
| Full include, all active leads (what a Read-all user downloads today) | 1,437 | 623 ms | 5.5 MB |
| Lean select with the roster, all active leads | 1,437 | 188 ms | 1.3 MB |
| Lean select with the roster, projects only | 787 | 149 ms | 0.86 MB |

The full shape is about 6× larger than needed. Sparse mode gets close to the lean shape, but it lacks the
roster (G1) and, for Read-all users, still returns non-project leads (G2).

## 7. Gaps and decisions for Chunk 1

Decided in Chunk 1: see [COMPANY_PROFILE.md section 5.4](COMPANY_PROFILE.md#54-api-strategy-chunk-1-output).

| # | Gap | Options | Suggested |
|---|---|---|---|
| G1 | Sparse mode has no external team roster, which is needed for client and architect | (a) full mode: 5.5 MB; (b) add one `externalTeams` entry to `LEAD_FIELD_MAP` in `db/LeadRepository.ts` (`projectExternalTeams: { where: { isActive: true }, select: { companyId, companyTypeId } }`) | (b), Chunk 4 |
| G2 | `scope=projects` returns non-project leads to Read-all users | (a) keep filtering in the browser; (b) in `getAllLeads`, add `status.isProjectTrigger: true` when `scope=projects` | (b), Chunk 4. It also shrinks the Projects page's own download |
| G3 | Plan's client source (`Lead.company`) is never filled | Client = roster rows whose company type is under **Client (All)**; decide whether **Builder** (368 rows) also counts as a client | Needs your decision |
| G4 | Covers: 1 of 787 projects | Data entry (plan section 6); confirm the production count | Team action, blocking for project slides |
| G5 | Country missing on 139 projects, coordinates on 141 | Chunk 5 backfill can fill both from the city | Chunk 5 |
| G6 | 3 projects are Cancelled | Include in totals (as the Projects page does) or exclude | Suggest: exclude from picks, keep the Projects page count for totals |
| G7 | Two organizations have projects | Deck covers all visible organizations, or only the main one | Needs your decision |
| G8 | Totals depend on the viewer (section 5) | Accept until access is decided, or show the deck only to Projects Read-all users | Decide with the deferred access question |

Not gaps, but simplifications found:
- Area values are clean, so `parseAreaToSqft` is a few lines, not a free-text parser.
- Covers and logos are public URLs, so no presigning work.
- Category, service and project-number rules already exist (`categoryIdsOf`, `serviceIdsOf`,
  `projectNumberOf`) and must be reused, not rewritten.
- The Companies list already counts a company's projects via the roster (`projectTotalsByCompany`);
  the repeat-client chart should follow the same link rule so the numbers match the Companies screen.

## 8. Reusable code

| What | Where |
|---|---|
| Fetch every page of leads in parallel | `getAllLeadsComplete` (`services/leads.ts`) |
| Project rule (`isProjectTrigger`) | `ProjectTablePage.tsx`; backend `db/leadKind.ts` |
| Category / service / sub-category ids | `categoryIdsOf`, `serviceIdsOf`, `subCategoryIdsOf` (`pages/employee/projects/table/ProjectListTable.tsx`) |
| Project number | `projectNumberOf` (`entity/entityUtils.ts`) |
| Request dedupe and TTL cache | `cachedRequest` (`services/_requestCache.ts`) |
| Company ↔ project link rule | `projectTotalsByCompany` (backend `db/LeadRepository.ts`) |
| Org family | `getTenantFamilyIds` / `companyOverviewRepo.getOrgFamilyIds` |

## 9. Preliminary direction (for Chunk 1 to confirm)

Existing APIs only, plus G1 and G2 as two targeted backend changes (Chunk 4, about half a day). On the
frontend, one hook loads, in parallel: the lean project list, companies (light), company types, categories,
services and the active employee total. It maps them into `ProfileData` in one adapter. No dedicated endpoint.

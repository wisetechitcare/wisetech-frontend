# `companyId` → `organizationId` for branches, departments, designations and holidays

**Status:** backend done (branch `feat/nest-employees`, commit `a5d1996f`). **Frontend work needed before these screens work again.**

## What happened, in short

On four kinds of records, the field that says **which organization owns the record** was called `companyId`.
That name was confusing, because a **Company** in this app is a *client* (the CRM `Company`), not us.
The database had already renamed the column to `organization_id`. The backend API now uses the same name.

| Record | Old field | New field |
|---|---|---|
| Branch | `companyId` | `organizationId` |
| Department | `companyId` | `organizationId` |
| Designation (job profile) | `companyId` | `organizationId` |
| Holiday (the master list on the Holidays page) | `companyId` | `organizationId` |

**Not changed:** public holidays (the dated calendar rows: `IPublicHoliday`, `IPublicHolidayUpdate`), employees, working methods, sources of hire, employee types, FAQs, CRM companies and client branches. Those still use `companyId`.

There is **no compatibility layer**. A screen that still sends `companyId` to these endpoints gets a **400 "Organization id is required"**. A screen that still reads `x.companyId` from these rows gets `undefined`. That usually means an **empty dropdown with no error**, which is the part that's easy to miss.

## Exactly what changed in the API

### Requests (what you send)

| Endpoint | Before | Now |
|---|---|---|
| `POST /api/company/branches` | `{ branches: [{ …, companyId }] }` | `{ branches: [{ …, organizationId }] }` |
| `PUT /api/company/branch/:branchId` | `companyId` (optional, moves the branch) | `organizationId` |
| `POST /api/company/departments` | `{ departments: [{ …, companyId }] }` | `{ departments: [{ …, organizationId }] }` |
| `PUT /api/company/department/:departmentId` | `companyId` (required) | `organizationId` (required) |
| `POST /api/company/designations` | `{ designations: [{ …, companyId }] }` | `{ designations: [{ …, organizationId }] }` |
| `PUT /api/company/designations/:designationId` | `companyId` (required) | `organizationId` (required) |
| `POST /api/company/holiday` | `companyId` (required) | `organizationId` (required) |
| `PUT /api/company/holiday-options?id=` | `companyId` (optional) | `organizationId` |
| `POST /api/company/holidays/generate-year` | `{ year, companyId, … }` | `{ year, organizationId, … }` |
| `GET /api/company/holidays` | `?companyId=…` | `?organizationId=…` |
| `GET /api/company/branches`, `/departments`, `/designations` | optional `?companyId=` narrow | optional `?organizationId=` narrow (the app doesn't send it today) |

### Responses (what you read)

| Endpoint | Before | Now |
|---|---|---|
| `GET /api/company/branches` | `branch.companyId`, `branch.company.name` | `branch.organizationId`, `branch.organization.name` |
| `GET /api/company/departments` | `department.companyId` | `department.organizationId` |
| `GET /api/company/designations` | `designation.companyId` | `designation.organizationId` |
| `GET /api/company/holidays` | `holiday.companyId` | `holiday.organizationId` |
| `GET /api/company/leave-options` | `option.branch.company.name` | `option.branch.organization.name` |
| `GET /api/company/overview/tree` | `org.branches[].companyId` | `org.branches[].organizationId` |
| `GET /api/recruitment/branches` | `companyId`, `companyName` | `organizationId`, `organizationName` |
| Anything that returns a full branch, department, designation or holiday row (e.g. `GET /api/company/branch/:id`) | `companyId` | `organizationId` |

## Checklist: every place in this repo

I found these with a search of `src/`. Tick each one. Line numbers are from today and may drift a little.

### Types
- [ ] `src/models/company.ts:22` `IHoliday.companyId` → `organizationId`
- [ ] `src/models/company.ts:104` `IOrgBranchNode.companyId` → `organizationId`
- [ ] `src/models/company.ts:191` `ICompanyDepartment.companyId` → `organizationId`
- [ ] `src/models/company.ts:200` `ICompanyDesignation.companyId` → `organizationId`
- [ ] `src/services/recruitment.ts:105` `RecruitmentBranch { companyId, companyName }` → `{ organizationId, organizationName }`
- [ ] Leave alone: `IPublicHoliday` (`:9`), `IPublicHolidayUpdate` (`:276`), `ICompanyEmployeeTypeUpdate`, `IFaqs`, `IConfiguration`.

### Services
- [ ] `src/services/company.ts:127` `generateHolidaysForYear` payload type: `companyId` → `organizationId`
- [ ] `src/services/company.ts:143` `fetchHolidays`: `?companyId=` → `?organizationId=`

### Branches
- [ ] `src/app/pages/company/Branches.tsx`
  - The form field `companyId` (Yup `:81`, initial values `:150`, `:380`, `formikField` `:930`) → `organizationId`.
  - Payloads at `:414` and `:444` → `organizationId`.
  - `:627` `b.companyId === companyId` → `b.organizationId === …`. **If this is missed, the branch list is empty.**
  - `:792–797` the initial org → `organizationId`.
  - The `companyId` **prop** of `<Branches>` (`:198`) can keep its name, but renaming it to `organizationId` avoids the same confusion again.
- [ ] `src/app/pages/employee/calendar/views/WeekendsAndWorkingDays.tsx:126` `branch.company?.name` → `branch.organization?.name`
- [ ] `src/app/pages/employee/attendance/AttendanceConfig/AttendanceConfig.tsx:290` `b.company?.name` → `b.organization?.name`. Leave `configScope.companyId` alone: that one goes to the attendance config API, which is unchanged.
- [ ] `src/app/pages/employee/wizard/forms/EmployeeInfo.tsx:140` `b.companyId === effectiveOrgId` → `b.organizationId`. **If missed, the branch dropdown in the employee wizard is empty.**
- [ ] `src/app/pages/employee/wizard/forms/EmployeeInfo.tsx:148` `currentBranch?.companyId` → `currentBranch?.organizationId`. Keep `values.companyId`: that's the employee's, unchanged.
- [ ] `src/app/pages/employee/documents/DocumentsDirectory.tsx:111` and `:128` `b.companyId` → `b.organizationId`. **If missed, the sub-org filter shows no branches.**
- [ ] `src/hooks/useRecruitmentBranches.ts:43` and `:51` `b.companyId` → `b.organizationId`.
- [ ] `src/app/pages/employee/recruitment/RecruitmentBranchField.tsx:43` `b.companyName` → `b.organizationName`.

### Departments
- [ ] `src/app/pages/company/Departments.tsx`: Yup `:32`, initial values `:40` and `:159`, `setFieldValue("companyId", …)` `:52`, and the edit mapping `:78–83` → `organizationId`.
- [ ] `src/app/pages/employee/components/DepartmentConfigureForm.tsx:105` `companyId: initialData.companyId` → `organizationId: initialData.organizationId`. Also `:114` `createNewDepartment([{ …, companyId }])` → `organizationId`. The `companyId` prop (`:20`, `:31`, `:51`) can stay or be renamed.
- [ ] `src/app/pages/employee/components/EmployeeConfigure.tsx:538` and `:545` `d.companyId` / `rows[0]?.companyId` (departments) → `organizationId`.

### Designations (job profiles)
- [ ] `src/app/pages/company/Designation.tsx`: Yup `:31`, initial values `:37`, `:68` `designations[0]?.companyId`, `:92` `designation.companyId`, and the payload `:160` → `organizationId`.
- [ ] `src/app/pages/employee/components/JobProfileConfigureForm.tsx:110` `companyId: initialData.companyId` → `organizationId: initialData.organizationId`. Also `:121` `createDesignation([{ role, companyId, … }])` → `organizationId`.
- [ ] `src/app/pages/employee/components/EmployeeConfigure.tsx:345`, `:355` and `:435` `d.companyId` / `rows[0]?.companyId` (job profiles) → `organizationId`.
- [ ] Leave alone: `EmployeeConfigure.tsx:463`, `:465`, `:499`, `:500` (working methods, sources of hire).

### Holidays (the master list)
- [ ] `src/app/pages/company/Holiday.tsx`: initial values `:44`, Yup `:54`, and `values.companyId = …` `:119` → `organizationId`.
- [ ] `src/app/pages/employee/calendar/views/PublicHolidayListTwo.tsx:203` `generateHolidaysForYear({ …, companyId })` → `organizationId`. Leave `:271` `holiday?.companyId`: that one is a **public** holiday row, unchanged.

### Tests
- [ ] `src/app/pages/employee/recruitment/__tests__/CandidateDrawer.test.tsx:122`: the mocked recruitment branch → `organizationId`, `organizationName`.

## Branches API: small behaviour changes (same release)

The branch endpoints were also moved to the new backend structure. URLs and the response envelope are unchanged; these details changed:

| What | Before | Now | Frontend action |
|---|---|---|---|
| `POST /api/company/branches` response | `data` empty | `data: { ids: [...] }` (new branch ids, in the order sent) | None needed; use the ids if handy |
| `GET /api/company/branches` → `_count.Employees` | counted resigned staff too | counts **active** staff (same as the organization tree) | None; numbers on the Branches page may drop |
| `PUT /api/company/branch/:id` on an **archived** branch | allowed | **409** "This branch is archived and can no longer be edited." | Show the message |
| `DELETE /api/company/branches/:id` twice | 204 again | **404** the second time | None |
| `POST /api/company/branches/:id/promote` when the name is taken | **400** | **409** (`meta.reasonCode: ORG_NAME_TAKEN`) | If the screen checks the status code, accept 409 |
| `POST /api/company/branches/:id/promote` by a non-Admin | allowed with the settings permission | **403** (`meta.reasonCode: ADMIN_ONLY`): only a tenant Admin (or Super Admin) can promote | Show the "Promote to sub-organization" action only to Admins |
| A promoted sub-organization | started with no defaults | gets the same defaults as a new organization (working methods, KPI modules, settings, FAQ sections) | None; admins can still edit them |
| Promote response `data.organizations[0]` | the full organization row | the organization's summary fields only | None; it never needed bank or tax fields |
| Duplicate branch name in the same organization | generic 409 | 409 with `meta.reasonCode: BRANCH_NAME_TAKEN` and a clear message | Show the message |
| Extra keys in create/update bodies (`id`, `townId`, `deletedAt`, …) | passed through (or errored) | silently ignored | You can stop sending `townId` |

## Departments and designations: small behaviour changes (same release)

These endpoints were also moved to the new backend structure. URLs and the envelope are unchanged.

| What | Before | Now | Frontend action |
|---|---|---|---|
| `POST /api/company/designations` response | `data` empty | `data.designations`: the created rows (`id`, `role`, `organizationId`, `parentId`, …) | None; use them if handy |
| `_count.Employees` on the department and designation lists | counted resigned staff too | **active** staff only | None; numbers may drop |
| Department `color` | accepted anything | must be `#RRGGBB` (or empty); otherwise 422 | Send the colour picker's hex value |
| Name and code lengths | an over-long value failed as a vague database error | 422 that names the field: job profile ≤ 30, department name ≤ 50, code ≤ 20, description ≤ 50 | Add `maxLength` to those inputs |
| Leading and trailing spaces in names | saved as typed | trimmed | None |
| Duplicate job profile name | generic 409 | 409 `meta.reasonCode: DESIGNATION_NAME_TAKEN` (an **archived** profile with that name counts too) | Show the message |
| Duplicate active department name or code | generic 409 | 409 `meta.reasonCode: DEPARTMENT_NAME_TAKEN` | Show the message |
| Archive the same department or job profile twice | 204 again | 404 the second time | None |
| `PUT /departments/:id/designations` on an archived department | allowed | 409 | Hide the editor for archived departments |
| …with an archived job profile in `designationIds` | allowed | 400 | Offer only active profiles (the list already returns only active ones) |

## Holidays: small behaviour changes (same release)

| What | Before | Now | Frontend action |
|---|---|---|---|
| `POST /api/company/holiday` and `PUT /holiday-options` responses | `data` empty | `data.holiday`: the saved master | None; use it if handy |
| Duplicate active holiday name | generic 409 | 409 `meta.reasonCode: HOLIDAY_NAME_TAKEN` | Show the message |
| Deleting a holiday master or dated holiday twice | 200 again | 404 the second time | None |
| Editing a deleted dated holiday | allowed | 404 | None |
| `POST /holidays/generate-year` with a bad `year` | 400 | 422 with the field named | None |
| Holiday name over 50 characters, colour code over 10, `observedIn` over 20 | database error | 422 that names the field | Add `maxLength` to those inputs |
| Extra keys in holiday bodies (`id`, `isDeleted`, the old `from`/`to`, …) | some were written | ignored | You can stop sending `from`/`to` |

## Working methods, sources of hire, check-in radius (same release)

| What | Before | Now | Frontend action |
|---|---|---|---|
| Create, rename working methods and sources of hire | any signed-in user | needs **Write on Users**; otherwise 403 | None: Employees → Configure already shows these controls only with Write on Users |
| `POST /working-method`, `PUT /working-methods/:id`, `POST /source-of-hire/one`, `PUT /source-of-hire/:id` with an empty name or more than 50 characters | 400 or a database error | 422 that names the field; names are trimmed | Add `maxLength={50}` |
| Duplicate working method | 400 | 409 `meta.reasonCode: WORKING_METHOD_TAKEN` | Show the message |
| Duplicate source of hire in your company | 400 | 409 `meta.reasonCode: SOURCE_OF_HIRE_TAKEN` | Show the message |
| A source-of-hire name another company already uses (a database limitation the DB team is fixing) | 400 "already exists" | 409 `SOURCE_OF_HIRE_UNAVAILABLE` "can't be used, try a slightly different name" | Show the message |
| Another company's working method or source of hire id | 403 / allowed | 404 | None |
| **Removed endpoints** (no screen used them): `POST /options/working-methods` (bulk), `POST /options/source-of-hire` (bulk), `GET/POST /options/employee-status`, `GET/POST /options/employee-types`, `PUT /options/employee-type` | | 404 | Remove them from `services/options.ts` if still declared there |

## FAQs (same release)

Almost nothing changes for the screens:

| What | Before | Now | Frontend action |
|---|---|---|---|
| Asking a question while viewing a **sub-organization** | 400 "Unknown FAQ section" | works (it files into the family's shared section) | None; it just starts working |
| The `faqs_updated` socket event | sent to every user of every company | sent only to your organization family | None. If the board filtered events by `companyId`, that check can stay |
| `PUT /faq-categories/reorder` with an empty list | 400 | 422 | None |
| `POST /faq` / `PUT /faq/:id` responses | the full row | the same, minus the legacy `type` column | None, unless something read `faq.type` (use the section instead) |

## Why the old name was risky (so it doesn't come back)

- **Easy to confuse.** In this app `companyId` means two different things: on employees and these org records it was *our* organization, while on leads and contacts it's the *client* company. Code that mixed them up could filter by the wrong one without any error.
- **Tenant safety.** When you create or move a branch, department or designation, the backend checks that the `organizationId` you send belongs to **your** organization family, and refuses anything else (403). That check is unchanged, it just reads the new field. Always send the organization the user picked: the backend never trusts it blindly, but it's the only way the record lands where the user expects.

## How to test after the change

1. **Branches page:** the list shows branches; create one for a sub-organization and check it appears under that sub-org; edit one; archive one.
2. **Departments and Designations pages:** create, edit, archive. The edit form must not return "Organization id is required".
3. **Employee wizard:** the branch dropdown lists the selected org's branches.
4. **Documents directory:** filter by sub-organization; the branch filter shows that org's branches.
5. **Recruitment:** the branch field on a requisition shows "Branch · Org" when the family has more than one org.
6. **Holidays page:** create and edit a master holiday; on the calendar, "Generate year" works.
7. **Weekends & working days** and **Attendance config:** the organization name shows next to each branch (not "—").
8. Search the code once more: `grep -rn "companyId" src` and check that every remaining hit is about employees, public holidays, client companies or the config APIs listed above.

Questions: ask the backend team. The backend side of this is tracked in `wisetech-backend/organization-gaps.md` (D3, I1).

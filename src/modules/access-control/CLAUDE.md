# Access Control & RBAC — Engineering Notes

Scope of this doc: the enterprise RBAC/IAM system for the WiseTech multi-tenant
HRMS+CRM — the backend authorization engine (reference; **do not redesign**) and
the frontend Access-Control module (`src/modules/access-control`), plus every
change made during the migration + hardening work. Read this before touching
anything under `access-control`, `@authz/*`, or the role/permission endpoints.

Paired repos: `wisetech-frontend` (this) + `../wisetech-backend`. Both typecheck
clean (`npx tsc --noEmit`) and must stay that way.

---

## 1. Golden rules (hard constraints)

- **Do NOT redesign the backend**: no API contract changes, endpoint renames, DB
  model changes, permission-key changes, scope changes, middleware changes,
  RoleAssignment changes, or Effective-Permission-Engine changes. The engine is
  complete and correct. Frontend-only unless a change is a genuine, surgical bug
  fix (see the self-access carve-out pattern in §6).
- **Never grant Admin a blanket `*.*` wildcard to fix a 403.** Fix the actual
  gate or narrow the grant. Least-privilege always.
- **Never fabricate data or audit events.** If the data isn't available to a
  role, show an honest empty/again state — don't invent it.
- **One phase at a time, stop for approval** on anything outward-facing or hard
  to reverse.

---

## 2. Backend RBAC engine (reference — DO NOT change)

**Grammar:** `module.action.scope` (~1443 keys).
- Actions: `view, create, update, delete, approve, export, assign, manage`.
- Scopes: `self ⊂ team ⊂ department ⊂ all ⊂ global`.
- Inheritance (`@authz/inheritance`, `satisfies()`): `manage` ⊇ the CRUD/approve/
  export/assign actions; a broader granted scope satisfies a narrower required one;
  `*.*.all` / `*.*.global` (Super Admin wildcard) satisfies everything. Only ever
  broadens — enforcement stays fail-closed.
- UI ↔ key mapping: **Edit = `update`**, **Company = `all`**, **Own = `self`**.

**Effective Permission Engine** (`@services/authzService` → `getEffectivePermissionsForEmployee`):
unions direct role grants + `RoleAssignment` + `UserPermission` overrides + dynamic
approver grants. **60s in-process cache** keyed by `employeeId`
(`permissionsCache`). Bust with `invalidatePermissionCache(employeeId)` or
`notifyPermissionsChanged(employeeId)` (also pushes a live socket event). ⚠️ The
CLI `rbac:seed` runs in a **separate process** and does NOT bust a running
server's cache — expect up to 60s of stale 403s after seeding, or restart.

**Two grant mechanisms** (unified by the frontend Compatibility Layer):
1. Legacy direct `employees ↔ roles` link.
2. `RoleAssignment` (tenant/unit scoped).

**Authorization middlewares:**
- `authorize('<key>')` (`@middlewares/authorize`) — legacy flat gate; checks
  `hasPermissionKey`; fail-closed with per-module `RBAC_ENFORCE_*` emergency
  opt-out (`=false` drops that module to shadow/log-only).
- `authorizeScoped(moduleAction)` (same file) — CRM-style: resolves the actor's
  broadest granted scope, stamps `req.authz.decision.scope`, pair with
  `checkScope(resolver)` to enforce record-level reach.
- `@authz/scoped/authorizeScoped` + `attachScopeReach` — **delegated admin**
  (Phase-7): capability + assignment reach + target resolver → allow/deny. Only
  active when `ACCESS_CONTROL_MODE=SCOPED`.

**Scoped administration mode** (`@authz/accessControlMode`):
- `GLOBAL` (default) — behaviour-preserving legacy gate.
- `SCOPED` (**currently active**) — delegated decision via `accesscontrol.*`
  capability + assignment reach. Consumed only by the access-control route files;
  payroll/attendance/leave/CRM/employee use `@middlewares/authorize` and are
  unaffected.
- Wildcard holder (`*.*.all`/`.global`) is treated as `isPlatformWide` regardless
  of RoleAssignment rows — so Super Admin keeps full access with zero assignments.

**Multi-tenant model** (`Tenant` / `OrganizationalUnit` / `RoleAssignment`):
BUILT but **DORMANT** (0 rows; Phase-6 migration never run). Isolation currently
runs on `companyFamilyIds` (root org + all sub-orgs), resolved per-request in
`protect`. Org hierarchy: `Organization` (root + sub-orgs via
`parentOrganizationId`) → `Branches` → employees (`companyId`, `branchId`,
`departmentId`, `designationId`, `reportsToId`, all set at onboarding).

**Seeding** (`src/authz/seeding/`): `rolePermissionMatrix.ts` (single source of
truth for which system role gets which keys), `permissionSeeder`, `roleSeeder`,
`rolePermissionSeeder`, `index`. CLI `npm run rbac:seed` / `rbac:assign-roles`;
startup hook `RBAC_SEED_ON_STARTUP`. **4 system roles** (all `isSystem`, cannot be
deleted): `SUPER_ADMIN` (wildcard, no explicit grants), `ADMIN` (Company Admin —
full control of business modules + the only `accesscontrol.*` holder),
`MANAGER` (name "Manager / Team Leader" — team-scoped view + approvals),
`EMPLOYEE` (SELF_SERVICE floor only).

---

## 3. Frontend Access-Control module (`src/modules/access-control`)

Delivered via a 6-step migration (all tsc/lint clean, backend untouched):
Step 0 Compatibility Layer, 1 Navigation, 2 Global Scope Bar, 3 Roles, 4 Employee
Access, 5 Audit Logs, 6 regression/legacy cleanup.

**Layout**
```
pages/        RoleDashboardPage, RoleDetailsPage
components/    PermissionEditor, CapabilityGrid, CapabilityRow, ModuleCard,
              ScopeSelector, RoleToolbar, RoleCard, StatisticsCard,
              RoleMembersDialog, FilterBar, SearchBar, StatusBadge, ...
scope/        AccessScopeContext, GlobalScopeBar, AccessControlLayout
compat/       accessCompat, types  (unifies the two grant mechanisms)
employee/     EmployeeAccessListPage, EmployeeAccessDetailPage,
              UnifiedRolesPanel, OverridesPanel, overrideLevels
audit/        AuditLogsPage  (reuses assignments HistoryTimeline + RBAC audit API)
api/          accessControl.api.ts   (all requests; components never call axios)
hooks/        useAccessControl (query keys `accessKeys`, useRoles/useRole/
              useRoleSummary/useRoleMembers), usePermissionEditor
types/        index.ts  (RoleListItem, RoleDetails, RoleMember, Reach, ...)
```
Sibling module: `src/modules/assignments` (EffectiveAccessPage, AssignmentHistory,
HistoryTimeline, hooks/useAssignments).

**API surface** (all under `api/access`, unwrap `{hasError,statusCode,message,data}`):
`GET /catalog`, `GET /roles`, `GET /roles/:id`, `GET /roles/:id/summary`,
`GET /roles/:id/members` (added — see §5), `GET/PUT /roles/:id/editor`.
Legacy: `GET/POST /api/roles`, `PUT/DELETE /api/roles/:id`,
`POST/DELETE /api/roles/:id/employees`, `/api/roles/:id/access[/section]`.

**Permission editor** speaks **business language only** (module → No access /
View / Manage preset + per-capability `ScopeSelector` reach). All key composition
happens in the single backend translation layer `@authz/capabilityTranslation`
(`REACH_VALUES`, `toEditorGrid`, `toPermissionRows`, `validateEditorGrid`).
`reachOptions` flows: backend `REACH_VALUES` → editor response → `usePermissionEditor`
→ `ScopeSelector.options`.

Role-mutation handlers enforce the real bounds (so route guards can delegate):
`deleteRole`/`updateRole` reject `isSystem`; `setRoleSectionAccess` +
`updateRoleEditor`(`loadEditableRole`) block Super Admin and require
`canManageRoleLevel` (can't edit at/above your rank); `addEmployeeToRole` caps by
rank + scopes to `companyFamilyIds`.

**Two permission systems coexist on the frontend:**
1. **New (authoritative):** `@utils/can` — `can()/canAny()/canViewModule()/canDo()`
   read `store.authz.capabilities` (loaded from a `/capabilities` endpoint);
   `evaluateCapability` applies scope-widening. `SectionGuard` (route/nav gate)
   uses this.
2. **Legacy (fallback, being phased out):** `@utils/authAbac` (`hasPermission`) +
   `@utils/dynamicRoles` (`getDynamicRolesObject` → `GET /api/roles`) + redux
   `rolesAndPermissions`. `hasPermission()` tries `can()` FIRST, then falls back
   to the legacy role map. See §6 for the bootstrap trap.

---

## 4. Roles UI changes (RoleDetailsPage / RoleToolbar / RoleCard)

- Removed the 3 non-working tabs (Users/Preview/Audit); tabs are now
  **Overview · Summary · Access · History**. Folded the Statistics cards into
  Overview.
- **New Role** works: `RoleToolbar` dialog → `createRole({name})` → invalidate
  `accessKeys.all` → navigate to the new role's Access tab.
- Added **"View assigned users"** on Overview → `RoleMembersDialog` (lists role
  members from `GET /api/access/roles/:id/members`; real data, no fabrication).
- **Removed the "Role level" display** everywhere in the UI (stat card, meta row,
  RoleCard caption, FilterBar Level filter). The underlying `level` field is KEPT
  (it drives `canManageRoleLevel` authorization + sorting) — only the display is
  gone.
- **Removed the "Department" scope** from the editor: `usePermissionEditor`
  filters `department` out of `reachOptions`. Buttons are now None/Own/Team/
  Company/Global. Backend still understands `department` internally (harmless; no
  role uses it) — nothing broke.

---

## 5. Fixes made this session (what & why)

- **Employee login 403 (self-fetch).** `GET /api/users/:id` was gated at
  `accesscontrol.view`/`users.view.all`, but `fetchCurrentUser(loginRes.id)` runs
  right after login → every non-admin login 403'd. Fix: `selfOr()` carve-out in
  `routes/users.ts` — a user may always read their OWN record; reading others
  still needs the capability.
- **Role management unblocked for Company Admins (SCOPED).** All roles are
  tenant-less (`isGlobal`) → SCOPED made them platform-only → Admin (0
  assignments) got 403 on New Role / editor save / delete / assign. Added
  `allowGlobalForCapabilityHolder?: boolean` to `AuthorizeScopedOptions`
  (`@authz/scoped/authorizeScoped`) + reason `GLOBAL_CAPABILITY_OK`; enabled on
  `manageRole` (accessControl.ts) + `canManageRole`/`canCreateRole` (roles.ts).
  Safe because the handlers enforce the real bounds (§3). Product decision by the
  owner: "Company Admins too (unblock)".
- **Legacy ABAC bootstrap retry-storm.** `getDynamicRolesObject()` re-threw the
  `/api/roles` 403 → bootstrap thunk rejected → `main.tsx` retried
  `BOOTSTRAP_RETRIES`× behind a splash → repeated 403 spam + half-broken employee
  login. Fix (`utils/dynamicRoles.ts`): swallow a 403 → `return {}` (normal for
  non-admins); and once caps are loaded, skip the call entirely for users lacking
  `accesscontrol.view.all`. `hasPermission` already prefers `can()`, so employees
  lose nothing.
- **Employee UI gating (manager widgets barrage).** Dashboard widgets were gated
  only by `isSectionEnabled` (a preference), so manager widgets fired company-wide
  calls for employees. Added capability gates in `DashboardWrapper` (reactive via
  `authz.capabilities` + `evaluateCapability`): Daily Attendance Overview →
  `attendance.view.team`; Tasks → `tasks.view.team`; Pending Requests →
  `approvals.view.team`|`attendance.view.team`; Leaderboard → `kpi.view.team`;
  Lead/Project Analytics → `projects.view.team`|`crm.leads.view.team`. Kept
  ungated (self): Mark Attendance, My KPI, My Loans, Announcements, Todos, Events.
- **Employee "My Projects".** `ProjectsMain` is a CRM/manager dashboard (tabs read
  `crm.leads.view` + `projects.view.team`). Branched it: managers get the full
  page; employees get `MyProjects.tsx` — their execution-team projects from
  `getProjectsByEmployeeId`, no CRM lookups. Backend self-access added to
  `GET /projects/employee/:employeeId` (`selfOrProjectsTeam` in
  `leadProjectCompanies.ts`) so an employee can read their own projects.
- **Sidebar "<Org> Team" label for employees.** Label resolved org name via
  `fetchOrganizationTree()` (`settings.view.all`) → 403 → fell back to
  "Employees". Added minimal authenticated `GET /api/company/overview/org-names`
  (`fetchOrganizationNames` → `getOrganizationNames()`; id/name/parent only, no
  structure) and wired `useNavigation`. Rule established: **basic org/company
  *names* → authenticated; structural/admin data → stays gated.**

---

## 6. Recurring gotchas / lessons

- **Stale-cache 403s after seeding** (§2) — verify with a direct `hasPermissionKey`
  check before assuming a code bug; restart or wait 60s.
- **Company-context over-gating.** Several employee-facing features read
  admin-gated company/shift context (`/api/company/overview`, `/api/day-wise-shift`
  → `settings.view.all`). These are *context*, not admin management, and block
  self-service. Remedy pattern: expose a minimal authenticated read (like
  org-names) or gate by the consuming module, not `settings`.
- **Scope gates reachability, not data (IMPORTANT open gap).** `authorize('x.view.team')`
  only checks the actor *holds* the key — it does **not** filter results.
  `fetchAllEmployees` narrows by `companyFamilyIds` only, never by team/scope. So a
  Team-scoped viewer of the team-attendance board would see the whole company. The
  owner's requirement: **scope must actually narrow the data** (Team → the actor's
  team = peers sharing their lead; Company → the actor's sub-org `companyId`;
  Global → the whole family). This is a real, unbuilt feature — see §8.
- **Self-access carve-out pattern** (the sanctioned backend change): when an
  endpoint is admin-gated but a user needs their OWN record, add a `selfOr(guard)`
  that allows when `param id === currentUser.(id|employeeId)` and delegates to the
  guard otherwise. Used for `/api/users/:id` and `/api/lead-project-companies/
  projects/employee/:employeeId`.
- Owner strongly prefers **surgical, reuse-first, in-chat** work; rejects naive
  "just allow it" fixes and over-large artifacts.

---

## 7. Verification

- Frontend: `npx tsc --noEmit` (primary gate; build also typechecks) + `npm run
  lint` on touched files (don't add new errors; ~61 pre-existing legacy errors).
- Backend: `npx tsc --noEmit`. No CI test/lint.
- A `PostToolUse` hook runs tsc + eslint on edited `.ts/.tsx` in the background.
- One-off DB/authz diagnostics: throwaway `scripts/*.ts` run with
  `npx ts-node -r tsconfig-paths/register scripts/<x>.ts`, then delete them.

---

## 8. Access Control redesign — APPROVED plan (do in this order)

The sidebar-mirrored permission-editor redesign is **approved**. Two locked
implementation directives:

**Directive A — Feature Cards with progressive disclosure.** The Access editor
renders one **Feature Card** per page. Default = **module-level only**: an
`Allow access` master toggle → (when on) a **Preset** (No Access / View Only /
Manage / Full Access) + a single **Scope**. Individual capability checkboxes
(view/add/edit/delete/approve/export) and per-capability scope are hidden until
**"Advanced"** is expanded. Human wording throughout. Reuses `ScopeSelector`, the
editor grid (`GET/PUT /roles/:id/editor`), `usePermissionEditor`.

**Directive B — Complete backend SCOPE ENFORCEMENT before shipping the workspace.**
So UI ⇄ Preview ⇄ runtime stay consistent. Scope must actually NARROW data, not
just gate reachability (today `authorize('x.view.team')` only checks the actor
holds the key; `fetchAllEmployees` returns the whole company family regardless).
Use the EXISTING engine primitives (`getBroadestGrantedScope`, `resolveScope`/
scopeEngine, `checkScope`) — this COMPLETES enforcement, it does not redesign the
engine/contracts/keys. Narrowing is driven by the ACTOR's broadest granted scope,
so a `.all`/`.global` holder (admin/super-admin) is a no-op → existing admin pages
unaffected; only narrower-scope users get filtered.

**Editor build order (after Directive B lands):** design tokens + `NavMode` seam
on the existing aside (Navigation vs Permission mode — clicks open config, not
route) → Role Overview dashboard → Feature Card (module-level + Advanced) →
Templates → live Preview (reuses `evaluateCapability`) → business-language search
→ mobile drill-down → cutover → reuse for Employee Access → delete legacy matrix.
Old `PermissionEditor` stays behind a flag until cutover.

**The sidebar reuse rule:** the Access editor mounts the SAME aside component in a
`NavMode="permission"` context — identical hierarchy/icons/spacing/typography/
indent/expand-collapse/section-headers; only leaf click behavior swaps (open the
Feature Card instead of routing). One Navigation Registry feeds sidebar + editor +
preview + search + breadcrumbs.

### Scope → reach mapping — DECIDED (Option A) & PARTLY IMPLEMENTED
Owner chose **Option A**: Own→self · Team→peers under the same lead (`reportsToId`
group + lead + self + own reports) · **Company(`all`)→own sub-org (`companyId`)** ·
**Global(`global`)→whole group (all sub-orgs = `companyFamilyIds`)** · Super Admin
wildcard→unrestricted.

**Landed (backend, tsc clean, verified):**
- Primitive `@authz/scope/employeeScope.ts` → `resolveEmployeeScopeWhere(actor,
  moduleAction)` (Prisma where-fragment) + `resolveReachableEmployeeIds(...)`.
  Narrowing is a NO-OP for `.global`/wildcard holders, so admins are unaffected.
- **Admin role re-seeded `.all → .global`** (rolePermissionMatrix.ts `manageGlobal`
  + `reports.view.global`); `npm run rbac:seed` synced. Verified: Admin resolves to
  the whole group (37); a `.all` employee → sub-org (14); `.team` → team (8).
- **People/Attendance/Leaves narrowed** by each module's own scope:
  `fetchAllEmployees` (`EmployeeReadScope.scopeWhere` in EmployeesRepository) →
  `users.view`; `fetchAttendanceDetails` (/attendance/all) → `attendance.view`;
  `fetchAllLeaves` (/employee-on-leaves) + `fetchAllLeaveManagements`
  (/leave-management/all, narrowed at query for correct paging) → `leaves.view`.
  Verified: Manager→team subset, Admin→37.

**Behaviour note (least-privilege, intended):** `/api/employee/all` is shared, so
ALL non-admin employee/assignee pickers now list only the actor's reach. Owner
approved this; exempt a specific picker only on request.

**Consistency phases (owner-approved order):** P1 backend scope on all employee
reads · P2 navigation default-deny (canViewModule) · P3 dynamic tabs · P4
dashboard/cards/buttons · P5 full-stack consistency verify. "No View = No Feature";
nav must be positive-view-gated, not block-only/`true`/legacy hasPermission; tabs
are navigation (same rule); one module identifier across editor/nav/route/backend/
scope/preview.

**Phase 1 DONE + verified (all `users`-module employee reads scoped):**
`/employee/all`, `/all-employees-selected-data` (picker), `fetchEmployeeById`
(detail — **Rule 5**, self always allowed; non-reach ID → deny, verified),
`/emergency-details/all`; attendance/leaves board endpoints from the prior pass.
Verified team actor → subset, admin(global) → all, detail-by-id enforces scope.
Search is client-side over the narrowed list. Salary/KPI "reports" deferred to the
finance/kpi domain sweep (their own module scope), same pattern.

**Still to sweep:** timesheets, tasks, finance/salary, kpi/leaderboard, CRM/
projects lists; loosen the board's SECONDARY context reads (`day-wise-shift`,
`company/overview`) off `settings.view.all`.

Department stays hidden in the editor UI but is still understood/enforced
backend-side.

## 9. Other open follow-ups

- **Project detail self-access**: clicking a "My Projects" row → `getProjectById`
  (`projects.view.team`) still 403s for employees.
- **Company/shift context reads** still admin-gated for a few employee-facing
  widgets (Mark Attendance, Pending Requests) — loosen per §6 pattern.
- Multi-tenant activation (provision `Tenant`/`RoleAssignment`) if/when tenant-
  scoped delegated admin is needed.

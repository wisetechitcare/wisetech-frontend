# Frontend multi-tenancy checklist

**Last updated:** 2026-10-07  
**Companion (authority):** [`wisetech-backend/docs/multi-tenancy.md`](../../wisetech-backend/docs/multi-tenancy.md)  
**Industry context (local):** `summary/architecture/MULTI_TENANCY_INDUSTRY.md`

The UI is **not** the security boundary. The API enforces org-family scope. The frontend’s job is to **never invite** forged `companyId` / `employeeId` values and to reuse the shared org-scope patterns already in the tree.

---

## Model (same as backend)

| Concept | FE meaning |
|---------|------------|
| Org family | Orgs returned by company overview / session — WISETECH GROUP + children |
| `companyId` on HRMS APIs | Always an **Organization** id from that family (or omit = whole family) |
| CRM “company” | Client company in leads/contacts — **different id space**; never use as HRMS tenant |

---

## Canonical reuse (do not reinvent)

| Need | Use |
|------|-----|
| Org filter / picker for company-scoped screens | `useOrgScope` + `toCompanyIdParam` / `ALL_ORGS` — [`src/hooks/useOrgScope.ts`](../src/hooks/useOrgScope.ts) |
| Current org display / logo / date format | Redux `company.currentCompany` (filled from overview) — do not invent a parallel store |
| Employee lists for pickers | Existing employee services that hit family-scoped APIs — do not load “all employees” via a raw unscoped call |

Examples already in tree: FAQs board, recruitment main, prefix settings, lead org dialogs.

---

## Rules for new / edited screens

1. **Org-scoped GETs** — Prefer `toCompanyIdParam(scopeId)` so `'All'` omits `companyId` (backend = whole family). Never invent a UUID the user did not pick from `useOrgScope` options.
2. **Employee-scoped GETs** — Pass `employeeId` only from: self (`currentUser`), a row returned by a family-scoped list, or a manager/HR picker fed by those lists. Never from free-typed UUIDs or another tenant’s deep link without a 403 path.
3. **CRM vs org** — `useCompanyHierarchy` / client companies are for **clients**, not employer tenancy. Do not send a CRM `companyId` to HRMS options/salary/leave endpoints.
4. **Realtime** — Ignore socket events for another org when `useRealtimeSync` (or equivalent) already filters on `currentCompany`; do not broaden.
5. **Errors** — Treat **403 / 404** on profile/bank/salary as “no access”, not a retry with a different guessed id.
6. **Security theater** — Hiding a menu item is UX. Do not claim the feature is tenant-safe until the API call cannot widen scope.

---

## Checklist before merging UI that touches people / money / config

- [ ] Org dropdown uses `useOrgScope` (or documents why a one-off is required and still only lists family orgs).
- [ ] API `companyId` comes from that selection or is omitted — not from query string of another app, localStorage of a foreign id, or hardcoding.
- [ ] Any `employeeId` in the request is from self or a list already loaded under the current session.
- [ ] No new axios call that bypasses `src/services/` with a hand-rolled URL and arbitrary ids.
- [ ] Cross-tenant deep links fail closed in the UI (empty state / redirect), matching API 403/404.

---

## Verification

Backend smoke (authoritative): see `wisetech-backend/scripts/tenant-security-smoke/README.md`.

Manual FE spot-check:

1. Log in as WiseTech user — People / org filters must not list **Tenant B Test Co** staff.
2. As Tenant B user — must not see WiseTech people in pickers.
3. DevTools: no request should send Tenant B’s `companyId` while logged into WiseTech (except if you forged it — API must still deny).

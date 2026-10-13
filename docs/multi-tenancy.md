# WiseTech multi-tenancy (frontend)

Backend is the authority: [`wisetech-backend/docs/multi-tenancy.md`](../../wisetech-backend/docs/multi-tenancy.md).

## What the FE owns

| Concern | Do this |
|---------|---------|
| Org filter UI | `useOrgScope` from `@hooks/useOrgScope` |
| API `companyId` param | `toCompanyIdParam(scopeId)` — `'All'` / `ALL_ORGS` → omit param (whole family) |
| Options source | Company overview / session-backed list — not a free-typed UUID |
| Tables & lists | Pass scope through the existing service methods; do not invent parallel org fetchers |

## What the FE must never do

- Treat a query-string or form `companyId` as proof of access.
- Hardcode another root org’s id to browse “Tenant B.”
- Re-derive org trees per feature when `useOrgScope` already covers it (kit README: org filter data → `useOrgScope`).

## Checklist for a new company-scoped screen

1. Drop in `useOrgScope` (include `ALL_ORGS` only if the API supports family-wide reads).
2. Wire `toCompanyIdParam` into the list/detail service call.
3. Confirm the backend route uses `resolveTenantScope` / `resolveWriteCompanyId` (or equivalent) — FE alone is insufficient.
4. Prefer kit dropdowns (`WtField` / toolbar filters) for the control chrome.

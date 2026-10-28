# DRY — strict Rule zero (WiseTech · entire codebase)

**Status:** Canonical · **Scope:** **FE + BE** — every WiseTech repo under `integration-work`  
**Audience:** every engineer and agent  
**Companions:** [UI kit README](../src/app/modules/common/components/ui/README.md) · [bootstrap-to-kit-migration.md](./bootstrap-to-kit-migration.md) · [FE HANDBOOK](./HANDBOOK.md) · [BE AGENTS.md Rule zero](../../wisetech-backend/AGENTS.md) · [BE HANDBOOK](../../wisetech-backend/docs/HANDBOOK.md) · [100% scorecard](../../summary/audits/DRY_100_SCORECARD.md) · [UI_KIT_360_INDEX](../../summary/audits/UI_KIT_360_INDEX.md)

This file is **non-negotiable**. Soft preferences live elsewhere. If this conflicts with a feature “shortcut,” this wins.

**100% means both:**

1. **Shared completeness** — every recurring Need has exactly one shared Use (kit / Neighbor / BE util / schema).  
2. **Adoption completeness** — product code uses that Use; forbidden twins are gone (migrate-when-opened, tracked to zero).

Building a second design system does **not** count as 100%. Migrating consumers onto the shared layer does.

---

## 1. The law (one sentence)

**Grep the shared layer → reuse or extend it → then consume. Never invent a twin.**

| Layer | Shared surface | Forbidden |
|-------|----------------|-----------|
| **FE chrome** | `@app/modules/common/components/ui` + documented **Neighbors** | Feature-local Button/Field/Chip/Modal/Table/MetaPill/`btn-*` |
| **FE data / org** | `useOrgScope`, shared hooks / query keys | Inventing company IDs; re-deriving org lists |
| **BE HTTP** | Handlers + Yup `schemas/` + shared `services/` / `utils/` | Copy-paste Prisma filters; parallel validators; shadow RBAC |
| **BE tenancy** | `resolveTenantScope` / `requireAccessToEmployee` / family helpers | Scoping on dead `tenantId`; inventing org math |
| **API contract** | One Yup schema + one mapper per resource | Divergent payloads per screen |

---

## 2. Decision gate (every task · FE and BE)

```text
Need a UI control or server helper?
        │
        ▼
  Grep kit / Neighbors / services / schemas / utils
        │
   ┌────┴────┐
   │ exists? │
   └────┬────┘
    yes │         no
        ▼          ▼
  Reuse it     Build SHARED first
  (or extend   (kit / Neighbor / service / schema)
   the shared        │
   piece)            ▼
        └────► Call from feature — never a local fork
```

| Outcome | Action |
|---------|--------|
| Shared piece **exists** | Import and use it. Do not wrap it in a second API. |
| Shared piece **almost** fits | **Enhance the shared piece**, then call it. Local workaround = second implementation. |
| Shared piece **missing** | Add it to the kit / Neighbor folder / BE util **first**, then consume. |
| “Just this one screen / handler” | **Reject.** Later never comes; the second copy will. |

---

## 3. Frontend — hard map (Need → Use → Never)

| Need | Use | Never |
|------|-----|-------|
| Labelled CTA | `WtButton` | MUI `Button`, `btn-*`, ad-hoc hex |
| Cancel / secondary | `WtButton ghost` | White one-off; gold Cancel |
| Icon row action | `WtIconButton` / `ActionIconButton` | Bare `<button>` + icon |
| Dialog Cancel+Submit | `GlassDialogActions` | Hand-rolled `DialogActions` |
| Labelled input / select | `WtField` / `WtFieldFormik` | `TextField`+`MenuItem`, feature `react-select` |
| Money | `WtMoneyField` | “LPA” / unit-in-label |
| Status **and** meta chip | `ToneChip` (or kit `StatusBadge` for trio+pulse) | Private `MetaPill`, Bootstrap `badge`, legacy hex pill twins |
| List cards | `GlassCard` + capped `AutoGrid` | Bootstrap `card`; unbounded `auto-fit`+`1fr` |
| Modal shell | `GlassDialog` + header | Bootstrap `Modal` |
| Short master form | `ConfigureFormDialog` | Bootstrap Modal + C/FONT/SP |
| Long form dialog | `WtFormDialog` | Private modal layout |
| Data table | Neighbor `MaterialTable` | Page-local `<Table>` / second MRT |
| Empty / error | `WtEmptyState` | Mute “no data” only |
| Block load | `PageLoader` | Bootstrap spinner as page chrome |
| In-form notice | `InlineNotice` / `InlineHint` | Bootstrap `.alert` + hex |
| Toast / confirm | kit `toast` / `confirmDialog` | Raw Swal look |
| Org filter data | `useOrgScope` | Invented org IDs |
| Person pick | `EmployeePickerField` / `EmployeeSelectionDialog` | Bespoke employee dropdown; expand `AllEmployeesSearchDropdown` |
| Cards / list / board layout toggle | `CardsListViewSwitch` / `BoardListViewSwitch` / `GridListViewSwitch` / `CardsTableViewSwitch` / `KanbanTableViewSwitch` / `DmsViewSwitch` — glyphs from `VIEW_MODE_ICONS` only | Private `ViewToggle`, Bootstrap `btn-group` List/Cards, `element-11`/`burger-menu` layout forks |

**Brand CTA locked:** navy primary + white Cancel. Do not redesign in a feature PR.

**TW twin (`ui/tw/`):** narrow (calendar / layout). **Do not** expand into a parallel Field/Select/Button form kit.

Recipe matrices and Neighbors: [ui/README.md](../src/app/modules/common/components/ui/README.md).

---

## 4. Backend — hard map (Need → Use → Never)

| Need | Use | Never |
|------|-----|-------|
| Tenant / org family scope | `resolveTenantScope` / `getTenantFamilyIds` / `resolveWriteCompanyId` (`utils/tenantScope.ts`) | New queries on dead `tenantId`; inventing org trees |
| Employee PII access | `requireAccessToEmployee` | Trust body/path employee IDs without check |
| Request validation | Yup in `src/schemas/` | Unvalidated body; parallel Zod island |
| Cursor / list pagination | `buildPage` / shared list-query helpers | One-off skip/take per handler |
| Approvals / sign-off | `ApprovalInstance` patterns | Parallel approval engines |
| Leave balances | `recalculateBalance` | Ad-hoc balance math in handlers |
| Billing status moves | `transitionStatus` / `isReadyForInvoice` | Inline status machines |
| Actor → display name | `actorNameResolver` | Inline name joins per handler |
| Money / GST builders | Shared billing resolvers (e.g. `mepBilling`) | Copy-paste Decimal/GST blocks |
| HTML / email user data | BE `escapeHtml` / established mail helpers | Unescaped interpolations |

Full Rule zero: [wisetech-backend/AGENTS.md](../../wisetech-backend/AGENTS.md).

---

## 5. What “100%” is (and is not)

| Dimension | 100% means | Not 100% |
|-----------|------------|----------|
| **A · Shared catalog** | Every recurring Need in §§3–4 has one Use; twins frozen or aliased to kit | Inventing `GlobalButton` / MetaChip / second tenant helper |
| **B · Product adoption** | Zero new forbidden patterns; existing debt tracked to **zero** via waves | Claiming done while ~124 Bootstrap files remain |
| **C · New work** | Every PR passes §6 checklist | “We’ll extract later” |

Track live status: [summary/audits/DRY_100_SCORECARD.md](../../summary/audits/DRY_100_SCORECARD.md).

### Adoption waves (to zero debt)

| Wave | Target | Done when |
|------|--------|-----------|
| **W1** | Bootstrap `Modal` → `GlassDialog` (+ header/footer) | No product `react-bootstrap` Modal |
| **W2** | Footers → `GlassDialogActions` | No hand-rolled Cancel/Submit `DialogActions` |
| **W3** | Hand `<Table>` → `MaterialTable` | No product hand grids (except documented `keep`) |
| **W4** | Selects → `WtField` / Neighbors | No feature `react-select`; `DropdownInput` / `AllEmployeesSearchDropdown` frozen→gone |
| **W5** | CTAs → `WtButton` / icon kit | No product `btn-*` / raw MUI Button CTAs |
| **W6** | Badges / alerts / switches | No Bootstrap badge/alert/form-switch status chrome |
| **W7** | BE handler DRY | No tenant/`recalculateBalance`/approval forks; Yup SSOT |

One PR = one surface or one shared primitive. Waves run in parallel only when non-overlapping.

---

## 6. PR / agent checklist (fail the change if any box is false)

Before merge or “done”:

- [ ] Grepped kit / Neighbors / BE utils / schemas for this concept **before** writing new code  
- [ ] No new twin of an existing primitive (second Chip, Button, Modal footer, Table, MetaPill, tenant helper, …)  
- [ ] Any new capability was added to the **shared** layer, then called  
- [ ] New FE chrome imports from `@app/modules/common/components/ui` (or a documented Neighbor)  
- [ ] No new `react-bootstrap` chrome; no new feature `react-select`  
- [ ] No new hardcoded CTA / badge hex for something with a semantic tone  
- [ ] Tenancy / org IDs only via approved helpers (`useOrgScope` / `resolveTenantScope`)  
- [ ] BE: Yup schema for new/changed input; no dead `tenantId` scoping  
- [ ] One PR = one surface or one shared primitive (no “while I’m here” mega-rewrite)  
- [ ] Verification that matters ran (`tsc --noEmit`, relevant tests) — green types ≠ correct query  
- [ ] If debt was reduced, update [DRY_100_SCORECARD.md](../../summary/audits/DRY_100_SCORECARD.md) counts / wave row  

---

## 7. Audit tags (how we classify debt)

| Tag | Meaning | Action |
|-----|---------|--------|
| `kit-redesign` | Shared piece must change to meet the bar | Enhance kit / shared util first |
| `enhance` | Small shared fix / docs / contract | Patch shared, then consumers |
| `migrate-consumer` | Screen/handler still on twin | Replace when that file is opened |
| `keep` | Intentional exception | Document why in the scorecard |

---

## 8. Explicit non-goals

- Building a second design system (TW form kit, `GlobalButton`, `MetaChip` if `ToneChip` covers it)  
- Mega-PR replacing every `btn-*` / Modal / Table / handler in one shot  
- Generic SaaS “filter everything by `tenantId`” playbooks (wrong for WiseTech)  
- Changing locked navy + white Cancel CTA in a drive-by  
- Declaring “100% kit” while adoption waves W1–W7 still have open product debt  

---

## 9. Where to look first (30-second map)

| Question | Open |
|----------|------|
| What control / helper do I use? | This file §§3–4 + `ui/README.md` |
| Are we at 100% yet? | [DRY_100_SCORECARD.md](../../summary/audits/DRY_100_SCORECARD.md) |
| Migrating Bootstrap? | `docs/bootstrap-to-kit-migration.md` |
| FE density / dialogs / buttons? | `docs/HANDBOOK.md` §3 |
| BE reuse / red zones? | `wisetech-backend/AGENTS.md` + `docs/HANDBOOK.md` |
| Category FE debt / waves? | `summary/audits/UI_KIT_360_INDEX.md` |

---

**Remember:** A green `tsc` is not proof the shared path was used. Grep the tree. If two implementations of the same idea exist, the newer one is usually wrong — delete or migrate it onto the shared one. **100% is shared catalog + zero product twins — FE and BE.**

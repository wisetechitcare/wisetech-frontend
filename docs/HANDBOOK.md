# WiseTech Frontend — Engineering Handbook

**Audience:** WiseTech engineers and AI agents working in this repo only.

Companion: [`AGENTS.md`](../AGENTS.md) · [`docs/multi-tenancy.md`](./multi-tenancy.md) · UI kit [`src/app/modules/common/components/ui/README.md`](../src/app/modules/common/components/ui/README.md) · Backend handbook [`../wisetech-backend/docs/HANDBOOK.md`](../../wisetech-backend/docs/HANDBOOK.md).

---

## 1. Core philosophy

Same bar as backend: **Rule zero** (reuse before invent), automated gates over tribal knowledge, AI drafts under human ownership for security-sensitive work.

Frontend does **not** enforce multi-tenant isolation — the API does. Still never forge or “helpfully invent” org/company IDs outside `useOrgScope` / session-backed options.

---

## 2. Development workflow

| Rule | What we do |
|------|------------|
| No direct to protected branches | PR into `main`; `dev` is integration. Pre-push / branch protection + CI. |
| Small PRs | Prefer reviewable UI + service changes; avoid 500-line one-shot screens. |
| PR body | Intent, screens/components, API touchpoints, org-scope impact. |
| Verification | `pnpm exec tsc --noEmit` before claiming done. Build typechecks. |

**CI** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): hygiene/guard patterns, typecheck, lint on **touched** files (legacy ESLint debt is ratcheted), PR bundle. Amplify ships from `main` — do not rely on local “it builds for me.”

---

## 3. UI design system (non-negotiable)

**One public API:** `@app/modules/common/components/ui` — `WtField` / `WtFieldFormik`, dialogs, toolbar filters, etc.

- Labelled forms/selects → **`WtField` only** (not raw `react-select`, not `TextField`+`MenuItem`, not a TW `<select>` wrapper).
- Control density SSOT: **`WT_CONTROL_HEIGHT` = 40** (default / rows), **`WT_CONTROL_HEIGHT_MD` = 44** (spacious). **`WtField` / `WtDateField` default `size="sm"`** (40px). Opt into `size="md"` for spacious dialog forms. **`WtButton size="small"`** = 40px + flatter CTA (toolbar / ListHeader). Never invent per-screen `sx={{ height }}` or patch label `fontSize` (breaks the notch).
- Dialog chrome: **`FormSection` + `FORM_SPACE`** for form cards; **`GlassDialog preset="form"|"workspace"`** instead of hand-rolled `maxHeight`; **`GlassDialogActions`** for Cancel/Save footers; **`SettingsSection`** (accent settings, optional `count`) vs **`WtFormSection`** (long nav forms).
- Toggles / checkboxes: **`WtSwitch` / `WtCheckbox`** (labelled: `WtSwitchField` / `WtCheckboxField` / `WtControlLabel`). Checkbox look is themed globally on `MuiCheckbox`; still prefer the kit helpers for `size` / `tone`.
- Tables → shared table engine (`MaterialTableImpl` / kit), not a one-off `<Table>`.
- MUI = product controls; Tailwind = layout/utilities on shared tokens. Do not grow a parallel TW form kit (`ui/tw` stays narrow).
- Details: `.cursor/rules/ui-design-system.mdc` and the kit README.

ESLint bans many legacy Bootstrap/native patterns; the UI baseline ratchet must only shrink.

---

## 4. Org scope (HRMS)

See [`docs/multi-tenancy.md`](./multi-tenancy.md).

- Use **`useOrgScope`** for org filters; pass `toCompanyIdParam(scopeId)` into APIs.
- `ALL_ORGS` / omit `companyId` = “whole family” — backend expands from session.
- Never hardcode a sibling root org id to “peek” at another tenant.

---

## 5. Architecture & services

- API via `src/services/` (axios). No ad-hoc axios in pages.
- React Query for server state; Redux for client/UI state.
- After a production UI bug: regression coverage where we have tests, or a kit/index fix so the next search finds the right component ([`AGENTS.md`](../AGENTS.md) Rule zero story).

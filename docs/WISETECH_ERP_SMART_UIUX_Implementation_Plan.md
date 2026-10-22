# WiseTech ERP Smart UI/UX Modernization Plan - Legacy Kit Edition

## 1. Objective and completion contract

Modernize employee configuration choice controls by extending and adopting WiseTech's existing UI kits. This is an incremental migration, not a new design-system or form-library project.

The work is complete only when:

- all in-scope employee choice surfaces use the shared kit;
- excluded legacy surfaces are documented and remain intentionally unchanged;
- employee gender is a five-value string enum from database to UI;
- legacy numeric gender data is migrated without data loss;
- neutral payroll handling is explicit and configuration-gated;
- hidden reveal fields are cleared and omitted from payloads;
- audit, typecheck, lint, unit, accessibility, migration, payroll, and available E2E gates pass;
- every failed or unavailable verification has an owner and release disposition.

## 2. Non-negotiable repository rules

- Frontend repository: `wisetech-frontend`; backend repository: `wisetech-backend`.
- Read each repository's `AGENTS.md`, handbook, DRY guidance, tenancy guidance, and current daily report before implementation.
- Preserve unrelated dirty-worktree changes.
- Do not add `.css` files, `<style>` blocks, Bootstrap classes, `react-bootstrap` components, raw Bootstrap layout, or a parallel CSS/token system.
- Do not create `design-system/`, generic duplicate fields, feature-local choice primitives, or a parallel form library.
- Search `src/app/modules/common/components/ui` and `src/app/modules/common/inputs` before adding a primitive.
- Import public frontend components from `@app/modules/common/components/ui`.
- Use existing `WtField`, `WtFieldFormik`, `WtDateField`, `WtDateTimeField`, `WtChoice`, `WtChoiceField`, `WtSwitch`, `WtCheckbox`, `WtButton`, `GlassDialog`, `GlassDialogActions`, `FormSection`, and `SettingsSection`.
- Existing `RadioInput`, `TextInput`, `DropdownInput`, and similar inputs remain compatibility adapters only. No new feature code may import them.
- Existing Bootstrap/CSS debt is not expanded. Removing it from a touched file is a separate cleanup task unless that file is listed in the migration manifest below.

## 3. Scope boundary and migration manifest

### In scope

The audit manifest must include these surfaces and any direct extracted choice subcomponents:

- onboarding: `forms/onboarding/OnboardingSections.tsx`;
- employee wizard: `wizard/forms/BasicInfo.tsx`, `AppSettings.tsx`, `MealPreference.tsx`, and `wizard/steps/StepAppSettings.tsx`;
- employee settings: `components/AppSettingsModal.tsx`;
- candidate/profile: `recruitment/CandidateMealSection.tsx`, `modules/accounts/components/settings/cards/ProfileDetails.tsx`;
- employee rules/configuration: attendance `Rules.tsx`, personal loan `LoanApplicationForm.tsx`, and admin `KPISettings.tsx`;
- any newly discovered employee create/edit wizard choice surface, which must be added to the manifest before migration.

### Explicitly out of scope for this wave

- CRM/client-contact gender and contact forms. They keep their separate contact-domain enum and may be migrated in a later wave.
- `SegmentedControl` used as a non-form filter, view selector, import mode selector, photo editor control, or navigation control.
- Unrelated native checkboxes/radios used for table selection, permissions trees, maps, uploads, or non-employee configuration.
- No `RadioInput` consumer remains in the repository after this wave; the adapter and its test are deleted.

The audit script must fail if an in-scope file is omitted, but must not require CRM/contact or non-form controls to use `WtChoiceField`.

## 4. Shared kit contract

Add and export from `src/app/modules/common/components/ui`:

- `WtChoice.tsx`: controlled primitive;
- `WtChoiceField.tsx`: Formik adapter;

Public types:

```ts
type ChoiceVariant = "switch" | "segmented" | "cards";

interface WtChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface WtChoiceFieldProps<T extends string | boolean> {
  name: string;
  label: string;
  variant: ChoiceVariant;
  options?: readonly WtChoiceOption<Extract<T, string>>[];
  helperText?: string;
  required?: boolean;
  reveal?: React.ReactNode | ((value: T) => React.ReactNode);
  clearRevealOnDisable?: boolean;
  clearOnDisable?: readonly string[];
  showChangedMarker?: boolean;
  disabled?: boolean;
}
```

Behavior contract:

- `switch` renders a native checkbox with `role="switch"`, `aria-checked`, and a single accessible label.
- `segmented` and `cards` render native radio inputs in a labelled `fieldset`/`legend` group with radiogroup semantics.
- Keyboard support is Space/Enter selection, arrow-key movement, roving tab index, and no keyboard trap.
- Minimum target is 40px desktop and 44px touch.
- Focus-visible styling, disabled state, disabled reason, helper text, error text, `aria-describedby`, `aria-invalid`, and group-level error styling use MUI theme tokens and `sx` only.
- Reduced-motion behavior is implemented with theme/style media queries; no new stylesheet is allowed.
- `true`/`false` and `"true"`/`"false"`/`"1"`/`"0"` are accepted during migration. A field preserves the existing wire representation when toggled.
- `clearOnDisable` clears each dependent Formik value, touched state, and error state. `clearRevealOnDisable` defaults to true for onboarding reveal controls and delegates to the same mechanism.
- Disabled reveal content is unmounted or excluded from serialization. Submit builders must also omit cleared dependent keys rather than sending empty legacy values.
- Changed markers compare field values with `initialValues`, do not render in create mode, and disappear after `resetForm`.

`SegmentedControl` keeps its existing visual behavior for non-form callers until an explicitly listed migration changes it.

## 5. Employee UI migration

Use the existing fullscreen wizard/dialog shell and form sections. Do not replace the shell or introduce Bootstrap layout.

- Boolean system access, app settings, attendance, loan, KPI, and approval settings use `WtChoiceField variant="switch"`.
- Additional TDS and retention use a switch plus reveal. Turning the switch off clears all dependent values, touched state, and errors; turning it on restores only declared defaults.
- Employee type uses `variant="cards"`.
- Gender uses required `variant="segmented"` with exactly `MALE`, `FEMALE`, `OTHER`, `NON_BINARY`, and `PREFER_NOT_TO_SAY`; no fallback selection is allowed.
- Marital status, meal preference, candidate meal, and profile meal use segmented radio groups.
- More than four exclusive choices use the existing kit select/picker, not a new choice variant.
- Remove local `ChoiceField` implementations, boolean Yes/No segmented controls, and gender fallback-to-first-option behavior.
- Remove migrated files from `.eslint-ui-baseline.cjs`.
- Keep `no-restricted-imports` for `RadioInput` so the deleted adapter cannot be reintroduced by new feature code.

## 6. Employee gender and payroll migration

Use a dedicated employee-domain Prisma enum; CRM contact gender remains separate:

```prisma
enum EmployeeGender {
  MALE
  FEMALE
  OTHER
  NON_BINARY
  PREFER_NOT_TO_SAY
}
```

Update the employee model, Prisma migration, schemas, service/model types, request normalization, serializers, filters, import/export, pre-hire mapping, frontend payload builders, displays, avatar helpers, and list/detail/profile views.

Migration mapping is exact:

| Legacy value | New value |
|---|---|
| `0` | `MALE` |
| `1` | `FEMALE` |
| `2` | `OTHER` |
| `NULL` | `NULL` |

Data-safety requirements:

- Take the normal database backup and record row counts before migration.
- Run a preflight query that reports unsupported non-null legacy values; abort rather than silently converting them.
- Apply the migration transactionally where supported, verify counts by mapped value, then regenerate Prisma client.
- Existing nulls remain readable. New create/update requests require an approved string enum.
- Legacy numeric inputs are normalized only at the API boundary and are logged/metriced for removal; they are not accepted indefinitely as a new frontend contract.
- Define and test the rollback procedure before production release. Rollback must not destroy the original backup or silently remap new enum values.

Payroll contract:

- `MALE` and `FEMALE` use the existing statutory paths.
- `OTHER`, `NON_BINARY`, and `PREFER_NOT_TO_SAY` use only `professionalTax.other`.
- Missing neutral configuration throws a stable, testable configuration error and blocks the calculation.
- No neutral value may be silently mapped to male or female.
- Payroll/configuration owners must supply and approve neutral slabs before production enablement. The implementation must not invent statutory amounts.
- Add fixtures for all five values, missing-config failure, serialization, and tenant/config isolation.
- Release gate: neutral values remain disabled in production until the approved configuration is present and verified in the target tenant(s).

## 7. Audit, lint, and legacy debt policy

`wisetech-frontend/scripts/audit-choice-fields.mjs` must be Windows-compatible and exit `1` on any violation. It must use one checked-in manifest for in-scope files and verify:

- every manifest file exists and uses `WtChoice`/`WtChoiceField`;
- no manifest file imports or renders `RadioInput`;
- no local choice implementation remains;
- no numeric gender option exists;
- boolean settings do not use segmented/tablist semantics;
- `WtChoice` contains native checkbox and radio semantics;
- each migrated switch/radio field has the expected semantic variant;
- no manifest file remains in `.eslint-ui-baseline.cjs`;
- no new feature file imports compatibility inputs.

The audit must report excluded CRM/contact and non-form surfaces separately rather than treating them as violations. Existing unrelated Bootstrap/CSS warnings may remain only when listed in a debt register; no new warning may be introduced by this migration.

The UI README must contain the decision table:

| Requirement | WiseTech kit choice |
|---|---|
| Boolean setting | `WtChoiceField variant="switch"` |
| Short exclusive choice | `WtChoiceField variant="segmented"` |
| Consequential exclusive choice | `WtChoiceField variant="cards"` |
| More than four options | Existing `WtFieldFormik` select/picker |

## 8. Delivery and rollout

### Phase 1 - Audit and freeze scope

- Read repository instructions and record the current dirty-worktree boundary.
- Produce the manifest and exclusion list above.
- Map Formik names, API names, stored values, validation, dependencies, authorization, and audit behavior.
- Record baseline task success, completion time, validation failures, and configuration error rate where instrumentation exists.
- Confirm payroll neutral configuration owner and release gate.

### Phase 2 - Shared kit

- Implement and export the shared choice components.
- Add tests and README examples before migrating callers.
- Add lint restrictions and make the audit script fail closed.

### Phase 3 - Frontend migration

- Migrate the full manifest in small waves, preserving save/reset and existing wire values.
- After each wave run typecheck, targeted tests, audit, and the relevant manual keyboard/theme checks.
- Remove baseline entries only after the wave passes.

### Phase 4 - Backend migration

- Add enum and migration with preflight, backup, verification, and rollback notes.
- Update all employee API boundaries and payroll paths.
- Run backend typecheck, migration checks, serialization tests, and payroll tests before exposing new values.

### Phase 5 - Release verification

- Deploy backend compatibility before frontend enum values are enabled.
- Verify neutral payroll configuration in every target tenant.
- Roll out frontend usage after backend verification; retain the existing rollback process rather than adding a new feature-flag framework.
- Monitor validation errors, employee-save failures, payroll configuration errors, numeric-gender normalization counts, and audit failures.
- Roll back frontend first if needed, then backend only according to the tested database rollback procedure.

## 9. Verification matrix

Frontend commands:

```text
pnpm run type-check
pnpm run lint
pnpm run audit:choices
pnpm run test -- src/app/modules/common/components/ui/WtChoice.test.tsx src/app/modules/common/components/ui/WtChoiceField.test.tsx
pnpm run build
```

Backend commands:

```text
pnpm run type-check
pnpm run prisma:check
node --require ts-node/register --require tsconfig-paths/register --test --test-force-exit src/utils/__tests__/employeeGender.test.ts src/utils/payroll/__tests__/payrollPipeline.test.ts src/schemas/__tests__/payroll.schema.test.ts
```

The backend `test:unit` script is the full unit suite and must also run in CI. The command above is the deterministic focused gate for this migration. A failed command is not silently waived: record the environment failure, reproduce it in CI or a clean machine, and mark the release gate blocked until the required check passes.

Required test cases:

- switch changes and preserves boolean wire representations;
- native switch/radio roles, labels, focus, keyboard navigation, disabled reasons, helper/error association, and `aria-invalid`;
- required empty Gender fails without selecting an option;
- reveal rendering, clearing of values/touched/errors, omission from payload, and default restoration;
- changed marker in edit mode and disappearance after `resetForm`;
- light/dark themes, responsive 360px layout, reduced motion, and touch target sizing;
- all five gender enum values, numeric migration, null preservation, invalid rejection, create/update compatibility, list/detail serialization, and import/export mapping;
- neutral payroll fixtures, missing-slab failure, and tenant/config isolation;
- create/edit E2E flows, save/reset, invalid Gender, reveal on/off, mobile, keyboard-only, theme, and payload compatibility.

Accessibility verification must run axe against switch, segmented, cards, and each migrated screen. It must confirm no duplicate labels, correct group names, focus visibility, error announcement, and helper association.

## 10. Definition of done

- The plan and implementation reference only actual WiseTech kits and repository paths.
- No new CSS, Bootstrap, duplicate form library, or feature-local choice primitive exists.
- `WtChoiceField` is typed, Formik-compatible, accessible, documented, exported, and covered by tests.
- Every in-scope manifest file uses the shared kit; every excluded surface is explicitly documented.
- `RadioInput` has zero repository usages and is deleted.
- Employee gender is the five-value string enum end-to-end with safe legacy migration and rollback evidence.
- Neutral payroll handling is explicit, tenant-safe, approved, and configuration-gated.
- Reveal fields clear values/errors and are excluded from payloads.
- Baseline entries are removed only after the corresponding wave passes.
- The audit script returns zero violations.
- Frontend/backend typechecks, lint, focused tests, axe, migration checks, payroll checks, and available E2E checks pass, or an explicit release-blocking exception is recorded.

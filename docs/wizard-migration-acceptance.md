# WISETECH ERP — Wizard Migration Acceptance & Release Gates

**Status:** Proposed QA / delivery standard · **Version:** 1.0-draft · **Date:** 2026-10-22  
**Owners:** Frontend Lead + QA · **Approvers:** Module Owner, UX, Backend/Security where applicable  
**Governing plan:** [`wizard-engine-unification.md`](./wizard-engine-unification.md)  
**Companions:** [`wizard-ux-contract.md`](./wizard-ux-contract.md) · [`wizard-engine-contract.md`](./wizard-engine-contract.md)

> **Goal:** Establish objective evidence that each migrated workflow keeps its previous data and business behavior while conforming to one enterprise-grade `EnterpriseFormWizard` shell. Checkboxes below are **acceptance requirements**, not claims that the work has already passed.

## 1. Scope and release inventory

The governing plan describes "7 wizard flows" in its SMART goal but enumerates **six confirmed ordinary form workflows** plus an import/migration category requiring assessment. Resolve this scope explicitly rather than reporting a false count.

| ID | Confirmed flow | Legacy implementation described by master plan | Target config | Create | Edit | Migration status |
|---|---|---|---|---|---|---|
| WZ-01 | Lead | `LeadWizardModal` / `LeadWorkspace` | `leadWizardConfig.ts` | Test | If supported, test | Not verified |
| WZ-02 | Company | `NewCompanyForm` / `CompanyWorkspace` | `companyWizardConfig.ts` | Test | If supported, test | Not verified |
| WZ-03 | Contact | `ClientContactsForm` / `ContactWorkspace` | `contactWizardConfig.ts` | Test | If supported, test | Not verified |
| WZ-04 | Candidate | `CandidateWizardHost` + grouped steps | `candidateWizardConfig.ts` | Test | If supported, test | Not verified |
| WZ-05 | Job create | `JobCreateWizardHost` + grouped steps | `jobWizardConfig.ts` | Test | If supported, test | Not verified |
| WZ-06 | Employee | `NewEmployeeWizard` | `employeeWizardConfig.ts` | Test | Test | Not verified |
| WZ-07? | Lead legacy migration / bulk import | `LegacyMigrationWizard`, `LeadBulkImport` | Classification decision pending | Define after inventory | Define after inventory | Not classified |

**Exclusions:** Roles & permissions is kit-chrome cleanup, not a form-wizard move. Metronic wizard demo is slated for deletion, not migration.

**Evidence rule:** “If supported” means verify against currently supported functionality. Record N/A with a reason and module-owner approval; never count an unimplemented edit capability as a passing test.

## 2. Definition of ready (before implementing each flow)

- [ ] Legacy route/screen and behavior captured in screenshots/video, including all steps and review panel.
- [ ] Current API request/response payload samples captured in a secure test fixture (redacted; no production PII).
- [ ] Create/edit availability established, and nested launch contexts enumerated.
- [ ] Existing validation rules, defaults, dependent selections, server errors, and side effects documented.
- [ ] Complete field-to-API mapping, with types, enum values, requiredness, and optional/conditional visibility.
- [ ] Navigation policy and applicable step counts recorded, including optional/skipped steps.
- [ ] UI preset (`steps` / `sections`) and presentation (`modal` / `page`) approved by UX.
- [ ] Feature flag owner, rollback procedure and staging route documented.
- [ ] Known legacy defects classified (fix before migration, fix during approved change, or intentionally preserve pending another ticket).

## 3. Release gates at a glance

| Gate | Timing | Must demonstrate | Approver |
|---|---|---|---|
| G0 — Baseline captured | Before coding flow | Old behavior, payloads, dependencies, test data, screenshots | QA + module owner |
| G1 — Engine contract ready | Before major flow moves | Shared shell, stepper, guards, validation/focus, kit theme, engine unit tests | Frontend lead |
| G2 — Flow parity | Per flow, before flag-on staging | Create/edit parity, payloads, nested flows, errors, draft behavior, no critical regressions | Module owner + QA |
| G3 — UX/accessibility | Per flow, before rollout | Approved visual states, keyboard/focus, mobile/reflow, dark mode | UX + QA |
| G4 — Staging soak & rollback | Per flow | Production build smoke, error logs, flag toggle and rollback test; governing plan suggests one week on staging | Release owner |
| G5 — Final retirement | After all flows pass | Legacy imports removed, baseline ratcheted, feature flags retired, docs updated | Frontend lead + QA |

**Blocking rule:** Do not promote a flow if it fails any applicable critical gate. A non-critical deviation requires a documented issue, risk acceptance, owner and planned fix date.

## 4. SMART acceptance targets

These are **proposed targets**, not measured current values. Capture baseline before evaluating improvement.

| Indicator | Proposed acceptance target | Method |
|---|---|---|
| Data compatibility | 100% of approved request/response contract checks pass | Snapshot/contract tests; key order may differ but semantics and values must match |
| Critical regression | 0 unresolved Sev-1/Sev-2 defects | QA issue list |
| Production build routing | 100% of supported create/edit wizard routes smoke-tested | `vite build` → `vite preview` + automated browser smoke |
| Visual consistency | 100% of common shell states match approved references | Screenshot comparison + manual UX review |
| Accessibility | WCAG 2.2 AA target; 0 axe critical/serious findings in tested flows | Automated scan **plus manual** keyboard/screen-reader review |
| Core engine coverage | Tests for all state transitions, validation/focus, dirty guard and submission paths | Unit/RTL coverage by behavior; avoid percentage-only gate |
| Workflow usability | ≥ 95% task success in representative pilot scenarios (goal) | Moderated tasks; capture baseline and sample size |
| Task completion | Aim for ≥ 25% reduction in median time vs baseline (aspirational) | Same scenarios and comparable participants |
| Security/privacy | 0 known unauthorized actions or sensitive payload logging | Backend authorization tests and logging audit |
| Migration completion | No legacy wizard imports in target files; no wizard entries in UI baseline | `rg`, lint, dependency audit |

Aspirational usability targets are **not** reasons to manipulate data or claim success without a baseline. Report measured results, sample sizes and conditions.

## 5. Universal functional test matrix

For each applicable flow, run the same scenarios with different fixture data.

| Test ID | Scenario | Expected outcome | Applies to |
|---|---|---|---|
| FUN-01 | Open create workflow | Correct module-specific title, default state, first step | All create |
| FUN-02 | Open edit workflow | Existing values hydrated once; no accidental reset | Supported edit |
| FUN-03 | Advance with missing required field | Inline errors shown; focus routed to first invalid field; step not advanced | All |
| FUN-04 | Complete valid step, Continue | Current advances; values retained; completion reflects saved/valid policy | All |
| FUN-05 | Click Previous Step after edits | No exit warning; values preserved | All with >1 step |
| FUN-06 | Click non-current step | Respects documented navigation policy; current state evident | All |
| FUN-07 | Submit with error on earlier step | Navigate to first error step; show stepper error; values retained | All |
| FUN-08 | Submit valid data | Exactly one backend submit; success feedback; expected redirect/close | All |
| FUN-09 | Double-click submit / slow network | No duplicate record or conflicting repeated submission | All |
| FUN-10 | Backend validation error | Error shown at field/step or form level; edit state remains intact | All |
| FUN-11 | Network failure during submit | Clear retry, no false saved indicator, values recoverable | All |
| FUN-12 | Change conditional parent field | Dependents reveal/hide/reset according to feature rule; no stale payload data | Applicable |
| FUN-13 | Resume draft | Correct values, active step and schema version restored safely | Draft-enabled |
| FUN-14 | Save draft failure / conflict | Never report saved; recover or guide retry | Draft-enabled |
| FUN-15 | Clean Close/Cancel/Esc | Closes without unnecessary confirmation | All permitted exit modes |
| FUN-16 | Dirty Close/Cancel/Esc | Centralized guard; Stay preserves form; Discard exits | All permitted exit modes |
| FUN-17 | Browser back / route leave | Warns if dirty where browser supports; safe route handling | Page/modal routes |
| FUN-18 | Reload/tab close | Browser-supported best-effort prompt or restore; no false guarantee | All |
| FUN-19 | Nested create success | Returns new value to parent, parent state/focus preserved | Applicable |
| FUN-20 | Nested create cancellation | Parent remains unchanged, no unexpected reset | Applicable |
| FUN-21 | Upload invalid file / network failure | Accessible error and retry, no loss of unrelated fields | Upload flows |
| FUN-22 | Switch create/edit / late fetched data | Never unexpectedly overwrite user's entered values | Supported edit |
| FUN-23 | Conditional step becomes inapplicable | Step removed from denominator; navigate safely if active | Conditional flows |
| FUN-24 | Dependency changes after completion | Former completion re-evaluates; no false 100% | Dependent flows |
| FUN-25 | Direct deep-link refresh | Route loads in Vite production preview and Amplify SPA config | Supported routes |

For edit workflows, compare changed and unchanged fields. A UI-only change must not cause unrelated payroll or employee fields to be overwritten.

## 6. Deterministic progress test cases

| Test ID | Setup | Expected position and completion |
|---|---|---|
| PRG-01 | 5 applicable steps; currently on first, none completed | `Step 1 of 5`, `0 of 5 completed`, `0%` |
| PRG-02 | 5 applicable steps; currently on third, first completed | `Step 3 of 5`, `1 of 5 completed`, `20%` |
| PRG-03 | 11 leaf steps inside 4 groups; none completed | `0 of 11 completed`, `0%`; groups not counted |
| PRG-04 | A conditional leaf step disappears from 5 total | Denominator becomes 4; remaining count recomputed |
| PRG-05 | 4 steps complete; edit a dependent field that invalidates one | Completion drops to 3 of 4 and affected step shows incomplete/error |
| PRG-06 | Explicitly skip optional applicable step | Reflect `skipped` and globally approved denominator/count policy |
| PRG-07 | Reopen saved draft on third step | Position is third; completion reflects authoritative valid/saved status, not cursor |
| PRG-08 | Final submission validation fails | No 100%-success presentation; focus/error marker routes correctly |

**Open product decision:** Are skipped-but-applicable optional steps counted complete? Set the policy once in the UX/engine contracts, add it as a test fixture, then update this matrix.

## 7. Visual consistency matrix

Capture approved reference screenshots for **simple and grouped** presets, using representative form density rather than only empty screens.

| Test ID | Dimension | Acceptance checks |
|---|---|---|
| VIS-01 | Header | Correct title per module (no unrelated "Employee Onboarding"), consistent height and close placement |
| VIS-02 | Active step | One h2-equivalent title; useful subtitle; no duplicate heading in nested card |
| VIS-03 | Sidebar | Identical state vocabulary, badges, alignment, group affordances |
| VIS-04 | Progress | Same format/logic; completed vs position differentiated |
| VIS-05 | Form controls | Same field height, label placement, error text, help text and focus ring |
| VIS-06 | Selection controls | Matching shape/spacing/selected state; suitable radio/checkbox/switch semantics |
| VIS-07 | Content density | Standard readable content max width and section spacing; no unnecessary double/triple cards |
| VIS-08 | Summary | Consistent label/value format, empty state, optional/mobile visibility |
| VIS-09 | Footer | Same action order, CTA wording, loading/disabled state and keyboard order |
| VIS-10 | Color/theme | Kit theme tokens; light/dark contrast and no raw module-specific hardcoded hex |
| VIS-11 | Responsive | At 360px and tablet widths, form is usable; no clipped buttons, summary collapses |
| VIS-12 | Accessibility / zoom | At 200% browser zoom focus, labels and footer controls remain reachable |

**Visual comparison policy:** Store reference captures in a versioned test artifact location, document approved intentional differences, and review pixel diffs alongside actual usability (not blind pixel-perfect scoring).

## 8. Accessibility acceptance

- [ ] Dialog title/description associated with dialog; initial focus and return focus correct.
- [ ] Page mode uses appropriate landmarks and heading order.
- [ ] Active step communicated through `aria-current="step"` (or equivalent correct semantics).
- [ ] Keyboard can operate step rail, grouped navigation, inputs, date controls, upload and footer.
- [ ] Focus indicators visible in light/dark/high-contrast-compatible settings; no status conveyed only by color.
- [ ] Errors announced and programmatically associated with affected controls.
- [ ] On step transition, focus lands predictably; on validation failure, first relevant error is reachable/focused.
- [ ] Touch/pointer targets satisfy WCAG 2.2 target-size requirements or valid exceptions.
- [ ] Reflow at 200% zoom and narrow viewport; no content obscured by sticky footer.
- [ ] Screen-reader pass on at least one supported browser/AT combination per preset, including modal and grouped mode.
- [ ] Automated axe check has zero critical/serious findings; manual checks address what axe cannot detect.
- [ ] Reduced-motion preference and disabled/loading state announcements are respected.

Automated compliance reports alone do **not** establish WCAG conformance; document manual evidence.

## 9. Workflow-specific regression supplements

### WZ-01 — Lead

- [ ] Existing lead create data matches legacy endpoint payload.
- [ ] Company hierarchy/address cascading values persist as before.
- [ ] Nested company/contact creation returns the expected selection.
- [ ] `LeadWorkspace` feature-flag default path behaves like the retained legacy route.
- [ ] Complex `LeadWizardModal` legacy behaviors inventoried before deletion.

### WZ-02 — Company

- [ ] Logo upload/preview/remove and size/type rules preserved.
- [ ] Company type → service → sub-service cascades preserved, including invalidation/reset semantics.
- [ ] Stable `<CompanyWizard>` entry API works from Leads, Contacts, Projects and Overview.
- [ ] Create/edit (if supported), server errors, required fields and summary values preserved.

### WZ-03 — Contact

- [ ] Photo and name/phone/email validation preserved.
- [ ] Company/link and branch prefill behavior preserved.
- [ ] Google Contacts prefill path still works, including formatting/mapping.
- [ ] Nested contact create from Company returns the expected selection.

### WZ-04 — Candidate

- [ ] Every actual child of `buildCandidateWizardGroups` maps to a stable leaf-step ID.
- [ ] Personal details, background, application and document grouping preserved.
- [ ] Role & screening details preserve current/expected salary (₹), experience (months), notice (days), source and approved-open role filtering.
- [ ] Uploaded documents, conditional visibility and progress count accurate.
- [ ] Any candidate privacy/consent requirements are preserved.

### WZ-05 — Job create

- [ ] Existing internal role, advert and screening stages mapped exactly.
- [ ] Branch, department → designation cascade and headcount/CTC bounds preserved.
- [ ] Approved-open-role selection restriction enforced backend-side when relevant.
- [ ] Stage, target start date, seniority, remote/show-salary flags behave as before.
- [ ] Metronic-specific icon imports are absent in migrated flow.

### WZ-06 — Employee

- [ ] All actual steps/fields of `NewEmployeeWizard` captured (master plan notes ~21 step forms); no field silently omitted.
- [ ] Salary-based/contract-based employment semantics unchanged.
- [ ] Overtime, additional TDS, retention, attendance exemption and permissions map exactly to existing API fields.
- [ ] Employee active/inactive is not confused with system-account access.
- [ ] Edit mode does not overwrite unrelated HR/payroll fields.
- [ ] `react-phone-input-2` production CJS issue fixed/tested before rollout.
- [ ] Sensitive field updates respect backend permissions and audit trail where supported/required.

### WZ-07? — Import / migration flows

- [ ] Assess whether `LegacyMigrationWizard` / `LeadBulkImport` are better modeled as a specialized import workflow with shared kit chrome.
- [ ] Record owner-approved classification and tests (file upload, preview, mapping, partial failures, rollback) separately if excluded from ordinary form engine.
- [ ] No silent inclusion in the six-flow parity score.

## 10. Technical quality, CI and build safety

### 10.1 Shared engine checks

- [ ] One engine owns stepper/footer/dirty guard; no second UI implementation is introduced.
- [ ] All wizard flow configs contain stable `step.id` and no duplicated IDs.
- [ ] No feature imports `WizardSidebar` or `SummarySidebar` for standalone composition.
- [ ] `WtStepper` API actually supports needed error/grouped/focus states, or generic adapter is tested.
- [ ] All migrated wizard files use `FormSection` and approved kit fields.
- [ ] `react-toastify`, Bootstrap classes, Metronic icon assumptions and raw `react-select` removed from migrated wizard code.
- [ ] A11y, dark mode and responsive rules enforced at engine/component level.
- [ ] Client-error telemetry includes flow + step ID but no sensitive form values.

### 10.2 Production-build smoke

Recommended automated route smoke:

```bash
# Use the actual package-manager/build scripts in the repo.
# The governing plan explicitly requires a Vite production build/preview.
vite build
vite preview

# In a browser E2E harness, open each supported create/edit route;
# assert root renders, no uncaught runtime exception, and key controls respond.
# Also verify Amplify SPA deep links on the deployed staging environment.
```

Vite commands assume `vite` is resolved by package scripts, local install or `npx`; adjust to the repository rather than blindly running globally. Include phone control smoke against the resolved CJS/ESM import path.

### 10.3 Source/deprecation audit

```bash
# Evaluate matches deliberately; during migration the legacy path will still
# exist behind flags. Final "zero" applies at G5, after wrappers/cleanup.
rg -l 'OnboardingWizard|FullscreenWizardModal|UnsavedChangesModal|modules/wizards' src
rg -n "from ['\"](react-bootstrap|react-toastify|react-select|react-phone-input-2)|@metronic/|inputs/(TextInput|RadioInput|DropdownInput|MonthYearInput)" src/shared/form-engine src/app/pages/employee
rg -n 'form-engine|employee/(wizard|forms|recruitment)|leads/lead|companies/(forms|companies/components|contacts/components)' .eslint-ui-baseline.cjs
```

**Interpretation warning:** An `rg` result is not automatically a failure during rollout; classify intentional compatibility wrappers vs prohibited new dependencies. At final retirement, flag every surviving legacy import with owner and justification. Also verify that documented import references in comments/tests aren't incorrectly treated as runtime dependencies.

## 11. Evidence package required for each migration PR

Store or link the following in the PR description:

| Evidence | Minimum item |
|---|---|
| Baseline | Legacy screen video/screenshots, field/payload inventory |
| Technical | Contract/unit tests, `vite build` and preview smoke results |
| Data parity | Redacted before/after payload snapshots with approved intentional differences |
| Functional QA | Matrix statuses (pass/fail/N/A) and defects |
| UX | Before/after desktop and mobile captures for both themes |
| Accessibility | axe report + manual keyboard/focus/screen-reader notes |
| Dependency safety | Production CJS/phone, route, nested create/prefill tests as applicable |
| Rollout | Feature flag, staging soak observation, rollback procedure and result |
| Sign-off | QA, module owner, and UX; backend/security when sensitive changes apply |

### 11.1 PR acceptance template

```md
## Flow / scope
- Flow: WZ-__
- Mode(s): Create / Edit / Both
- Feature flag: wizardEngine.__
- Legacy host preserved during rollout: Yes / No

## Changes
- Config + host: ...
- Kit components/adapters: ...
- API mapping changes: None / Approved (ticket)

## Tests
- [ ] Engine tests green
- [ ] Flow create/edit E2E green or justified N/A
- [ ] Payload snapshot parity green
- [ ] Nested/prefill/dependency scenarios green or justified N/A
- [ ] Visual desktop/mobile light/dark review green
- [ ] Keyboard + accessibility review green
- [ ] Production build + route/deep-link smoke green
- [ ] Dirty, draft, exit and rollback behaviors verified

## Risks / exceptions
- Open defects: ...
- Accepted exceptions with owner/due date: ...

## Sign-off
- QA: ...
- Module Owner: ...
- UX: ...
- Backend/Security (if needed): ...
```

## 12. Release and rollback runbook

1. Enable migrated workflow flag only in staging / internal cohort.
2. Verify real navigation paths, create/edit, nested creation, API payloads, dark mode and mobile.
3. Watch tagged client errors and backend failures during the agreed staging soak (master plan suggests one week per flow).
4. If a critical defect occurs, disable **only that flow's** flag, confirm legacy path serves requests, and assess persisted data compatibility.
5. Correct issue and rerun the affected matrix plus critical smoke; repeat flag-on acceptance.
6. After all flows pass, remove legacy bodies and unneeded wrappers in separate cleanup PRs.
7. Ratchet `.eslint-ui-baseline.cjs`, remove flags only when rollback window expires, update kit README and `docs/bootstrap-to-kit-migration.md`.

**Rollback constraint:** Visual rollback cannot undo API/data changes. Because the migration intends **no API contract changes**, verify this invariant before enabling a reversible frontend flag.

## 13. SMART milestone scoreboard

Aligned to the governing ~10-week, five-sprint **proposed** schedule; these dates are estimates and can change after repo validation.

| Milestone | Expected deliverable | Gate |
|---|---|---|
| Phase 0, days 1–3 | Stabilization, source audit, CI smoke, import freeze | G0 |
| Phase 1, weeks 1–2 | Kit-only `EnterpriseFormWizard`, stepper/guards/validation | G1 |
| Phase 2, weeks 2–3 | Kit field layer/adapters, phone/location | G1 |
| Phase 3, weeks 4–8 | Lead → Company → Contact → Candidate → Job → Employee; each PR + flag | G2/G3/G4 per flow |
| Phase 4, weeks 9–10 | Retire legacy, update docs, clear baseline, remove flags | G5 |

**Per-flow throughput metric:** Count approved flows, not mere changed files. If Lead and Company pass but Contact is feature-flagged with failing E2E, report **2 of 6 accepted**, not 3.

## 14. Final program sign-off

### Functional parity

- [ ] Six confirmed form workflows pass all applicable create/edit tests (N/A cases justified).
- [ ] Required and cross-step validation match approved business behavior.
- [ ] Backend payload contracts preserved or explicitly approved and versioned.
- [ ] Company and Contact nested entry points/prefill continue to work.
- [ ] Candidate/Job/Employee dependent-field and sensitive-business rules verified.

### Consistency and accessibility

- [ ] One approved header/stepper/footer/status vocabulary across workflows.
- [ ] Preset difference (`steps` versus `sections`) is intentional and consistent.
- [ ] Progress count and percent never confused with navigation position.
- [ ] Light/dark, 360px, desktop, 200% zoom, keyboard and screen reader reviewed.
- [ ] Errors, loading, saved/draft states are accessible and unambiguous.

### Technical retirement

- [ ] No prohibited legacy wizard runtime imports remain; deletion validated with `rg` and build.
- [ ] `OnboardingWizard`/`FullscreenWizardModal` retired; thin public wrappers kept only if needed.
- [ ] Metronic wizard demo removed with route.
- [ ] `.eslint-ui-baseline.cjs` updated; lint and tests green.
- [ ] Client-error telemetry, CI smoke and rollback runbook documented.
- [ ] Kit README, migration docs and new-wizard guide updated.
- [ ] Import/migration workflow classification documented separately.

### Final sign-off record

| Role | Name / link | Status / date |
|---|---|---|
| Frontend owner | _TBD_ | _Pending_ |
| QA owner | _TBD_ | _Pending_ |
| UX/product owner | _TBD_ | _Pending_ |
| Backend/security | _TBD_ | _Pending if applicable_ |
| Release owner | _TBD_ | _Pending_ |

**Program completion statement (only after evidence exists):** All accepted form wizard workflows run through `EnterpriseFormWizard`, share the same interaction contract, and preserve approved functional/data behavior; legacy implementations are retired and repeatable quality gates are green.

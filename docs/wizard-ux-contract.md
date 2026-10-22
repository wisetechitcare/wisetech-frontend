# WISETECH ERP — Wizard UX Contract

**Status:** Proposed for design and engineering approval  
**Version:** 1.0-draft · **Date:** 2026-10-22 · **Owner:** Frontend + UX + QA  
**Governing plan:** [`wizard-engine-unification.md`](./wizard-engine-unification.md)  
**Related specifications:** [`wizard-engine-contract.md`](./wizard-engine-contract.md) · [`wizard-migration-acceptance.md`](./wizard-migration-acceptance.md)

> **Purpose:** Make every multi-step create/edit workflow feel like one WISETECH product while allowing different business processes to have different fields, groups, and lengths. This is a **proposed UX contract**, not an assertion that the existing kit already implements every rule.

## 1. Scope and non-goals

This contract applies to the **six confirmed form workflows** in the master plan:

| Workflow | Current implementation noted in master plan | Target |
|---|---|---|
| Lead | `LeadWizardModal` / `LeadWorkspace` | `leadWizardConfig.ts` + `EnterpriseFormWizard` |
| Company | `NewCompanyForm` / `CompanyWorkspace` | `companyWizardConfig.ts` + `EnterpriseFormWizard` |
| Contact | `ClientContactsForm` / `ContactWorkspace` | `contactWizardConfig.ts` + `EnterpriseFormWizard` |
| Candidate | `CandidateWizardHost` / `buildCandidateWizardGroups` | `candidateWizardConfig.ts` + `EnterpriseFormWizard` |
| Job create | `JobCreateWizardHost` / `buildJobCreateWizardGroups` | `jobWizardConfig.ts` + `EnterpriseFormWizard` |
| Employee create/edit | `NewEmployeeWizard` | `employeeWizardConfig.ts` + `EnterpriseFormWizard` |

**Classification pending:** `LegacyMigrationWizard` and `LeadBulkImport` may be specialized import flows. Evaluate their interaction requirements before treating them as ordinary form wizards. `RolesAndPermissions` / `RoleAccessEditor` are **not** wizard migrations. The unused Metronic demo is slated for deletion by the master plan.

**Non-goals:** This document does not change API payloads, Prisma models, HR/payroll rules, role permissions, or decide the contents of every business form. Preserve existing semantics and use adapters for presentation changes.

## 2. Findings behind this contract

The six supplied screenshots demonstrate inconsistent header branding (the words **Employee Onboarding** on unrelated contact/company/recruitment flows), a large blue banner in some flows but not others, inconsistent step/group presentation, differing summary treatments, duplicated section headings, variable card nesting, different density/segmented choices, and ambiguous progress labels such as a section position contrasted with 0% completed.

**Decision:** Fix these issues through a common **wizard shell**, **two navigation presets**, **shared form primitives**, and **one progress vocabulary**, not by copying a particular screenshot into every workflow.

## 3. UX principles and invariant rules

1. **One clear task per screen.** The page shows the workflow title and the active step title; avoid repeating the same heading three times inside nested cards.
2. **Predictable navigation.** Back, Continue, Save draft, Close, and Submit mean the same thing in every workflow.
3. **Separate position from progress.** "Step 3 of 5" means where the user is; "1 of 5 completed" means completed steps. Never substitute one for the other.
4. **Context determines choice of control.** A radio/segmented group is for a mutually exclusive choice; a checkbox is a form attribute; a switch is for a setting applied immediately (when applicable).
5. **The existing business contract wins.** Renaming or inverting an interface label requires a documented adapter and a round-trip test.
6. **Disclosure without surprises.** Only show relevant conditional fields; explain if changing a parent input clears dependent values.
7. **Accessible by default.** Semantic headings/labels, visible focus, full keyboard operation, meaningful error announcements and reflow.
8. **Consistent, not rigid.** Different workflows may have different step counts, groups, summary details and data-entry controls while sharing the same shell.
9. **Minimal visual chrome.** Avoid heavy blue banners, deep nested cards, and repeated outlines when simple spacing and headings communicate structure.
10. **Never hide critical feedback.** Persisted/draft state, blocked navigation and submission errors need explicit in-context feedback.

## 4. Standard anatomy

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Workflow title                          Draft status       Close (X) │
│ Optional short, task-specific description                            │
├───────────────┬───────────────────────────────────┬───────────────────┤
│ Progress      │ Step N of M · Active step title  │ Optional summary  │
│               │ Short guidance                    │ / Review          │
│ Step list /   │                                   │                   │
│ grouped list  │ Form fields / meaningful sections │ No required       │
│               │ Inline errors and help text       │ content solely    │
│               │                                   │ in the summary    │
├───────────────┴───────────────────────────────────┴───────────────────┤
│ Back            Save draft / Cancel          Continue / Create       │
└───────────────────────────────────────────────────────────────────────┘
```

**Header:** Use the true workflow title: **Add New Contact**, **Add New Company**, **Create Job**, **Create Candidate**, **Add Employee**, or **Edit Employee**. Do **not** reuse a static "Employee Onboarding" label across unrelated modules. Close control has an accessible label and follows the exit guard.

**Title hierarchy:** Workflow title (`h1` or dialog label) → step title (`h2`) → section title (`h3`). Don't duplicate section and inner-card titles unless they communicate different concepts.

**Navigation rail:** Current, completed, not started, skipped and error states share one visual language. Group headers may expand/collapse for complex workflows; the current item stays visible.

**Main:** Step instructions plus fields, with grouping driven by relationships, not arbitrary card count. Optional photo uploader fits within the step without forcing the remaining fields into excessively narrow columns.

**Summary:** Optional. Display current form values with explicit `Not provided` / `Not set` where applicable; avoid unexplained em-dashes for required data. It is *not* a substitute for the required final review when a workflow needs one.

**Footer:** Use one kit-based action hierarchy via `GlassDialogActions` or equivalent page variant; sticky only when it does not obscure content/focus. Keep the primary action on the right in desktop LTR layouts. Mobile uses full-width or appropriately sized controls with a clear primary action.

## 5. Two supported navigation presets

| Criterion | `steps` (simple) | `sections` (grouped) |
|---|---|---|
| Intended use | Short, largely linear flows | Long workflows with named groups and nested steps |
| Navigation | Flat numbered steps | Group headings + child steps |
| Desktop | Vertical rail | Expandable grouped rail |
| Mobile | Compact "Step N of M" + access to list | Compact step/group label + accessible step list |
| Progress denominator | Applicable leaf steps | Applicable **leaf steps**, not group headers |
| Example | Contact, Company (confirm during inventory) | Candidate, Employee; Job as needed |

The master plan's proposed `layout: 'sections' | 'steps'` expresses this navigation choice; its `presentation: 'modal' | 'page'` controls the outer container. **Layout and presentation are independent.** Do not introduce module-specific `if (module === 'employee')` branches inside the shared engine.

A one-screen form should not become a multi-step wizard solely to reuse the shell.

## 6. Progress and step semantics

### 6.1 Vocabulary

- **Current position:** `Step N of M` where N is the active applicable leaf step's 1-based position.
- **Completed:** an applicable step that meets the explicit completion predicate (normally visited, valid, and saved/committed according to the workflow's draft model).
- **Pending:** not yet completed; includes not-started and in-progress states.
- **Error:** step with known blocking validation errors.
- **Skipped:** intentionally skipped optional step. A conditional step that does not apply is **excluded**, not shown as a required incomplete step.
- **Group:** navigation category; never double-count it alongside its children.

### 6.2 Calculation

```text
applicableSteps = leafSteps.filter(isApplicable)
completedCount = applicableSteps.filter(isCompleted).length
totalCount     = applicableSteps.length
percent        = totalCount === 0 ? 0 : round(100 * completedCount / totalCount)
```

**Open decision:** Whether an explicitly skipped *optional but applicable* step counts as completed. Recommended default: **do not count it as completed**; separately mark it skipped. If your product chooses another policy, document it once and apply it everywhere.

Rules: (a) only one "current" step, (b) no percentage based on cursor index, (c) never show 100% unless the completion definition is met, (d) when applicability changes, recompute denominator without losing saved values silently, (e) don't call "0 of 11 completed" "Step 0 of 11".

### 6.3 Example

If user is on the third step in a five-step workflow and has completed only the first: **Step 3 of 5 · 1 of 5 completed · 20%**. This is correct and is clearer than showing "60%" based on position.

## 7. Navigation and action behavior

| Action | Expected behavior |
|---|---|
| Continue | Validate current applicable step, show inline errors and focus first error; navigate only when allowed |
| Back to previous step | **In-wizard navigation**: preserve inputs, normally do **not** prompt unsaved-exit confirmation |
| Jump to prior step | Allowed unless the workflow explicitly disallows; preserve data |
| Jump to future step | Block or allow according to an explicit `navigationPolicy`; show why blocked |
| Close / Cancel / route leave / Escape / backdrop | **Wizard exit**: use centralized dirty guard where applicable |
| Browser reload/tab close | Native unload handling is best-effort; never promise a custom modal is always shown |
| Save draft | Save explicitly, show success/error, retain current step; disable duplicate submissions |
| Final Create / Submit / Save changes | Validate all applicable required data, handle pending saves, submit once, show result or clear recovery instructions |
| Nested Create (e.g., Company in Lead) | Child wizard exits back to parent context with new item selected; parent draft and focus preserved |

Distinguish **Back inside the wizard** from **Back that exits the wizard**. The original migration plan groups these under dirty-exit handling; this contract makes the two behaviors explicit.

For creation, final CTA should say **Create Contact**, **Create Company**, **Create Candidate**, etc.; for edit, **Save changes**. Reserve "Submit application" for business workflows that actually submit an application.

## 8. Consistent form-control rules

| Data type | Primary control | Notes |
|---|---|---|
| Required single-line text | `WtFieldFormik` | Visible label, required convention, inline error |
| Date / month-year | `WtDateField` | Clear expected format, localized when needed |
| Phone number | `WtPhoneField` | ESM-safe implementation; explicit country-code handling |
| Address / location | `WtLocationField` | Cascading values preserve existing dependencies |
| One of 2–4 short choices | `SegmentedControl` or accessible radio group | Use same sizing/selected state; support keyboard navigation |
| One of many choices | Select/searchable select | Group/label options; add-option only where permitted |
| Boolean saved as part of form | Checkbox | Describe the setting in positive, clear language where possible |
| Immediate setting with separate save | Switch | Only if the backend persists it immediately and gives status feedback |
| File/image | Kit upload control | Allowed types, limits, preview, remove and upload errors |
| High-impact status | Explicit selector with context | For employment status, access, approvals, sensitive payroll changes |

Use one `FormSection`, one `FormGrid` approach, and shared field primitives. Avoid raw `react-select`, `react-bootstrap`, legacy `TextInput`/`DropdownInput`, or module-local equivalent styles in migrated wizard files; follow the governing plan's ESLint ratchet.

**Required/optional convention:** Keep it consistent within the application. If using `*` for required, explain it once and also expose `required`/`aria-required` semantically. A placeholder is never a substitute for a label.

**Terminology:** Show "Overtime" rather than irregular "Over Time" where it means overtime eligibility. Separate employee activity status from system access. For potentially sensitive personal details (gender, marital status), verify lawful business need, allowed values, privacy notice and optionality with HR; do not expand DB enums implicitly.

## 9. Layout and visual token proposals

**These are design targets to validate in the existing UI kit**, not evidence of current tokens:

| Token / pattern | Proposed target |
|---|---|
| Workflow header | approx. 64–72px, with contextual title and close affordance |
| Navigation rail | approx. 232–256px desktop |
| Optional summary | approx. 240–280px desktop; collapsible mobile |
| Main content | readable maximum around 960–1100px if screen real estate allows |
| Control height | approx. 40–44px; effective targets must satisfy accessibility |
| Label/body typography | 13–14px labels, 14–16px body; shared kit scale wins |
| Card spacing | 24px default; 16px on constrained viewports |
| Inter-field spacing | 16–24px based on relationship |
| Section separation | 24–32px (not multiple deeply nested border boxes) |
| Border, radius, focus | theme tokens, including high-contrast visible focus |
| Primary tone | kit's approved navy/blue semantic tokens (not local hex values) |
| Dark mode | theme tokens only; equivalent selected/error/disabled contrast |

Responsive behavior to test, not hardcoded assumptions about framework breakpoints:

- **Wide desktop:** rail + main content, plus summary only if space permits without crushing inputs.
- **Tablet / narrow desktop:** maintain logical form reading order, collapse summary; avoid three squeezed columns.
- **Mobile (360px baseline):** single-column fields, compact step navigation, summary in expandable Review panel, fully visible footer and keyboard focus.
- **200% browser zoom:** reflow without clipped actionable content; no horizontal scroll for standard form reading except inherently two-dimensional content.

Nested cards: ordinarily one primary card for the step and flat `FormSection` divisions inside. A second card level needs a meaningful reason (e.g. separate warning, conditional sub-task), not visual decoration.

## 10. Empty, loading, error and success states

- **Initial loading:** accessible skeleton or concise busy label; avoid flashing empty defaults before fetched edit values load.
- **Data source failure:** retry action and message tied to the failed data source (e.g., company options could not load).
- **Dependent select loading:** describe dependency ("Choose a department to view designations"); disable appropriately without misrepresenting available values.
- **Inline validation:** mark failing field, show specific remediation, announce errors, preserve entered values.
- **Step errors:** update stepper error markers and offer navigation to first error.
- **Save in flight:** disable duplicate actions and show progress without hiding page state.
- **Save success:** short confirmation with persisted state; close/redirect according to workflow.
- **Conflict/stale data:** preserve unsaved entry and explain available resolution path; don't silently overwrite.
- **Upload failure:** retain the form draft and allow retry without re-entering other fields.

## 11. Accessibility contract

Target **WCAG 2.2 AA** as an acceptance goal, verified with automation **and manual testing**. Implementation guidance:

- Label dialogs (`aria-labelledby`) and provide one clear title; return focus to opener when modal closes.
- On step change, focus step heading (temporarily focusable) or first input according to a tested consistent policy. On error, focus the error summary/first invalid field; do not steal focus while typing.
- Stepper uses meaningful list/navigation semantics and `aria-current="step"` for the active item.
- Groups and radio choices use native controls or correct ARIA patterns. Screen reader users can understand selected, required, invalid and disabled states.
- Focus indicators visible with keyboard; no reliance on color alone. Provide adequate contrast in both themes.
- Errors linked via `aria-describedby`; announce aggregate errors where helpful without overly verbose live regions.
- Every interactive control is operable by keyboard, including grouped stepper, date picker, upload, nested wizard, and collapsible summary.
- Test touch targets, zoom, reflow and reduced-motion preference. Automated axe checks are necessary but not sufficient.

## 12. Workflow-specific permitted differences

| Workflow | Differences allowed | Must stay standardized |
|---|---|---|
| Contact | Photo, company linking, Google-contacts prefill | Shell, actions, save, labels, step state |
| Company | Logo, service cascade, nested create from Leads/Projects | Shell, form controls, dependent-field semantics |
| Lead | Workspace summary, company/contact dependencies | Step state, exit guard, submit feedback |
| Candidate | Deep personal/background/application/documents groups | Group navigation, progress from leaf steps |
| Job | Role selection, advert/approval/screening steps | Header, validation and action hierarchy |
| Employee | Complex 21-form structure and payroll/attendance safeguards | Form semantics, summary, edit/create mode, accessibility |

## 13. UX acceptance checklist

- [ ] Correct business title and subtitle across all workflows (no unrelated global "Employee Onboarding").
- [ ] Step heading and nested section headings have a clear hierarchy with no redundant repeats.
- [ ] Simple and grouped presets have approved desktop/mobile references.
- [ ] Step N of M, completed count, progress percent and optional steps produce correct results.
- [ ] All exit paths share one guard; in-wizard Back does not mistakenly prompt.
- [ ] Every form has standardized control heights, labels, help/error text and selected states.
- [ ] Summary behavior is consistent and never the only place to see critical information.
- [ ] Every field is keyboard-operable; focus, errors, dialog and stepper semantics are verified manually.
- [ ] Light/dark, 360px, 200% zoom, long translated labels, loading and save errors are tested.
- [ ] Representative HR/Recruitment/CRM users understand navigation and finish critical tasks without coaching.

## 14. Open decisions requiring sign-off

1. Which workflows use `steps` vs `sections` after an actual task inventory?
2. Can users navigate ahead to incomplete steps, or only after current-step validation?
3. What does "completed" mean for unsaved local-only changes and explicitly skipped optional steps?
4. When does a workflow autosave versus require an explicit **Save draft**?
5. Is a right review panel useful in each flow, and should it be hidden at certain widths?
6. Which personal-information inputs are optional, and which values are supported by current backend enums?
7. What is the agreed focus landing point on step transition for both form and screen-reader users?

**Change control:** No one-off design exceptions without an issue documenting need, accessibility consequences, owner, and a planned reusable extension or explicitly temporary waiver.

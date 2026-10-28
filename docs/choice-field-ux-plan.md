# `WtChoiceField`: Choice & Toggle UX Upgrade (CoT-based SMART Plan)

**Status:** Proposed · **Date:** 2026-10-22 · **Owner:** Frontend
**Scope:** every Yes/No, Enabled/Disabled and 2–4-option choice in forms and wizards (first target: Employee onboarding → System Access, Salary, Additional Details, Personal).
**Companions:** `docs/wizard-engine-unification.md` (engine) · `docs/onboarding-wizard-kit-migration.md` (inputs) · kit `src/app/modules/common/components/ui/README.md`
**Constraint from product:** **Gender stays required** (options and visuals change; validation does not).

---

## 1. Chain of thought: from observation to decision

Each step states *what we see → why it matters (UX law) → what we decide*.

### Step 1: What exists today (verified in repo)
| Fact | Where |
|---|---|
| Kit `SegmentedControl` (min-height 32px, tint + underline indicator), 23 usages | `ui/SegmentedControl.tsx` |
| Legacy `RadioInput` is a thin Formik wrapper around `SegmentedControl`, 23 usages | `modules/common/inputs/RadioInput.tsx` |
| A **local, untyped** `ChoiceField` (`any` props) renders Yes/No, Enabled/Disabled in onboarding | `pages/employee/forms/onboarding/OnboardingSections.tsx:56` |
| Kit already has `WtSwitch` / `WtSwitchField` (25 usages) and `SettingsSection` | `ui/switch.tsx`, `ui/SettingsSection.tsx` |
| TDS and Retention already **reveal follow-up fields** when enabled | `OnboardingSections.tsx` (~470–520) |
| Same labels in `AppSettingsModal`, `CandidateMealSection`, `ProfileDetails` | DRY opportunity |

**Reasoning:** the building blocks exist; the problem is that one control (segmented) is used for three different kinds of choice, through three different wrappers (`RadioInput`, local `ChoiceField`, direct `SegmentedControl`). → **Decision:** don't add another primitive; add **one typed Formik field, `WtChoiceField`**, that picks the right existing primitive by *kind of choice*, and retire the duplicates.

### Step 2: Classify the choices in the screenshots
| Field | Kind | Law | Best control |
|---|---|---|---|
| Show App Settings, Allow Over Time, Exempt from Site & Hybrid Attendance Approval, Is Employee Active | Boolean **setting** (on/off state) | Jakob's law: switches are the universal on/off pattern (iOS, Android, Google, Stripe, Linear) | **Switch row** |
| TDS salary (additional), Retention (fresher bond) | Boolean **feature** with follow-up fields | Tesler's law + progressive disclosure | **Switch row + reveal** (keep existing reveal) |
| Employee Type (Contract / Salary) | Exclusive choice with **consequences** | Recognition over recall; Hick's law (explain options so the decision is fast) | **Selectable cards** with one-line description |
| Gender, Marital Status, Meal Preference | Short exclusive pick (2–4 options) | Hick's law, Fitts's law | **Segmented** (refined) |

**Reasoning:** a "Yes / No" pair asks the user to read two words and compare tints to know state; a switch encodes state in one glance. Consequential choices need context, which a segment can't hold. → **Decision:** three variants: `switch`, `segmented`, `cards`.

### Step 3: Fix the visual language
| Observation | Law / principle | Decision |
|---|---|---|
| Selected = tint **and** underline (two signals, neither strong) | Von Restorff (one clear salient state); WCAG 1.4.1 (not colour alone) | One filled "thumb" pill + ✓ icon on cards; drop underline |
| Some groups full-width, some hug content | Gestalt similarity / alignment | Rule: segmented hugs content (max 4 options); cards fill the column; switch rows fill the row |
| Yes/No vs Enabled/Disabled vs "Is …" | Consistency (Nielsen #4) | Labels are nouns in sentence case: "Active employee", "Overtime allowed", "TDS salary (additional)" |
| `*` on booleans that always have a value | Signal-to-noise; Miller's law | No asterisk on fields with a default; mark only *optional* fields; keep `*` on Gender (required, no default) |
| 4-column grid of unrelated toggles | Gestalt proximity / common region; F-pattern scanning | Vertical settings list grouped by intent: **Access**, **Attendance**, **Payroll** |
| Meaning of "Exempt from…" unclear; `?` icon hides help | Recognition over recall; Nielsen #10 | Inline helper text (1 line) under each label; tooltips only for edge details |
| Yes/No buttons ~28px wide, 32px tall | Fitts's law; WCAG 2.5.8 | Min target 40px tall desktop, 44px touch |

### Step 4: Gender (product constraint applied)
- Options: **Male · Female · Non-binary · Prefer not to say**. Remove ♂/♀/⚥ icons (they add noise and some users find them non-inclusive).
- **Remains required** (`*`), no default selection, so the user makes an explicit choice. "Prefer not to say" satisfies required.
- Backend: confirm enum accepts the two new values (or map `Others` → `NON_BINARY`) before release. **Blocking check.**

### Step 5: Interaction & feedback
| Need | Law | Decision |
|---|---|---|
| Know what changed before saving | Doherty threshold, visibility of system status | Subtle "Changed" dot when value ≠ initial (edit mode); count in footer: "3 changes" |
| Smooth, not jumpy | Doherty (<400ms), motion tokens | Thumb slides 150ms with kit `motion.ts`; reveal uses `Collapse` 200ms; respects `prefers-reduced-motion` |
| Keyboard & screen readers | WCAG 2.1 AA | segmented/cards `role="radiogroup"` + roving tabindex + arrows; switch `role="switch"` + `aria-checked`; helper text via `aria-describedby`; visible focus ring |
| Errors | Nielsen #9 | Error text under the group, red outline on the group, focused on submit |
| Summary | Serial position; closure | Selected key choices echo in wizard `SummarySidebar` ("Salary based · TDS on · Bond 12 mo") |

### Step 6: Architecture
**Reasoning:** the decision about *which* control belongs in config, not in each form, so the `EnterpriseFormWizard` engine and any form get the upgrade for free.

```ts
// ui/WtChoiceField.tsx (Formik-bound) + ui/WtChoice.tsx (controlled, no Formik)
type ChoiceVariant = 'switch' | 'segmented' | 'cards';

interface WtChoiceOption<T extends string | boolean> {
  value: T;
  label: string;
  description?: string;      // cards only
  icon?: AppIconName;        // cards only; never for gender
  disabled?: boolean;
  disabledReason?: string;
}

interface WtChoiceFieldProps<T extends string | boolean> {
  name: string;
  label: string;
  variant?: ChoiceVariant;   // default: boolean → 'switch', ≤4 opts → 'segmented'
  options?: WtChoiceOption<T>[];   // omit for switch
  helperText?: string;
  required?: boolean;        // shows * only when there is no default
  reveal?: ReactNode | ((value: T) => ReactNode); // progressive disclosure
  showChangedMarker?: boolean;     // edit mode
  layout?: 'row' | 'stacked';      // switch: label left/switch right (row)
  columns?: 1 | 2 | 3;             // cards
}
```
- `switch` → composes existing `WtSwitch`; value stored as boolean (adapter keeps legacy `"true"/"false"` strings during migration).
- `segmented` → refined `SegmentedControl` (new `size="md"` 40px, filled thumb, no underline).
- `cards` → new internal `ChoiceCard` (radio semantics), built on kit tokens.
- `SettingsSection` hosts switch rows (Access / Attendance / Payroll groups).

---

## 2. SMART goal

| | |
|---|---|
| **Specific** | Ship `WtChoiceField` (switch / segmented / cards) in the kit and move every Yes/No, Enabled/Disabled and 2–4-option choice in employee onboarding, candidate, app-settings and profile forms onto it; delete local `ChoiceField` and retire `RadioInput`. |
| **Measurable** | 0 local `ChoiceField`; `<RadioInput` usages 23 → 0; 0 Yes/No segmented pairs for boolean settings; all touch targets ≥ 40px; axe 0 serious; payload snapshots identical (except Gender enum additions); task-time on the System Access + Salary sections reduced (baseline vs after, 5-user hallway test). |
| **Achievable** | Reuses `WtSwitch`, `SegmentedControl`, `SettingsSection`, tokens, motion; only `ChoiceCard` is new. Adapters keep call sites working. |
| **Relevant** | Directly improves the most-used admin flow (employee create/edit) and feeds the `EnterpriseFormWizard` field registry. |
| **Time-bound** | 3 weeks: build (wk 1), onboarding migration (wk 2), remaining forms + cleanup (wk 3). Start 2026-10-23, done 2026-11-13. |

---

## 3. Phased plan

### Phase 0: Decide & verify (day 1)
- [ ] Confirm Gender enum on API (`NON_BINARY`, `PREFER_NOT_TO_SAY`) or agree on a mapping. **Blocking for Gender only.**
- [ ] Capture baseline: screenshots, task time for System Access + Salary sections, axe report.
- [ ] Inventory script output (§7) saved to PR.

### Phase 1: Kit component (week 1)
- [ ] `SegmentedControl`: add `size="md"` (40px), filled thumb indicator, remove underline, keyboard roving tabindex. Default size unchanged so 23 existing usages don't shift.
- [ ] `ChoiceCard` + `cards` variant (radio semantics, ✓ on selected, description line).
- [ ] `WtChoice` (controlled) + `WtChoiceField` (Formik) with `variant`, `helperText`, `reveal`, `showChangedMarker`, required-marker rule.
- [ ] Boolean adapter: accept `"true"/"false"` strings, emit the same type it received.
- [ ] Tests: RTL (each variant, keyboard, reveal, required error, changed marker); a11y (axe); visual stories light/dark, glass/material.
- [ ] README: "Choosing a choice control" decision table (§1 Step 2).

### Phase 2: Employee onboarding (week 2)
| Section | Field | Variant | Label → new label | Helper text (draft) |
|---|---|---|---|---|
| System access | Show App Settings | switch | App settings access | Can open the mobile/web app settings screen |
| System access | Is Employee Active | switch | Active employee | Inactive employees can't sign in or be assigned work |
| System access | Allow Over Time | switch | Overtime allowed | Extra hours are counted toward overtime pay |
| System access | Exempt from Site & Hybrid Attendance Approval | switch | Skip site/hybrid attendance approval | Site and hybrid check-ins won't need a manager's approval |
| Salary | Employee Type | cards | Employee type | Contract based: fixed term, no PF/ESI · Salary based: monthly payroll *(confirm copy with HR)* |
| Salary | TDS salary (additional) | switch + reveal (existing type/amount fields) | TDS salary (additional) | Deduct an extra TDS amount every month |
| Salary | Retention (fresher bond) | switch + reveal (existing month fields) | Retention (fresher bond) | Deduct a monthly retention amount between two months |
| Additional | Meal preference | segmented | Meal preference | (none) |
| Personal | Gender (**required**) | segmented, no icons | Gender | (none) |
| Personal | Marital status | segmented | Marital status | Inline text replaces `?` tooltip if needed |

- [ ] Replace local `ChoiceField` in `OnboardingSections.tsx`; delete it.
- [ ] Group System Access into `SettingsSection` rows: Access (app settings, active) · Attendance (overtime, skip approval).
- [ ] Changed markers on in edit mode.
- [ ] Payload snapshot test (create + edit) identical.

### Phase 3: Rest of the app (week 3)
- [ ] `AppSettingsModal`, `CandidateMealSection`, `ProfileDetails` and remaining `RadioInput` call sites → `WtChoiceField`.
- [ ] Mark `RadioInput` deprecated → delete when count is 0; add ESLint `no-restricted-imports`.
- [ ] Register `choice` field type in the `EnterpriseFormWizard` field registry (see engine plan).
- [ ] Remove migrated files from `.eslint-ui-baseline.cjs` where now clean.

---

## 4. QA matrix

| Check | Switch | Segmented | Cards |
|---|---|---|---|
| Mouse / touch toggles; target ≥ 40px (44 touch) | ✔ | ✔ | ✔ |
| Keyboard: Tab in, Space/Enter (switch), arrows (radio) | ✔ | ✔ | ✔ |
| Screen reader announces label, state, helper text | ✔ | ✔ | ✔ |
| Required with no value → error + focus on submit | n/a | ✔ (Gender) | ✔ |
| Reveal shows/hides follow-up fields and clears their errors when hidden | ✔ | ✔ | ✔ |
| Changed marker in edit mode, gone after save | ✔ | ✔ | ✔ |
| Light/dark · glass/material · 360px mobile | ✔ | ✔ | ✔ |
| Reduced motion respected | ✔ | ✔ | ✔ |
| Payload identical to before | ✔ | ✔ | ✔ |

---

## 5. Success metrics
| Metric | Baseline | Target |
|---|---|---|
| Time to complete System Access + Salary (5-user test) | measure in Phase 0 | −25% |
| Mis-set toggles found in QA/support (wrong Yes/No) | measure | ↓ |
| axe serious/critical on onboarding | measure | 0 |
| Choice wrappers in codebase | 3 (`RadioInput`, local `ChoiceField`, raw `SegmentedControl`) | 1 (`WtChoiceField`) |

---

## 6. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Boolean stored as `"true"/"false"` strings; switch emits booleans → payload drift | Adapter preserves incoming type; snapshot tests |
| Gender enum rejected by API | Phase 0 blocking check; ship Gender change separately if needed |
| Changing `SegmentedControl` look shifts 23 screens | New `size="md"`/thumb behind a prop; default unchanged until reviewed |
| Users used to Yes/No | Switch row shows state text ("On"/"Off") on first release; helper text explains |
| Employee Type card copy inaccurate | HR/payroll sign-off on descriptions |

---

## 7. Audit script
```bash
rg -n "const ChoiceField|<RadioInput|from ['\"].*inputs/RadioInput" src
rg -n "label: ['\"](Yes|No|Enabled|Disabled)['\"]" src
rg -n "<SegmentedControl" src | wc -l
```
**Done when** the first two return nothing in migrated areas and §4 is green.

---

## 8. Definition of done
- `WtChoiceField` in kit, documented, tested, used by onboarding, candidate, app-settings and profile forms.
- Local `ChoiceField` deleted; `RadioInput` usages 0 and import banned.
- Gender: 4 options, no icons, **still required**.
- Metrics in §5 recorded before and after; screenshots attached to PR.
# Implementation notes

The shared implementation is `WtChoice` plus the Formik adapter `WtChoiceField`, exported from the UI kit barrel. Migrated employee onboarding, app-settings, candidate meal, profile meal, and the legacy employee wizard settings now use native checkbox/radio semantics through that adapter.

The migration audit is runnable on Windows with `node scripts/audit-choice-fields.mjs` (or `pnpm run audit:choices`). It checks migrated consumers for local choice implementations, legacy `RadioInput`, boolean segmented controls, numeric gender options, and stale UI-baseline entries.

Payroll neutral slabs use the `professionalTax.other` configuration key. `OTHER`, `NON_BINARY`, and `PREFER_NOT_TO_SAY` fail explicitly when that configuration is missing; they are never mapped to male or female.

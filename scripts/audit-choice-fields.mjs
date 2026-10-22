import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  { path: 'src/app/pages/employee/forms/onboarding/OnboardingSections.tsx', variants: ['switch', 'segmented', 'cards'] },
  { path: 'src/app/pages/employee/wizard/forms/BasicInfo.tsx', variants: ['segmented'] },
  { path: 'src/app/pages/employee/wizard/forms/AppSettings.tsx', variants: ['switch'] },
  { path: 'src/app/pages/employee/wizard/forms/MealPreference.tsx', variants: ['segmented'] },
  { path: 'src/app/pages/employee/wizard/steps/StepAppSettings.tsx', variants: ['switch', 'segmented', 'cards'] },
  { path: 'src/app/pages/employee/components/AppSettingsModal.tsx', variants: ['switch', 'segmented', 'cards'] },
  { path: 'src/app/pages/employee/recruitment/CandidateMealSection.tsx', variants: ['segmented'] },
  { path: 'src/app/modules/accounts/components/settings/cards/ProfileDetails.tsx', variants: ['segmented'] },
  { path: 'src/app/pages/employee/attendance/personal/views/information/Rules.tsx', variants: ['switch'] },
  { path: 'src/app/pages/employee/loans/personal/components/LoanApplicationForm.tsx', variants: ['cards'] },
  { path: 'src/app/pages/employee/loans/admin/views/KPISettings.tsx', variants: ['segmented'] },
];
const violations = [];

const choicePrimitive = await readFile(path.join(root, 'src/app/modules/common/components/ui/WtChoice.tsx'), 'utf8');
for (const requiredPattern of [/type="checkbox"/, /type="radio"/, /role="switch"/, /role="radiogroup"/]) {
  if (!requiredPattern.test(choicePrimitive)) violations.push(`WtChoice.tsx: missing native semantic ${requiredPattern}`);
}

for (const target of targets) {
  const relative = target.path;
  const file = path.join(root, relative);
  if (!existsSync(file)) {
    violations.push(`${relative}: manifest target is missing`);
    continue;
  }
  const source = await readFile(file, 'utf8');
  if (/import[^;]*RadioInput|<RadioInput\b/.test(source)) violations.push(`${relative}: legacy RadioInput usage`);
  if (/WtChoiceLegacyField/.test(source)) violations.push(`${relative}: temporary legacy choice bridge usage`);
  if (/const\s+ChoiceField\b|function\s+ChoiceField\b/.test(source)) violations.push(`${relative}: local ChoiceField implementation`);
  if (/gender[^\n]*(?:value|label).*['"](?:0|1|2)['"]/.test(source)) violations.push(`${relative}: numeric gender option`);
  if (/role=["']tablist["']/.test(source) && /boolean|Yes|No|Enabled|Disabled/.test(source)) violations.push(`${relative}: boolean segmented control`);
  if (!source.includes('WtChoiceField') && !source.includes('WtChoice')) violations.push(`${relative}: migrated choice surface does not use the shared choice kit`);
  for (const variant of target.variants) {
    const pattern = new RegExp(`variant\\s*=\\s*["']${variant}["']`);
    if (!pattern.test(source)) violations.push(`${relative}: missing required ${variant} variant`);
  }
  if (/<(?:input|Field)[^>]+type=["'](?:radio|checkbox)["']/.test(source)) violations.push(`${relative}: direct native choice bypasses the shared kit`);
}

const baseline = path.join(root, '.eslint-ui-baseline.cjs');
if (existsSync(baseline)) {
  const source = await readFile(baseline, 'utf8');
  for (const target of targets) if (source.includes(target.path)) violations.push(`${target.path}: still present in UI baseline`);
}

if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
    console.log(`Choice field audit passed (${targets.length} migrated files checked)`);
}

import { readFile, readdir } from 'node:fs/promises';
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
const approvedEmployeeGenders = new Set([
  'MALE',
  'FEMALE',
  'OTHER',
  'NON_BINARY',
  'PREFER_NOT_TO_SAY',
]);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(absolute));
    else if (/\.(?:tsx?|jsx?)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

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
  if (relative.endsWith('/BasicInfo.tsx')) {
    const genderBlock = source.match(/GENDER_OPTIONS\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? '';
    const genderValues = [...genderBlock.matchAll(/value\s*:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
    const unexpected = genderValues.filter((value) => !approvedEmployeeGenders.has(value));
    const missing = [...approvedEmployeeGenders].filter((value) => !genderValues.includes(value));
    if (unexpected.length) violations.push(`${relative}: unapproved employee gender option(s): ${unexpected.join(', ')}`);
    if (missing.length) violations.push(`${relative}: missing approved employee gender option(s): ${missing.join(', ')}`);
  }
  if (/role=["']tablist["']/.test(source) && /boolean|Yes|No|Enabled|Disabled/.test(source)) violations.push(`${relative}: boolean segmented control`);
  if (!source.includes('WtChoiceField') && !source.includes('WtChoice')) violations.push(`${relative}: migrated choice surface does not use the shared choice kit`);
  for (const variant of target.variants) {
    const pattern = new RegExp(`variant\\s*=\\s*["']${variant}["']`);
    if (!pattern.test(source)) violations.push(`${relative}: missing required ${variant} variant`);
  }
  if (/<(?:input|Field)[^>]+type=["'](?:radio|checkbox)["']|component=["']input["'][^>]+type=["'](?:radio|checkbox)["']/.test(source)) violations.push(`${relative}: direct native choice bypasses the shared kit`);
}

// The manifest above is the deliberate rollout set. These checks are repository-wide
// guardrails so a new feature cannot quietly reintroduce the retired choice primitives.
for (const file of await sourceFiles(path.join(root, 'src'))) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const source = await readFile(file, 'utf8');
  if (/import[^;]*RadioInput|<RadioInput\b/.test(source)) violations.push(`${relative}: legacy RadioInput usage`);
  if (/const\s+ChoiceField\b|function\s+ChoiceField\b/.test(source)) violations.push(`${relative}: local ChoiceField implementation`);
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

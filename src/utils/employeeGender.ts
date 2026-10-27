export const EMPLOYEE_GENDER_VALUES = [
  'MALE',
  'FEMALE',
  'OTHER',
  'NON_BINARY',
  'PREFER_NOT_TO_SAY',
] as const;

export type EmployeeGender = typeof EMPLOYEE_GENDER_VALUES[number];

const LEGACY_GENDER_MAP: Record<string, EmployeeGender> = {
  '0': 'MALE',
  '1': 'FEMALE',
  '2': 'OTHER',
};

export function normalizeEmployeeGender(value: unknown): EmployeeGender | '' {
  if (typeof value === 'string' && EMPLOYEE_GENDER_VALUES.includes(value as EmployeeGender)) return value as EmployeeGender;
  return LEGACY_GENDER_MAP[String(value ?? '')] ?? '';
}

export function employeeGenderLabel(value: unknown): string {
  const labels: Record<EmployeeGender, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other',
    NON_BINARY: 'Non-binary',
    PREFER_NOT_TO_SAY: 'Prefer not to say',
  };
  const normalized = normalizeEmployeeGender(value);
  return normalized ? labels[normalized] : 'N/A';
}

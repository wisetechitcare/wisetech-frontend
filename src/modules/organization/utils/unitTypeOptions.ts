/**
 * The set of unit types offered in create dialogs. The backend treats `type`
 * as a free-form string, so this is a convenience list of the common values —
 * not an exhaustive enum. Any type the server returns still renders correctly
 * elsewhere (see iconForType / humanizeType).
 */
export const UNIT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Organization', label: 'Organization' },
  { value: 'SubOrganization', label: 'Sub Organization' },
  { value: 'Branch', label: 'Branch' },
  { value: 'Department', label: 'Department' },
  { value: 'Team', label: 'Team' },
  { value: 'Division', label: 'Division' },
];

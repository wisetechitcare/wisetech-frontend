/**
 * Shared, controlled picker fields for the create / edit assignment forms.
 * All server data (people, roles, tenants, units) flows in via the module
 * hooks; these components are purely presentational + accessible.
 */
import { Autocomplete, Box, Chip, MenuItem, TextField, Typography } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';
import { usePeopleForPicker, useRolesForPicker, useTenantsForPicker, useUnitsForPicker } from '../hooks/useAssignments';
import type { AssignmentScope, PersonOption, RoleOption, UnitOption } from '../types';
import { SCOPE_CAPTIONS, SCOPE_LABELS } from '../utils/labels';

const rounded = { '& .MuiOutlinedInput-root': { borderRadius: 2 } } as const;

// ── Person (typeahead) ────────────────────────────────────────────────────────

interface PersonPickerProps {
  value: PersonOption | null;
  onChange: (person: PersonOption | null) => void;
  disabled?: boolean;
}

export const PersonPicker = ({ value, onChange, disabled }: PersonPickerProps) => {
  const { data, isLoading } = usePeopleForPicker();
  // Inactive employees can be shown (e.g. already-assigned) but not chosen for a new assignment.
  const options = (data ?? []).filter((p) => p.isActive);

  return (
    <Autocomplete
      value={value}
      onChange={(_e, v) => onChange(v)}
      options={options}
      loading={isLoading}
      disabled={disabled}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{option.name}</Typography>
            {option.caption && <Typography variant="caption" color="text.secondary" noWrap>{option.caption}</Typography>}
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Person"
          required
          placeholder="Search employees…"
          inputProps={{ ...params.inputProps, 'aria-label': 'Select person' }}
          sx={rounded}
        />
      )}
    />
  );
};

// ── Role (typeahead) ──────────────────────────────────────────────────────────

interface RolePickerProps {
  value: RoleOption | null;
  onChange: (role: RoleOption | null) => void;
  disabled?: boolean;
}

export const RolePicker = ({ value, onChange, disabled }: RolePickerProps) => {
  const { data, isLoading } = useRolesForPicker();
  return (
    <Autocomplete
      value={value}
      onChange={(_e, v) => onChange(v)}
      options={data ?? []}
      loading={isLoading}
      disabled={disabled}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{option.name}</Typography>
            {option.code && <Chip size="small" label={option.code} sx={{ borderRadius: 1, height: 20 }} />}
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Role"
          required
          placeholder="Search roles…"
          inputProps={{ ...params.inputProps, 'aria-label': 'Select role' }}
          sx={rounded}
        />
      )}
    />
  );
};

// ── Tenant (select) ───────────────────────────────────────────────────────────

interface TenantSelectProps {
  value: string;
  onChange: (tenantId: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export const TenantSelect = ({ value, onChange, disabled, required }: TenantSelectProps) => {
  const { data, isLoading } = useTenantsForPicker();
  return (
    <TextField
      select
      label="Tenant"
      required={required}
      fullWidth
      value={value}
      disabled={disabled || isLoading}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ 'aria-label': 'Select tenant' }}
      sx={rounded}
      helperText={isLoading ? 'Loading tenants…' : undefined}
    >
      {(data ?? []).map((t) => (
        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
      ))}
    </TextField>
  );
};

// ── Unit (indented tree select) ───────────────────────────────────────────────

interface UnitSelectProps {
  tenantId: string | undefined;
  value: string;
  onChange: (unit: UnitOption | null) => void;
  disabled?: boolean;
}

const NONE = '__none__';

export const UnitSelect = ({ tenantId, value, onChange, disabled }: UnitSelectProps) => {
  const { data, isLoading } = useUnitsForPicker(tenantId);
  const units = data ?? [];

  return (
    <TextField
      select
      label="Unit (optional)"
      fullWidth
      value={value || NONE}
      disabled={disabled || !tenantId || isLoading}
      onChange={(e) => {
        const id = e.target.value;
        onChange(id === NONE ? null : units.find((u) => u.id === id) ?? null);
      }}
      inputProps={{ 'aria-label': 'Select organizational unit' }}
      sx={rounded}
      helperText={
        !tenantId ? 'Choose a tenant first' : isLoading ? 'Loading units…' : 'Leave blank to apply to the whole tenant'
      }
    >
      <MenuItem value={NONE}><em>Whole tenant (no specific unit)</em></MenuItem>
      {units.map((u) => (
        <MenuItem key={u.id} value={u.id} sx={{ pl: 2 + u.depth * 2 }}>
          {u.depth > 0 && <Box component="span" aria-hidden="true" sx={{ color: 'text.disabled', mr: 0.5 }}>└</Box>}
          {u.name}
        </MenuItem>
      ))}
    </TextField>
  );
};

// ── Scope (advanced select) ───────────────────────────────────────────────────

interface ScopeSelectProps {
  value: AssignmentScope;
  onChange: (scope: AssignmentScope) => void;
  disabled?: boolean;
  /** When no unit is chosen, unit-based scopes are not selectable. */
  hasUnit: boolean;
}

const SCOPE_ORDER: AssignmentScope[] = ['platform', 'tenant', 'unit_subtree', 'unit'];

export const ScopeSelect = ({ value, onChange, disabled, hasUnit }: ScopeSelectProps) => (
  <TextField
    select
    label="Scope"
    fullWidth
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value as AssignmentScope)}
    inputProps={{ 'aria-label': 'Select scope' }}
    sx={rounded}
    helperText={SCOPE_CAPTIONS[value]}
  >
    {SCOPE_ORDER.map((s) => {
      const needsUnit = s === 'unit' || s === 'unit_subtree';
      return (
        <MenuItem key={s} value={s} disabled={needsUnit && !hasUnit}>
          {SCOPE_LABELS[s]}
        </MenuItem>
      );
    })}
  </TextField>
);

// ── Date field ────────────────────────────────────────────────────────────────

interface AssignmentDateFieldProps {
  label: string;
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  disabled?: boolean;
  minDate?: Dayjs;
  helperText?: string;
}

/** MUI DatePicker wrapped in its own LocalizationProvider — self-contained. */
export const AssignmentDateField = ({ label, value, onChange, disabled, minDate, helperText }: AssignmentDateFieldProps) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      minDate={minDate}
      slotProps={{
        field: { clearable: true },
        textField: {
          fullWidth: true,
          helperText,
          inputProps: { 'aria-label': label },
          sx: rounded,
        },
      }}
    />
  </LocalizationProvider>
);

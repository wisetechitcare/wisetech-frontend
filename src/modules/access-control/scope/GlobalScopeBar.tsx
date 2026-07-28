/**
 * Access Control — Global Scope Bar.
 *
 * The single organizational-context control for the whole module. Renders four
 * cascading selectors (Organization → Sub-Organization → Branch → Department)
 * bound to the shared AccessScopeContext. A level is disabled when it has no data
 * or its parent isn't chosen (graceful fallback — never fabricates options).
 */
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useAccessScope } from './AccessScopeContext';
import type { ScopeOption } from './types';

const ALL = '__all__';

// Pluralize a scope label for the "All …" option. Naive `+ "s"` produced
// "All Branchs" — words ending in ch/sh/s/x/z take "-es" ("Branches").
const pluralize = (label: string): string =>
  /(?:ch|sh|s|x|z)$/i.test(label) ? `${label}es` : `${label}s`;

export const GlobalScopeBar = () => {
  const {
    selection, options, loading, error, locked,
    setOrganization, setSubOrganization, setBranch, setDepartment, reset,
  } = useAccessScope();

  const renderSelect = (
    label: string,
    value: string | null,
    opts: ScopeOption[],
    onChange: (id: string | null) => void,
    enabled: boolean,
  ) => (
    <TextField
      select
      size='small'
      label={label}
      value={value ?? ALL}
      onChange={(e) => onChange(e.target.value === ALL ? null : e.target.value)}
      disabled={loading || error || !enabled || opts.length === 0}
      sx={{ minWidth: 200 }}
    >
      <MenuItem value={ALL}>{`All ${pluralize(label)}`}</MenuItem>
      {opts.map((o) => (
        <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
      ))}
    </TextField>
  );

  const hasSelection = Boolean(
    selection.organizationId || selection.subOrganizationId || selection.branchId || selection.departmentId,
  );

  return (
    <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap='wrap' useFlexGap>
        <Typography variant='caption' sx={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
          Scope
        </Typography>
        {/* A locked (non-group-wide) actor is pinned to their own sub-org: the
            Org / Sub-org / Branch selectors are view-only. They can still narrow
            by Department within their sub-org. */}
        {renderSelect('Organization', selection.organizationId, options.organizations, setOrganization, !locked)}
        {renderSelect('Sub Organization', selection.subOrganizationId, options.subOrganizations, setSubOrganization, !locked && Boolean(selection.organizationId))}
        {renderSelect('Branch', selection.branchId, options.branches, setBranch, !locked && Boolean(selection.subOrganizationId || selection.organizationId))}
        {renderSelect('Department', selection.departmentId, options.departments, setDepartment, Boolean(selection.branchId || selection.subOrganizationId))}
        {!locked && <Button size='small' variant='text' onClick={reset} disabled={!hasSelection}>Reset</Button>}
        {locked && (
          <Typography variant='caption' color='text.secondary'>
            Locked to your sub-organization
          </Typography>
        )}
        {error && (
          <Typography variant='caption' color='text.secondary'>
            Organization hierarchy unavailable — scope filtering disabled.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default GlobalScopeBar;

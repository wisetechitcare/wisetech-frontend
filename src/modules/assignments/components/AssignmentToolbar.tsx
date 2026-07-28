import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAssignmentFilters } from '../context/AssignmentFilterContext';
import { useRolesForPicker, useTenantsForPicker } from '../hooks/useAssignments';
import { SearchBar } from './SearchBar';
import type { AssignmentStatus } from '../types';

interface AssignmentToolbarProps {
  total: number;
  onCreate: () => void;
}

const rounded = { minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: 2 } } as const;

const STATUS_OPTIONS: { value: AssignmentStatus | 'all'; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Removed' },
  { value: 'all', label: 'All statuses' },
];

/** Dashboard header: title, count, New button, search + status/tenant/role filters. */
export const AssignmentToolbar = ({ total, onCreate }: AssignmentToolbarProps) => {
  const { params, search, setSearch, setStatus, setTenant, setRole } = useAssignmentFilters();
  const { data: tenants } = useTenantsForPicker();
  const { data: roles } = useRolesForPicker();

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Assignments</Typography>
          <Typography variant="body2" color="text.secondary">
            {total === 1 ? '1 assignment' : `${total} assignments`} · Who has which role, where
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} sx={{ textTransform: 'none', borderRadius: 2 }}>
          New assignment
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search people…" ariaLabel="Search assignments by person" />
        <TextField
          select size="small" label="Status" sx={rounded}
          value={params.status ?? 'active'}
          onChange={(e) => setStatus(e.target.value as AssignmentStatus | 'all')}
          inputProps={{ 'aria-label': 'Filter by status' }}
        >
          {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label="Tenant" sx={rounded}
          value={params.tenantId ?? ''}
          onChange={(e) => setTenant(e.target.value || undefined)}
          inputProps={{ 'aria-label': 'Filter by tenant' }}
        >
          <MenuItem value=""><em>All tenants</em></MenuItem>
          {(tenants ?? []).map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label="Role" sx={rounded}
          value={params.roleId ?? ''}
          onChange={(e) => setRole(e.target.value || undefined)}
          inputProps={{ 'aria-label': 'Filter by role' }}
        >
          <MenuItem value=""><em>All roles</em></MenuItem>
          {(roles ?? []).map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
        </TextField>
      </Box>
    </Box>
  );
};

export default AssignmentToolbar;

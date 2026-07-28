/**
 * Employee Access — search & pick an employee.
 *
 * The entry point to the employee-centric experience: find a person, open them,
 * and manage all of their access in one place. Reuses the assignment module's
 * people source and PersonCell. Consumes the shared AccessScopeContext for context
 * (people scoping is optional and not fabricated here).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardActionArea, Chip, CircularProgress, InputAdornment, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { usePeopleForPicker } from '@modules/assignments/hooks/useAssignments';
import { PersonCell } from '@modules/assignments/components/PersonCell';
import { useAccessScope } from '../scope/AccessScopeContext';

export const EmployeeAccessListPage = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  // Default to Active so inactive/off-boarded employees don't clutter the picker.
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const { data: people = [], isLoading } = usePeopleForPicker();
  const { labels, selection } = useAccessScope();

  const scopePath = [labels.organization, labels.subOrganization, labels.branch, labels.department].filter(Boolean).join(' › ');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return people
      .filter((p) => {
        // Scope filter — narrow to the selected sub-org / branch / department.
        // Each level filters only when chosen (sub-org maps to the employee's companyId).
        if (selection.subOrganizationId && p.companyId !== selection.subOrganizationId) return false;
        if (selection.branchId && p.branchId !== selection.branchId) return false;
        if (selection.departmentId && p.departmentId !== selection.departmentId) return false;
        // Status filter.
        if (status === 'active' ? !p.isActive : p.isActive) return false;
        // Search — name, designation, or role.
        if (!term) return true;
        return p.name.toLowerCase().includes(term)
          || (p.caption ?? '').toLowerCase().includes(term)
          || (p.role ?? '').toLowerCase().includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [people, q, status, selection.subOrganizationId, selection.branchId, selection.departmentId]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>Employee Access</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search for an employee to manage their roles, overrides and effective access.
        {scopePath ? ` · Scope: ${scopePath}` : ''}
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, maxWidth: 620 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search employees by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} /></Box>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>No {status} employees found.</Typography>
      ) : (
        <Stack spacing={1}>
          {filtered.map((p) => (
            <Card key={p.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardActionArea onClick={() => navigate(`/access-control/employees/${p.id}`)} sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <PersonCell name={p.name} email={p.caption ?? undefined} />
                  <Chip
                    size="small"
                    label={p.role ?? 'No role'}
                    variant="outlined"
                    color={p.role ? 'primary' : 'default'}
                    sx={{ borderRadius: 1.5, fontWeight: 600, flexShrink: 0 }}
                  />
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default EmployeeAccessListPage;

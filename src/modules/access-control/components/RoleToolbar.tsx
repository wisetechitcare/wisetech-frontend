import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { createRole } from '@services/roles';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { useAccessControlFilters } from '../context/AccessControlContext';
import { accessKeys } from '../hooks/useAccessControl';
import type { SortField, SortOrder } from '../types';

interface RoleToolbarProps {
  categories: string[];
  total: number;
}

const SORTS: Array<{ value: string; label: string; field: SortField; order: SortOrder }> = [
  { value: 'name-asc', label: 'Name (A–Z)', field: 'name', order: 'asc' },
  { value: 'name-desc', label: 'Name (Z–A)', field: 'name', order: 'desc' },
  { value: 'users-desc', label: 'Most users', field: 'users', order: 'desc' },
  { value: 'users-asc', label: 'Fewest users', field: 'users', order: 'asc' },
  { value: 'updated-desc', label: 'Newest first', field: 'updated', order: 'desc' },
];

/** Top navigation of the dashboard: title, search, filters, sort, and Create Role. */
export const RoleToolbar = ({ categories, total }: RoleToolbarProps) => {
  const { search, setSearch, params, setSort } = useAccessControlFilters();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const current = `${params.sort ?? 'name'}-${params.order ?? 'asc'}`;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const close = () => { if (!saving) { setOpen(false); setName(''); } };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await createRole({ name: trimmed });
      // Refresh every roles/catalog query so the new card appears immediately.
      await queryClient.invalidateQueries({ queryKey: accessKeys.all });
      toast.success('Role created');
      setOpen(false);
      setName('');
      const newId = res?.data?.id;
      if (newId) navigate(`/access-control/roles/${newId}`); // open it to assign permissions
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not create role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Roles</Typography>
          <Typography variant="body2" color="text.secondary">
            {total === 1 ? '1 role' : `${total} roles`} · Define what people can do in the system
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          New Role
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} />
        <FilterBar categories={categories} />
        <TextField
          select size="small" label="Sort by"
          sx={{ minWidth: 160, ml: { md: 'auto' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          value={current}
          onChange={(e) => {
            const s = SORTS.find((o) => o.value === e.target.value);
            if (s) setSort(s.field, s.order);
          }}
          inputProps={{ 'aria-label': 'Sort roles' }}
        >
          {SORTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </TextField>
      </Box>

      {/* Create Role — name only; permissions are assigned afterwards in the role's Access tab. */}
      <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>New role</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth margin="dense" label="Role name" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            disabled={saving}
          />
          <Typography variant="caption" color="text.secondary">
            Create the role, then open it to assign permissions in the Access tab.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving || !name.trim()} sx={{ textTransform: 'none' }}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleToolbar;

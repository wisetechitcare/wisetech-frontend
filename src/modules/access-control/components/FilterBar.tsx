import { Box, Button, MenuItem, TextField } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useAccessControlFilters } from '../context/AccessControlContext';
import type { RoleStatus, RoleType } from '../types';

interface FilterBarProps {
  categories: string[];
}

/** Status · Role type · Category filters. */
export const FilterBar = ({ categories }: FilterBarProps) => {
  const { params, setStatus, setType, setCategory, resetFilters, hasActiveFilters } = useAccessControlFilters();

  const select = { minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 2 } } as const;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      <TextField
        select size="small" label="Status" sx={select}
        value={params.status ?? 'published'}
        onChange={(e) => setStatus(e.target.value as RoleStatus | 'all')}
        inputProps={{ 'aria-label': 'Filter by status' }}
      >
        <MenuItem value="published">Published</MenuItem>
        <MenuItem value="archived">Archived</MenuItem>
        <MenuItem value="all">All statuses</MenuItem>
      </TextField>

      <TextField
        select size="small" label="Role type" sx={select}
        value={params.type ?? 'all'}
        onChange={(e) => setType(e.target.value as RoleType | 'all')}
        inputProps={{ 'aria-label': 'Filter by role type' }}
      >
        <MenuItem value="all">All types</MenuItem>
        <MenuItem value="system">System</MenuItem>
        <MenuItem value="custom">Custom</MenuItem>
      </TextField>

      <TextField
        select size="small" label="Category" sx={select}
        value={params.category ?? ''}
        onChange={(e) => setCategory(e.target.value || undefined)}
        inputProps={{ 'aria-label': 'Filter by category' }}
      >
        <MenuItem value="">All categories</MenuItem>
        {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
      </TextField>

      {hasActiveFilters && (
        <Button size="small" startIcon={<RestartAltIcon />} onClick={resetFilters} sx={{ textTransform: 'none' }}>
          Reset
        </Button>
      )}
    </Box>
  );
};

export default FilterBar;

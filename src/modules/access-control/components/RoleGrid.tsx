import { Box, Pagination, Typography } from '@mui/material';
import { RoleCard } from './RoleCard';
import type { RoleListItem } from '../types';

interface RoleGridProps {
  roles: RoleListItem[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
}

/**
 * Responsive role grid + pagination. Server-side paging keeps the DOM small,
 * so no virtualization is needed at this page size (see performance notes).
 */
export const RoleGrid = ({ roles, page, totalPages, total, onPageChange, onOpen }: RoleGridProps) => (
  <>
    <Box
      component="ul"
      aria-label="Roles"
      sx={{
        listStyle: 'none', p: 0, m: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
        // Cards carry their own shared min-height (RoleCard), so every cell is the
        // same size; align them to the top of each row.
        alignItems: 'start',
        gap: 2,
      }}
    >
      {roles.map((role) => (
        <Box component="li" key={role.id} sx={{ display: 'flex' }}>
          <RoleCard role={role} onOpen={onOpen} />
        </Box>
      ))}
    </Box>

    {totalPages > 1 && (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Page {page} of {totalPages} · {total} roles
        </Typography>
        <Pagination
          page={page}
          count={totalPages}
          onChange={(_, p) => onPageChange(p)}
          shape="rounded"
          color="primary"
          getItemAriaLabel={(type, pageNum) =>
            type === 'page' ? `Go to page ${pageNum}` : `Go to ${type} page`
          }
        />
      </Box>
    )}
  </>
);

export default RoleGrid;

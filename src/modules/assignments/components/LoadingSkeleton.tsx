import { Box, Skeleton, TableCell, TableRow } from '@mui/material';

/** Table-row skeletons — matches the assignment table so there is no layout shift. */
export const AssignmentTableSkeleton = ({ rows = 8, columns = 9 }: { rows?: number; columns?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <TableRow key={r}>
        {Array.from({ length: columns }).map((__, c) => (
          <TableCell key={c}>
            <Skeleton variant="text" width={c === 0 ? '80%' : `${40 + ((r + c) * 7) % 45}%`} height={22} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

/** A short stack of card skeletons — used on the effective-access / history pages. */
export const CardListSkeleton = ({ count = 5 }: { count?: number }) => (
  <Box aria-busy="true" aria-live="polite" aria-label="Loading" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 3 }} />
    ))}
  </Box>
);

/** Summary-tile row skeleton. */
export const StatsSkeleton = ({ count = 4 }: { count?: number }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${count}, 1fr)` }, gap: 2 }}>
    {Array.from({ length: count }).map((_, i) => <Skeleton key={i} variant="rounded" height={92} sx={{ borderRadius: 3 }} />)}
  </Box>
);

export default AssignmentTableSkeleton;

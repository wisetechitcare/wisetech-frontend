import { Box, Card, Skeleton } from '@mui/material';

const GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
  gap: 2,
} as const;

/** Card-shaped skeletons — matches the real grid so there is no layout shift. */
export const RoleGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <Box sx={GRID} aria-busy="true" aria-live="polite" aria-label="Loading roles">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Skeleton variant="rounded" width={44} height={44} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="35%" height={16} />
          </Box>
        </Box>
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
        <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5 }}>
          <Skeleton variant="rounded" width={92} height={24} />
          <Skeleton variant="rounded" width={70} height={24} />
        </Box>
      </Card>
    ))}
  </Box>
);

/** Detail-page skeleton. */
export const RoleDetailsSkeleton = () => (
  <Box aria-busy="true" aria-label="Loading role details">
    <Skeleton variant="text" width={260} height={44} />
    <Skeleton variant="text" width={420} height={20} sx={{ mb: 3 }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={110} />)}
    </Box>
    <Skeleton variant="rounded" height={280} />
  </Box>
);

export default RoleGridSkeleton;

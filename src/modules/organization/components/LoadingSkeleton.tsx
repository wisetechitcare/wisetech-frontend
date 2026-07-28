import { Box, Card, Skeleton } from '@mui/material';

const GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
  gap: 2,
} as const;

/** Card-shaped skeletons — matches the tenant grid so there is no layout shift. */
export const TenantGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <Box sx={GRID} aria-busy="true" aria-live="polite" aria-label="Loading tenants">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Skeleton variant="rounded" width={44} height={44} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="35%" height={16} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5 }}>
          <Skeleton variant="rounded" width={92} height={24} />
          <Skeleton variant="rounded" width={70} height={24} />
        </Box>
      </Card>
    ))}
  </Box>
);

/** Tree pane skeleton — a short stack of indented rows. */
export const TreeSkeleton = ({ rows = 7 }: { rows?: number }) => (
  <Box aria-busy="true" aria-label="Loading organization tree" sx={{ p: 1 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, pl: (i % 3) * 2 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={`${40 + ((i * 13) % 45)}%`} height={22} />
      </Box>
    ))}
  </Box>
);

/** Unit details pane skeleton. */
export const UnitDetailsSkeleton = () => (
  <Box aria-busy="true" aria-label="Loading unit details">
    <Skeleton variant="text" width={240} height={40} />
    <Skeleton variant="text" width={360} height={20} sx={{ mb: 3 }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={92} />)}
    </Box>
    <Skeleton variant="rounded" height={260} />
  </Box>
);

export default TenantGridSkeleton;

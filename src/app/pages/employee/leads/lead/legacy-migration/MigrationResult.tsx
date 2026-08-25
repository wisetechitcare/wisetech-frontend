import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material';
import { AutoGrid, StatTile, TRIO, WtButton } from '@app/modules/common/components/ui';
import type { ExecuteProgress, MigrationRecord } from '@/types/legacyMigration';

/**
 * Live execution progress and the final result.
 *
 * Every number here comes from the server's batch responses — there is no simulated
 * percentage, and skipped/failed counts are real outcomes rather than preview errors.
 */
export function MigrationResult({
  progress,
  migrationCode,
  running,
  error,
  problemRecords,
  onClose,
  onReviewProblems,
}: {
  progress: ExecuteProgress | null;
  migrationCode: string;
  running: boolean;
  error: string | null;
  problemRecords: MigrationRecord[];
  onClose: () => void;
  onReviewProblems: () => void;
}) {
  const total = progress ? progress.processed + progress.remaining : 0;
  const percent = total > 0 ? Math.round((progress!.processed / total) * 100) : 0;

  return (
    <Stack spacing={2}>
      {running && (
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2">
              Migrating… {progress?.processed ?? 0} of {total} records
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {percent}%
            </Typography>
          </Stack>
          {/* Determinate, because the server tells us exactly what remains. */}
          <LinearProgress variant={progress ? 'determinate' : 'indeterminate'} value={percent} />
        </Box>
      )}

      {!running && progress?.done && (
        <Box>
          <Typography variant="h6">Migration completed</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Migration ID {migrationCode}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" variant="outlined">
          {error} Records already migrated are committed — you can re-run to continue with the rest.
        </Alert>
      )}

      {progress && (
        <AutoGrid min={150}>
          <StatTile label="Processed" value={progress.processed} trio={TRIO.slate} icon="abstract-26" />
          <StatTile label="Updated" value={progress.updated} trio={TRIO.blue} icon="pencil" />
          <StatTile label="Created" value={progress.created} trio={TRIO.green} icon="plus-square" />
          <StatTile label="Skipped" value={progress.skipped} trio={TRIO.slate} icon="cross-square" />
          <StatTile label="Failed" value={progress.failed} trio={TRIO.rose} icon="shield-cross" />
          <StatTile label="Stale" value={progress.stale} trio={TRIO.amber} icon="time" />
        </AutoGrid>
      )}

      {problemRecords.length > 0 && (
        <Alert severity="warning" variant="outlined">
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {problemRecords.length} record{problemRecords.length === 1 ? '' : 's'} need attention
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 1 }}>
            {problemRecords.slice(0, 5).map((record) => (
              <Typography key={record.id} variant="caption">
                Row {record.csvRowNumber} · {record.status} · {record.error ?? 'no detail'}
              </Typography>
            ))}
          </Stack>
          <WtButton size="small" flat onClick={onReviewProblems}>
            Review them
          </WtButton>
        </Alert>
      )}

      {!running && (
        <Stack direction="row" justifyContent="flex-end">
          <WtButton onClick={onClose}>Close</WtButton>
        </Stack>
      )}
    </Stack>
  );
}

export default MigrationResult;

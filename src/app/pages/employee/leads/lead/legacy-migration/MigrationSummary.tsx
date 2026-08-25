import { Alert, Box, Stack, Typography } from '@mui/material';
import { AutoGrid, GlassSurface, StatTile, TRIO, WtButton } from '@app/modules/common/components/ui';
import type { MigrationSummary as Summary } from '@/types/legacyMigration';

/**
 * The last screen before anything is written. States plainly what will happen and
 * requires an explicit confirmation.
 */
export function MigrationSummaryStep({
  summary,
  migrationCode,
  columnLabels,
  onConfirm,
  onBack,
  confirming,
}: {
  summary: Summary;
  migrationCode: string;
  columnLabels: Record<string, string>;
  onConfirm: () => void;
  onBack: () => void;
  confirming?: boolean;
}) {
  const approved = summary.approved ?? 0;
  const willUpdate = summary.willUpdate ?? 0;
  const willCreate = summary.willCreate ?? 0;
  const skipped = summary.skipped ?? 0;
  const needsReview = summary.totalRows - approved - skipped - (summary.executed ?? 0);

  const fieldEntries = Object.entries(summary.fieldChangeCounts ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <Stack spacing={2}>
      <AutoGrid min={180}>
        <StatTile label="Will update" value={willUpdate} trio={TRIO.blue} icon="pencil" />
        <StatTile label="Will create" value={willCreate} trio={TRIO.green} icon="plus-square" />
        <StatTile label="Will skip" value={skipped} trio={TRIO.slate} icon="cross-square" />
        <StatTile label="Not yet reviewed" value={Math.max(0, needsReview)} trio={TRIO.amber} icon="information" />
      </AutoGrid>

      {fieldEntries.length > 0 && (
        <GlassSurface variant="thin" sx={{ p: 1.5, borderRadius: '14px', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Fields being changed
          </Typography>
          <Stack spacing={0.5}>
            {fieldEntries.slice(0, 10).map(([field, count]) => (
              <Stack key={field} direction="row" justifyContent="space-between">
                <Typography variant="body2">{columnLabels[field] ?? field}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {count}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </GlassSurface>
      )}

      {approved === 0 ? (
        <Alert severity="warning" variant="outlined">
          Nothing has been approved yet. Review records and approve them before migrating.
        </Alert>
      ) : (
        <Alert severity="info" variant="outlined">
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            No database changes have been made yet.
          </Typography>
          <Typography variant="body2">
            Confirming will update {willUpdate} existing lead{willUpdate === 1 ? '' : 's'} and create {willCreate} new
            one{willCreate === 1 ? '' : 's'}. Every change is recorded in the audit history under {migrationCode}.
          </Typography>
        </Alert>
      )}

      <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
          <WtButton ghost onClick={onBack} disabled={confirming}>
            Back to review
          </WtButton>
          <WtButton tone="success" disabled={approved === 0 || confirming} onClick={onConfirm}>
            {confirming ? 'Migrating…' : `Confirm migration (${approved})`}
          </WtButton>
        </Stack>
      </Box>
    </Stack>
  );
}

export default MigrationSummaryStep;

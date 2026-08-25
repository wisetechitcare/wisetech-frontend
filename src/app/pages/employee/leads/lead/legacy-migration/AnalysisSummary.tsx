import { Box, Stack, Typography } from '@mui/material';
import { AutoGrid, GlassSurface, StatTile, TRIO } from '@app/modules/common/components/ui';
import type { MigrationSummary } from '@/types/legacyMigration';

/**
 * Post-analysis overview: how many rows matched at each confidence level, and which
 * fields will need attention. Read-only — nothing has been written at this point.
 */
export function AnalysisSummary({
  summary,
  migrationCode,
  columnLabels,
}: {
  summary: MigrationSummary;
  migrationCode: string;
  columnLabels: Record<string, string>;
}) {
  const tiles = [
    { label: 'Total records', value: summary.totalRows, trio: TRIO.slate, icon: 'file-up' },
    { label: 'High confidence', value: summary.high, trio: TRIO.green, icon: 'shield-tick' },
    { label: 'Medium', value: summary.medium, trio: TRIO.amber, icon: 'information' },
    { label: 'Low', value: summary.low, trio: TRIO.slate, icon: 'questionnaire-tablet' },
    { label: 'Ambiguous', value: summary.ambiguous, trio: TRIO.purple, icon: 'copy' },
    { label: 'No match', value: summary.noMatch, trio: TRIO.rose, icon: 'cross-circle' },
    { label: 'Duplicate rows', value: summary.duplicateInCsv, trio: TRIO.cyan, icon: 'copy-success' },
    { label: 'Invalid rows', value: summary.invalid, trio: TRIO.rose, icon: 'shield-cross' },
  ];

  const fieldEntries = Object.entries(summary.fieldChangeCounts ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.6 }}>
          MIGRATION {migrationCode}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Analysis complete. No database changes have been made yet.
        </Typography>
      </Box>

      <AutoGrid min={170}>
        {tiles.map((tile) => (
          <StatTile key={tile.label} label={tile.label} value={tile.value} trio={tile.trio} icon={tile.icon} />
        ))}
      </AutoGrid>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <GlassSurface variant="thin" sx={{ p: 1.5, borderRadius: '14px', borderColor: 'divider', flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Records with differences
          </Typography>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="h6">{summary.withChanges}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                have differences
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6">{summary.withoutChanges}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                identical
              </Typography>
            </Box>
          </Stack>
        </GlassSurface>

        <GlassSurface variant="thin" sx={{ p: 1.5, borderRadius: '14px', borderColor: 'divider', flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Fields needing attention
          </Typography>
          {fieldEntries.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No field differences were found.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {fieldEntries.slice(0, 8).map(([field, count]) => (
                <Stack key={field} direction="row" justifyContent="space-between">
                  <Typography variant="body2">{columnLabels[field] ?? field}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {count}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </GlassSurface>
      </Stack>

      {(summary.unmappedHeaders?.length ?? 0) > 0 && (
        <GlassSurface variant="thin" sx={{ p: 1.5, borderRadius: '14px', borderColor: 'warning.light' }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Columns that were not recognised
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            These headers were ignored: {summary.unmappedHeaders!.join(', ')}
          </Typography>
        </GlassSurface>
      )}
    </Stack>
  );
}

export default AnalysisSummary;

import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { GlassSurface, WtButton, toneAlpha } from '@app/modules/common/components/ui';
import { tonePair, type SemanticTone } from '@app/theme/tokens';
import { MICRO, NUM } from './summaryChrome';
import type { ExecuteProgress, MigrationRecord } from '@/types/legacyMigration';

/**
 * Step 5 — live execution, then the receipt.
 *
 * WHAT THIS REPLACES
 * ------------------
 * Six stat tiles, four of them usually zero, under a plain "Migration completed" — a
 * screen that ended in a wall of nothing-happened and gave the admin no idea whether
 * the run had gone well, or where to go next.
 *
 * THE RULE HERE
 * -------------
 * A receipt leads with the outcome, then the exceptions, then the door. Counts of
 * zero are not printed: the absence of failures is told by the headline, not by a box
 * containing 0. Every number still comes from the server's own batch responses —
 * there is no simulated percentage.
 */

const STATUS_WORDS: Record<string, string> = {
  FAILED: 'could not be written',
  STALE: 'changed after you reviewed it',
  SKIPPED: 'was skipped',
  INVALID: 'could not be read',
  DUPLICATE_IN_CSV: 'is repeated in your file',
};

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

  const written = (progress?.updated ?? 0) + (progress?.created ?? 0);
  const troubled = (progress?.failed ?? 0) + (progress?.stale ?? 0);
  const done = Boolean(!running && progress?.done);

  // The annotation has to sit on the literal, not on the filtered result: each `tone`
  // widens to `string` while the array is being built, and `.filter()` hands back an
  // array of that already-widened type.
  const allOutcomes: { value: number; label: string; tone: SemanticTone }[] = [
    { value: progress?.updated ?? 0, label: 'updated', tone: 'brand' },
    { value: progress?.created ?? 0, label: 'created', tone: 'success' },
    { value: progress?.skipped ?? 0, label: 'skipped', tone: 'neutral' },
    { value: progress?.failed ?? 0, label: 'failed', tone: 'danger' },
    { value: progress?.stale ?? 0, label: 'went stale', tone: 'warning' },
  ];
  const outcomes = allOutcomes.filter((outcome) => outcome.value > 0);

  const tone: SemanticTone = troubled > 0 ? 'warning' : 'success';
  const fg = tonePair(tone).fg;
  const danger = tonePair('danger').fg;

  return (
    <Stack spacing={2}>
      {running && (
        <GlassSurface variant="thin" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.25 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
              Writing your rows…
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', ...NUM }}>
              {progress?.processed ?? 0} of {total} · {percent}%
            </Typography>
          </Stack>
          {/* Determinate, because the server tells us exactly what remains. */}
          <LinearProgress
            variant={progress ? 'determinate' : 'indeterminate'}
            value={percent}
            sx={{ height: 8, borderRadius: 999 }}
          />
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1.25 }}>
            Rows already written are committed. Closing this now will not undo them.
          </Typography>
        </GlassSurface>
      )}

      {done && (
        <GlassSurface
          variant="thin"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '16px',
            borderColor: toneAlpha(fg, 0.35),
            bgcolor: toneAlpha(fg, 0.04),
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', lineHeight: 1.4 }}>
            {written === 0
              ? 'Finished without writing anything.'
              : `${written} ${written === 1 ? 'lead is' : 'leads are'} now up to date.`}
          </Typography>

          {/* Only outcomes that actually happened, and only when the headline has not
              already said it — a clean run of two updates does not need "2 updated"
              printed underneath "2 leads are now up to date". */}
          {outcomes.length > 1 && (
            <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.6, mt: 0.75 }}>
              {outcomes.map((outcome, i) => (
                <Box component="span" key={outcome.label}>
                  {i > 0 && ' · '}
                  <Box component="span" sx={{ fontWeight: 800, color: tonePair(outcome.tone).fg, ...NUM }}>
                    {outcome.value}
                  </Box>{' '}
                  {outcome.label}
                </Box>
              ))}
            </Typography>
          )}

          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6, mt: 1.25 }}>
            Audit history{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', ...NUM }}>
              {migrationCode}
            </Box>
          </Typography>
        </GlassSurface>
      )}

      {error && (
        <GlassSurface
          variant="thin"
          sx={{ p: 2, borderRadius: '14px', borderColor: toneAlpha(danger, 0.4), bgcolor: toneAlpha(danger, 0.05) }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: danger, lineHeight: 1.4, mb: 0.5 }}>
            The run stopped early
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
            {error} Rows already migrated are committed — run it again to continue with the rest.
          </Typography>
        </GlassSurface>
      )}

      {problemRecords.length > 0 && (
        <GlassSurface
          variant="thin"
          sx={{
            p: 2,
            borderRadius: '14px',
            borderColor: toneAlpha(tonePair('warning').fg, 0.4),
            bgcolor: toneAlpha(tonePair('warning').fg, 0.04),
          }}
        >
          <Typography sx={{ ...MICRO, color: 'text.primary', mb: 1.5 }}>
            {problemRecords.length} {problemRecords.length === 1 ? 'row needs' : 'rows need'} another look
          </Typography>

          <Stack spacing={1} sx={{ mb: 1.75 }}>
            {problemRecords.slice(0, 5).map((record) => (
              <Stack key={record.id} direction="row" spacing={1.25} alignItems="baseline">
                <Typography
                  sx={{ fontSize: 11, fontWeight: 800, color: 'text.disabled', flex: 'none', width: 46, ...NUM }}
                >
                  ROW {record.csvRowNumber}
                </Typography>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.45 }}>
                    {STATUS_WORDS[record.status] ?? 'needs attention'}
                  </Typography>
                  {record.error && (
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.45 }}>
                      {record.error}
                    </Typography>
                  )}
                </Box>
              </Stack>
            ))}
            {problemRecords.length > 5 && (
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                and {problemRecords.length - 5} more
              </Typography>
            )}
          </Stack>

          <WtButton size="small" flat onClick={onReviewProblems}>
            Open these rows
          </WtButton>
        </GlassSurface>
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

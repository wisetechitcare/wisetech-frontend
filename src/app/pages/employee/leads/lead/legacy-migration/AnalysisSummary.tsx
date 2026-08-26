import { Box, Stack, Typography } from '@mui/material';
import { GlassSurface, toneAlpha } from '@app/modules/common/components/ui';
import { tonePair, type SemanticTone } from '@app/theme/tokens';
import { FieldList, MICRO, NUM } from './summaryChrome';
import type { MigrationSummary } from '@/types/legacyMigration';

/**
 * Step 2 — the manifest for the file that was just analysed.
 *
 * WHAT THIS REPLACES
 * ------------------
 * Eight stat tiles of identical weight, then two panels. "Total records 35" shouted
 * exactly as loudly as "Duplicate rows 0", so nothing was important; "High confiden…"
 * did not fit its own tile; and the five confidence tiles hid the one fact that
 * describes the file — that 15 + 13 + 3 + 1 + 3 is the whole of 35. The left panel was
 * nine tenths empty space.
 *
 * THE RULE HERE
 * -------------
 * This is a briefing before a hard-to-undo action, not a dashboard. It answers three
 * questions in order of how much they change what the admin does next: how much of
 * this do I have to look at myself, what shape is the file in, and what would it
 * touch. A count of zero is not shown as a zero — it is shown as nothing at all.
 *
 * The bucket names and colours are lifted from the review screen deliberately. The
 * previous version used the raw confidence enum (AMBIGUOUS, NO MATCH) while the very
 * next step of the same wizard called the same rows "Several possible" and "Not in
 * the system" — one wizard speaking two languages, one click apart.
 */

interface Bucket {
  key: string;
  label: string;
  count: number;
  tone: SemanticTone;
}

/** Certain first, least certain last — the order is the information. */
const bucketsOf = (summary: MigrationSummary): Bucket[] =>
  [
    { key: 'high', label: 'Same lead', count: summary.high, tone: 'success' as const },
    { key: 'medium', label: 'Probably the same', count: summary.medium, tone: 'warning' as const },
    { key: 'low', label: 'Might be the same', count: summary.low, tone: 'neutral' as const },
    { key: 'ambiguous', label: 'Several possible', count: summary.ambiguous, tone: 'cyan' as const },
    { key: 'noMatch', label: 'Not in the system', count: summary.noMatch, tone: 'danger' as const },
  ].filter((bucket) => bucket.count > 0);

/**
 * The file, drawn to scale.
 *
 * One bar rather than five tiles, because the proportions are the story: a bar that is
 * mostly green is a clean import and a bar that is mostly grey is an afternoon of
 * work, and you can tell which before reading a single number. The legend carries the
 * counts, so the picture and the figures are one object instead of a chart above a
 * table.
 */
function CompositionBar({ buckets, total }: { buckets: Bucket[]; total: number }) {
  return (
    <Stack spacing={1.25}>
      <Box
        role="img"
        aria-label={buckets.map((b) => `${b.count} ${b.label}`).join(', ')}
        sx={{
          display: 'flex',
          height: 10,
          borderRadius: 999,
          overflow: 'hidden',
          bgcolor: 'action.hover',
          transformOrigin: 'left center',
          animation: 'wtManifestGrow 620ms cubic-bezier(.2,.8,.2,1) both',
          '@keyframes wtManifestGrow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {buckets.map((bucket) => (
          <Box
            key={bucket.key}
            sx={{
              // A single row still has to be visible, so the smallest slice keeps a floor.
              flex: `${bucket.count} 0 auto`,
              minWidth: 6,
              bgcolor: tonePair(bucket.tone).fg,
            }}
          />
        ))}
      </Box>

      <Stack direction="row" flexWrap="wrap" sx={{ gap: { xs: 1.25, sm: 2.5 } }}>
        {buckets.map((bucket) => {
          const fg = tonePair(bucket.tone).fg;
          return (
            <Stack key={bucket.key} direction="row" spacing={0.75} alignItems="baseline">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: fg, flex: 'none', alignSelf: 'center' }} />
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{bucket.label}</Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', ...NUM }}>
                {bucket.count}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', ...NUM }}>
                {Math.round((bucket.count / total) * 100)}%
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}

export function AnalysisSummary({
  summary,
  migrationCode,
  columnLabels,
}: {
  summary: MigrationSummary;
  migrationCode: string;
  columnLabels: Record<string, string>;
}) {
  const buckets = bucketsOf(summary);
  const total = Math.max(1, summary.totalRows);

  // Counted server-side, where a row that is both ambiguous and duplicated counts once.
  const needsReview =
    summary.needsReview ?? summary.low + summary.ambiguous + summary.duplicateInCsv + summary.invalid;
  const certain = summary.high;

  const fieldEntries = Object.entries(summary.fieldChangeCounts ?? {}).sort((a, b) => b[1] - a[1]) as [
    string,
    number,
  ][];

  // Rows and columns the migration will not act on. Absent when there are none —
  // an empty state is the absence of the panel, not a panel containing zeros.
  const setAside = [
    { label: summary.duplicateInCsv === 1 ? 'row repeated in your file' : 'rows repeated in your file', count: summary.duplicateInCsv },
    { label: summary.invalid === 1 ? 'row could not be read' : 'rows could not be read', count: summary.invalid },
  ].filter((entry) => entry.count > 0);
  const unmapped = summary.unmappedHeaders ?? [];

  const verdictTone: SemanticTone = needsReview === 0 ? 'success' : needsReview > certain ? 'warning' : 'brand';
  const verdictFg = tonePair(verdictTone).fg;

  return (
    <Stack spacing={2}>
      <Typography sx={{ ...MICRO }}>Run {migrationCode}</Typography>

      {/* The verdict. The only number on this screen that changes what the admin does
          next, at the size that says so — beside the fact that matters most before a
          write: none of it has happened yet. */}
      <GlassSurface variant="thin" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px', borderColor: 'divider' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 3 }}
          alignItems={{ sm: 'flex-end' }}
          sx={{ mb: 2.5 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="baseline" sx={{ flex: 'none' }}>
            <Typography sx={{ fontSize: { xs: 44, sm: 56 }, fontWeight: 800, lineHeight: 0.9, color: verdictFg, ...NUM }}>
              {needsReview}
            </Typography>
            <Typography sx={{ fontSize: 15, color: 'text.secondary', ...NUM }}>of {summary.totalRows}</Typography>
          </Stack>

          <Box sx={{ minWidth: 0, pb: 0.5 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
              {needsReview === 0
                ? 'Every row matched cleanly.'
                : `${needsReview === 1 ? 'One row needs' : 'These rows need'} your eyes.`}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
              {certain > 0 && `${certain} matched an existing lead outright. `}
              Nothing has been written to the database yet.
            </Typography>
          </Box>
        </Stack>

        <CompositionBar buckets={buckets} total={total} />
      </GlassSurface>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
        <GlassSurface
          variant="thin"
          sx={{ p: 2, borderRadius: '14px', borderColor: 'divider', flex: 1, minWidth: 0 }}
        >
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 1.5 }}>
            <Typography sx={{ ...MICRO, color: 'text.primary' }}>What would change</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', ...NUM }}>
              {summary.withChanges} of {summary.totalRows} rows
            </Typography>
          </Stack>

          {fieldEntries.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Your file agrees with the system on every field. Importing would change nothing.
            </Typography>
          ) : (
            <FieldList entries={fieldEntries} labelFor={(field) => columnLabels[field] ?? field} limit={7} />
          )}
        </GlassSurface>

        {(setAside.length > 0 || unmapped.length > 0) && (
          <GlassSurface
            variant="thin"
            sx={{
              p: 2,
              borderRadius: '14px',
              flex: 1,
              minWidth: 0,
              borderColor: toneAlpha(tonePair('warning').fg, 0.35),
              bgcolor: toneAlpha(tonePair('warning').fg, 0.04),
            }}
          >
            <Typography sx={{ ...MICRO, color: 'text.primary', mb: 1.5 }}>Set aside</Typography>
            <Stack spacing={1.25}>
              {setAside.map((entry) => (
                <Stack key={entry.label} direction="row" spacing={1} alignItems="baseline">
                  <Typography
                    sx={{ fontSize: 15, fontWeight: 700, color: tonePair('warning').fg, flex: 'none', ...NUM }}
                  >
                    {entry.count}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{entry.label}</Typography>
                </Stack>
              ))}

              {unmapped.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
                    {unmapped.length === 1 ? 'One column was' : `${unmapped.length} columns were`} not recognised and
                    will be ignored:
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.primary', fontWeight: 600, wordBreak: 'break-word' }}>
                    {unmapped.join(', ')}
                  </Typography>
                </Box>
              )}
            </Stack>
          </GlassSurface>
        )}
      </Stack>
    </Stack>
  );
}

export default AnalysisSummary;

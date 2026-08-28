import { Box, Stack, Typography } from '@mui/material';
import { GlassSurface, WtButton, toneAlpha } from '@app/modules/common/components/ui';
import { tonePair } from '@app/theme/tokens';
import { Count, FieldList, NUM } from './summaryChrome';
import type { MigrationSummary as Summary } from '@/types/legacyMigration';

/**
 * Step 4 — the last screen before anything is written.
 *
 * WHAT THIS REPLACES
 * ------------------
 * Two rounds of it. First four stat tiles of equal weight, where "Will skip 0" took as
 * much of the screen as the number being acted on, above a field list counting the
 * whole analysis rather than the approved rows — "Rate 22" printed directly above
 * "will update 1", describing work it was not about to do.
 *
 * Then a version that fixed the counts and overbuilt everything else: an eyebrow, two
 * big figures (one of them a zero), a sentence repeating both, and six proportional
 * bars that all came out the same length because every field read 2 of 2. The numeral
 * 2 appeared nine times on one screen.
 *
 * THE RULE HERE
 * -------------
 * Say the consequence once, as a sentence. A number appears in exactly one place. A
 * bar is drawn only where there is something to compare, a zero is not drawn at all,
 * and the whole consent lives on one surface rather than three.
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
  const undecided = Math.max(0, summary.totalRows - approved - skipped - (summary.executed ?? 0));

  // Only what the approved rows would write. Falls back to the run-wide counts on an
  // older server, which is the number this screen used to show unconditionally.
  const fieldEntries = Object.entries(summary.approvedFieldChangeCounts ?? summary.fieldChangeCounts ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]) as [string, number][];

  const warn = tonePair('warning').fg;

  /** "updates 2 existing leads and creates 3 new ones" — only the halves that happen. */
  const clauses: JSX.Element[] = [];
  if (willUpdate > 0) {
    clauses.push(
      <Box component="span" key="update">
        updates <Count value={willUpdate} tone="brand" /> existing {willUpdate === 1 ? 'lead' : 'leads'}
      </Box>,
    );
  }
  if (willCreate > 0) {
    clauses.push(
      <Box component="span" key="create">
        creates <Count value={willCreate} tone="success" /> new {willCreate === 1 ? 'lead' : 'leads'}
      </Box>,
    );
  }

  return (
    <Stack spacing={2}>
      <GlassSurface variant="thin" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px', borderColor: 'divider' }}>
        {clauses.length === 0 ? (
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: warn, lineHeight: 1.55 }}>
            Nothing is approved yet, so this would write nothing. Go back and approve the rows you want to import.
          </Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 17, color: 'text.primary', lineHeight: 1.5 }}>
              Confirming {clauses.length === 2 ? <>{clauses[0]} and {clauses[1]}</> : clauses[0]}.
            </Typography>

            {fieldEntries.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <FieldList entries={fieldEntries} labelFor={(field) => columnLabels[field] ?? field} />
              </Box>
            )}

            {willCreate > 0 && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, mt: 1 }}>
                New leads take every column your file supplied.
              </Typography>
            )}
          </>
        )}

        {/* The cost of confirming now. A row nobody decided on is not imported — it is
            left behind, and that is the one thing this screen has to say out loud. */}
        {undecided > 0 && (
          <Box
            sx={{
              mt: 2,
              px: 1.5,
              py: 1.25,
              borderRadius: '10px',
              borderLeft: '3px solid',
              borderColor: warn,
              bgcolor: toneAlpha(warn, 0.06),
            }}
          >
            <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.55 }}>
              <Count value={undecided} tone="warning" /> {undecided === 1 ? 'row is' : 'rows are'} still undecided and
              will be left behind. You can come back and run {undecided === 1 ? 'it' : 'them'} later.
            </Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6, mt: 2 }}>
          Nothing has been written yet · audit history{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', ...NUM }}>
            {migrationCode}
          </Box>
        </Typography>
      </GlassSurface>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
        <WtButton ghost onClick={onBack} disabled={confirming}>
          Back to review
        </WtButton>
        <WtButton tone="success" disabled={approved === 0 || confirming} onClick={onConfirm}>
          {confirming ? 'Migrating…' : `Confirm migration (${approved})`}
        </WtButton>
      </Stack>
    </Stack>
  );
}

export default MigrationSummaryStep;

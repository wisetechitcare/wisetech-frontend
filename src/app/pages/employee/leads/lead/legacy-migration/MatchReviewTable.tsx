import { Box, CircularProgress, Pagination, Stack, TextField, Typography } from '@mui/material';
import { SegmentedControl, ToneChip, WtButton, toneAlpha } from '@app/modules/common/components/ui';
import { tonePair, type SemanticTone } from '@app/theme/tokens';
import { formatMaybeDate } from '@utils/dateFormats';
import type { FieldDifference, MigrationRecord, RecordDecision } from '@/types/legacyMigration';

/**
 * Step 3 — one card per row of the uploaded file.
 *
 * WHAT THIS REPLACES
 * ------------------
 * A table whose "Changes" column was the number 3, with the actual comparison behind
 * a Review click; then a version of this file that fixed the hiding by printing all
 * seven fields as equal-sized tiles. That was worse in a different way: five of the
 * seven said "same", so the two that mattered were the hardest things on screen to
 * find, dates printed as 2025-11-08T18:30:00.000Z, and five rows filled a laptop.
 *
 * THE RULE HERE
 * -------------
 * What changes is the content; what agrees is a footnote. A row where nothing
 * changes should take one line and no attention. The reader is whoever owns the old
 * spreadsheet — not someone who knows what OLD_ONLY or AMBIGUOUS means.
 */

const CONFIDENCE: Record<string, { label: string; tone: SemanticTone; blurb: string }> = {
  HIGH: { label: 'Same lead', tone: 'success', blurb: 'The number and the name both agree.' },
  MEDIUM: { label: 'Probably the same', tone: 'warning', blurb: 'Close, but worth a glance.' },
  LOW: { label: 'Might be the same', tone: 'neutral', blurb: 'Only loosely similar — check before applying.' },
  AMBIGUOUS: { label: 'Several possible', tone: 'cyan', blurb: 'More than one lead fits. Pick one in Review.' },
  NO_MATCH: { label: 'Not in the system', tone: 'danger', blurb: 'Nothing matched. It would be added as a new lead.' },
};

const STATUS: Record<string, { label: string; tone: SemanticTone }> = {
  PENDING: { label: 'Not decided', tone: 'neutral' },
  APPROVED: { label: 'Will import', tone: 'success' },
  SKIPPED: { label: 'Skipped', tone: 'neutral' },
  EXECUTED: { label: 'Imported', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  STALE: { label: 'Changed since you checked', tone: 'warning' },
  DUPLICATE_IN_CSV: { label: 'Repeated in your file', tone: 'cyan' },
  INVALID: { label: 'Cannot be read', tone: 'danger' },
};

const FILTERS = [
  { value: 'all', label: 'Everything' },
  { value: 'needs_review', label: 'Needs a look' },
  { value: 'high', label: 'Same lead' },
  { value: 'medium', label: 'Probably same' },
  { value: 'low', label: 'Might be same' },
  { value: 'ambiguous', label: 'Several possible' },
  { value: 'no_match', label: 'Not in the system' },
  { value: 'approved', label: 'Will import' },
  { value: 'failed', label: 'Failed' },
];

/** The tab's own words, for anything that needs to name the current tab in a sentence. */
export const filterLabel = (value: string): string =>
  FILTERS.find((option) => option.value === value)?.label ?? value;

const DASH = '—';

/** A stored date arrives as a full ISO instant; nobody wants to read the Z. */
const show = (value: string | null): string => formatMaybeDate(value, DASH);

/**
 * Fields whose agreement is not worth reporting.
 *
 * The "already match" line exists to reassure you the rest of the row is fine. Rate
 * Type holds one of two values, so nearly every lead in the database agrees with
 * nearly every row of any file — "✓ 1 already matches — Rate Type" is a coin landing
 * the way it always lands, dressed up as confirmation. A CHANGE to it is still shown:
 * that one is a real write.
 */
const NOT_WORTH_REPORTING = new Set(['costType']);

/** Fields that would actually be written. Everything else is context. */
const changing = (differences: FieldDifference[]): FieldDifference[] =>
  differences.filter(
    (d) => d.writable && (d.status === 'DIFFERENT' || d.status === 'CONFLICT' || d.status === 'OLD_ONLY'),
  );

/**
 * A number the file wants to write that already belongs to a different lead.
 *
 * Lead and project numbers have to stay unique, and the server refuses to write one
 * that is taken — so the one-click Apply must not stage it. The row still shows the
 * change, in red, with the note saying which lead holds the number; taking it anyway
 * is a deliberate act through Change field by field.
 */
const contested = (d: FieldDifference): boolean =>
  d.status === 'CONFLICT' && (d.field === 'prefix' || d.field === 'projectNumber');

/**
 * Accepting every change on a row.
 *
 * The executor only writes fields named explicitly in `fieldDecisions` — sending
 * `{ action: 'UPDATE' }` alone approves the row and then changes nothing at all.
 */
const acceptAll = (record: MigrationRecord): RecordDecision => ({
  action: record.matchedLeadId ? 'UPDATE' : 'CREATE',
  targetLeadId: record.matchedLeadId,
  fieldDecisions: Object.fromEntries(
    changing(record.differences ?? []).map((d) => [
      d.field,
      { choice: contested(d) ? ('KEEP_CURRENT' as const) : ('USE_OLD' as const) },
    ]),
  ),
});

/** Column widths shared by the change header and every change row, so they line up. */
const COL_LABEL = { sm: 130 };

/**
 * Which side is which.
 *
 * The two values sat either side of an arrow with nothing naming them, so "was X → Y"
 * left the reader to work out from styling alone which one was already in the system
 * and which came out of their spreadsheet. On a screen whose whole job is to compare
 * two sources, that is the one thing that cannot be implicit.
 */
function ChangeHeader() {
  const caption = {
    fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
    textTransform: 'uppercase' as const, color: 'text.secondary',
  };
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0, sm: 1.5 }}
      sx={{ pb: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Box sx={{ ...caption, width: COL_LABEL, flex: 'none' }}>Field</Box>
      <Box sx={{ ...caption, flex: 1, minWidth: 0 }}>In the system now</Box>
      <Box sx={{ width: 12, flex: 'none' }} />
      <Box sx={{ ...caption, flex: 1, minWidth: 0, color: tonePair('warning').fg }}>
        From your file
      </Box>
    </Stack>
  );
}

/** One field that will change: what it is, what it was, what it becomes. */
function ChangeRow({ difference }: { difference: FieldDifference }) {
  const warn = tonePair(difference.status === 'CONFLICT' ? 'danger' : 'warning').fg;
  return (
    <Box sx={{ py: 0.6, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 0.25, sm: 1.5 }}
        alignItems={{ sm: 'baseline' }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', width: COL_LABEL, flex: 'none' }}>
          {difference.label}
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.disabled', textDecoration: 'line-through', minWidth: 0, flex: 1 }}>
          {show(difference.currentValue)}
        </Typography>
        <Box sx={{ color: 'text.disabled', fontSize: 12, flex: 'none', width: 12, textAlign: 'center' }}>→</Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: warn, minWidth: 0, flex: 1, wordBreak: 'break-word' }}>
          {show(difference.oldValue)}
        </Typography>
      </Stack>

      {/* The reason a value is refused or contested. It has been on FieldDifference
          since the start and was never shown, so a row went red with no explanation. */}
      {difference.note && (
        <Typography
          sx={{
            fontSize: 12, lineHeight: 1.5, color: warn, fontWeight: 600,
            pl: { sm: `${COL_LABEL.sm + 12}px` }, pt: 0.25,
          }}
        >
          {difference.note}
        </Typography>
      )}
    </Box>
  );
}

/** One side of the comparison, with the side it came from named on it. */
function IdentityLine({
  tag, tone, title, number, strong,
}: {
  tag: string; tone: SemanticTone; title: string; number: string; strong?: boolean;
}) {
  const fg = tonePair(tone).fg;
  return (
    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0, flexWrap: 'wrap' }}>
      <Box
        sx={{
          flex: 'none', px: 0.75, borderRadius: '4px',
          fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
          lineHeight: 1.7, bgcolor: toneAlpha(fg, 0.12), color: fg,
          width: COL_LABEL, textAlign: 'center',
        }}
      >
        {tag}
      </Box>
      <Typography
        sx={{
          fontSize: strong ? 15 : 13.5, fontWeight: strong ? 700 : 500,
          color: strong ? 'text.primary' : 'text.secondary', lineHeight: 1.35, minWidth: 0,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
        {number}
      </Typography>
    </Stack>
  );
}

function RecordCard({
  record,
  onReview,
  onDecide,
  busy,
}: {
  record: MigrationRecord;
  onReview: (record: MigrationRecord) => void;
  onDecide?: (record: MigrationRecord, decision: RecordDecision) => void;
  busy?: boolean;
}) {
  const source = record.sourceData ?? {};
  const differences = record.differences ?? [];
  const changes = changing(differences);
  // Shown, but held back from the one-click Apply — see `contested`.
  const applies = changes.filter((d) => !contested(d));
  const agreeing = differences.filter((d) => d.status === 'SAME' && !NOT_WORTH_REPORTING.has(d.field));
  const matched = (record.candidates ?? []).find((c) => c.leadId === record.matchedLeadId);
  const confidence = CONFIDENCE[record.confidence ?? 'NO_MATCH'] ?? CONFIDENCE.NO_MATCH;
  const status = STATUS[record.status] ?? STATUS.PENDING;
  const accent = tonePair(confidence.tone).fg;
  const decided = record.status !== 'PENDING';

  /**
   * Ambiguous is NOT "not found".
   *
   * `matchedLeadId` is deliberately null on an ambiguous row — the matcher found
   * several leads it cannot choose between and is handing that choice to you. Reading
   * "no matched id" as "not in the system" put an `Add as new lead` button on rows
   * whose lead demonstrably already exists, one click from a duplicate.
   */
  const ambiguous = record.confidence === 'AMBIGUOUS';
  const candidates = record.candidates ?? [];
  const trulyNew = !record.matchedLeadId && !ambiguous;

  /**
   * Every line shows the same KIND of number.
   *
   * Each line used to pick `projectNumber ?? prefix` for itself, so a file that
   * identifies its rows by offer number listed its candidates by project number —
   * WT/OFFER/24-25/63 sitting above three WT/PROJECT/… lines, on a screen whose only
   * job is comparing the two. Whichever number your file supplied decides the column
   * for the whole card; the other one only stands in when that lead has none.
   */
  const fileNumber = source.projectNumber?.original || source.prefix?.original || '';
  const byProjectNumber = Boolean(source.projectNumber?.original);
  const leadNumberOf = (lead?: { prefix: string | null; projectNumber: string | null }): string =>
    (byProjectNumber ? lead?.projectNumber ?? lead?.prefix : lead?.prefix ?? lead?.projectNumber) ?? '';

  return (
    <Box
      sx={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        opacity: record.status === 'SKIPPED' ? 0.6 : 1,
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: accent }} />

      <Stack spacing={1.25} sx={{ p: { xs: 1.5, sm: 2 }, pl: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled' }}>
            ROW {record.csvRowNumber}
          </Typography>
          <ToneChip tone={confidence.tone} label={confidence.label} dense size="small" />
          <Box sx={{ flex: 1 }} />
          <ToneChip tone={status.tone} label={status.label} dense size="small" />
        </Stack>

        {/* Both sides tagged. Two project names one above the other, with only weight
            telling them apart, is the same ambiguity the change rows had. */}
        <Stack spacing={0.75}>
          <IdentityLine
            tag="From your file"
            tone="warning"
            title={source.title?.original || 'Untitled row'}
            number={fileNumber || 'no number'}
            strong
          />
          {record.matchedLeadId && (
            <IdentityLine
              tag="In the system"
              tone="neutral"
              title={matched?.lead.title ?? 'the matched lead'}
              number={leadNumberOf(matched?.lead)}
            />
          )}

          {/* Ambiguous: name what it is torn between, right here. Sending someone into
              a dialog to discover the shortlist is the reason this screen was unusable. */}
          {ambiguous && candidates.slice(0, 3).map((candidate) => (
            <IdentityLine
              key={candidate.leadId}
              tag="Could be"
              tone="cyan"
              title={candidate.lead.title ?? 'Untitled lead'}
              number={leadNumberOf(candidate.lead)}
            />
          ))}

          {(ambiguous || trulyNew) && (
            <Typography sx={{ fontSize: 12.5, color: tonePair(confidence.tone).fg, fontWeight: 600 }}>
              {confidence.blurb}
            </Typography>
          )}
        </Stack>

        {changes.length > 0 ? (
          <Box sx={{ borderRadius: '10px', bgcolor: toneAlpha(tonePair('warning').fg, 0.05), px: 1.25, py: 0.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'text.secondary', py: 0.5 }}>
              {changes.length} {changes.length === 1 ? 'field changes' : 'fields change'}
            </Typography>
            <ChangeHeader />
            {changes.map((difference) => (
              <ChangeRow key={difference.field} difference={difference} />
            ))}
          </Box>
        ) : record.matchedLeadId ? (
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: tonePair('success').fg }}>
            Nothing would change — your file already agrees with the system.
          </Typography>
        ) : null}
        {/* An unmatched row has no differences to compare against, which is not the
            same thing as "everything agrees" — that message used to appear here. */}

        {/* The quiet half: named, so "what about the other fields?" has an answer. */}
        {agreeing.length > 0 && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            <Box component="span" sx={{ color: tonePair('success').fg, fontWeight: 700 }}>
              ✓ {agreeing.length} already {agreeing.length === 1 ? 'matches' : 'match'}
            </Box>
            {' — '}
            {agreeing.map((d) => d.label).join(', ')}
          </Typography>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" sx={{ pt: 0.25 }}>
          <WtButton size="small" ghost disabled={busy} onClick={() => onReview(record)}>
            {changes.length ? 'Change field by field' : 'Open'}
          </WtButton>
          {onDecide && !decided && (
            <>
              <WtButton
                size="small" ghost disabled={busy}
                sx={{ color: tonePair('danger').fg }}
                onClick={() => onDecide(record, { action: 'SKIP' })}
              >
                Skip this row
              </WtButton>
              {/* No one-click action on an ambiguous row: neither choice is safe to
                  default. Creating would duplicate a lead that already exists, and
                  picking one of several is exactly the judgement being asked for. */}
              {ambiguous ? (
                <WtButton size="small" tone="accent" flat disabled={busy} onClick={() => onReview(record)}>
                  Pick the right lead
                </WtButton>
              ) : (
                <WtButton
                  size="small" tone="success" flat disabled={busy}
                  onClick={() => onDecide(record, acceptAll(record))}
                >
                  {record.matchedLeadId
                    ? (applies.length ? `Apply ${applies.length}` : 'Mark done')
                    : 'Add as new lead'}
                </WtButton>
              )}
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

export function MatchReviewTable({
  records,
  total,
  page,
  pageSize,
  filter,
  search,
  loading,
  busyRecordId,
  onFilterChange,
  onSearchChange,
  onPageChange,
  onReview,
  onDecide,
}: {
  records: MigrationRecord[];
  total: number;
  page: number;
  pageSize: number;
  filter: string;
  search: string;
  loading?: boolean;
  busyRecordId?: string | null;
  onFilterChange: (filter: string) => void;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onReview: (record: MigrationRecord) => void;
  onDecide?: (record: MigrationRecord, decision: RecordDecision) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
          <SegmentedControl
            ariaLabel="Filter migration records"
            options={FILTERS}
            value={filter}
            onChange={(next) => {
              onFilterChange(String(next));
              onPageChange(1);
            }}
          />
        </Box>
        <TextField
          size="small"
          placeholder="Search project number, name, company…"
          value={search}
          onChange={(event) => {
            onSearchChange(event.target.value);
            onPageChange(1);
          }}
          sx={{ minWidth: { xs: '100%', md: 280 } }}
        />
      </Stack>

      {loading && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {!loading && records.length === 0 && (
        <Typography sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
          Nothing here — try another filter.
        </Typography>
      )}

      {!loading && (
        <Stack spacing={1.25}>
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onReview={onReview}
              onDecide={onDecide}
              busy={busyRecordId === record.id}
            />
          ))}
        </Stack>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {total} rows
        </Typography>
        <Pagination count={pageCount} page={page} size="small" onChange={(_, next) => onPageChange(next)} />
      </Stack>
    </Stack>
  );
}

export default MatchReviewTable;

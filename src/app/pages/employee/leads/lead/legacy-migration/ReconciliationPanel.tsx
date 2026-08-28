import { useMemo, useState } from 'react';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassSurface, ToneChip, WtButton } from '@app/modules/common/components/ui';
import { formatMaybeDate } from '@utils/dateFormats';
import FieldDifferenceRow from './FieldDifferenceRow';
import MatchCandidateCard from './MatchCandidateCard';
import type {
  EntityChoice,
  FieldChoice,
  MigrationRecord,
  RecordDecision,
} from '@/types/legacyMigration';

/**
 * The per-record review surface: why this row matched, what differs, and what the
 * admin wants done about it.
 *
 * Nothing here writes to the database — decisions are staged server-side and only
 * applied after the final confirmation step.
 */

/** Same words as the review list — one screen must not rename what the other showed. */
const CONFIDENCE: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'cyan' | 'danger' }> = {
  HIGH: { label: 'Same lead', tone: 'success' },
  MEDIUM: { label: 'Probably the same', tone: 'warning' },
  LOW: { label: 'Might be the same', tone: 'neutral' },
  AMBIGUOUS: { label: 'Several possible', tone: 'cyan' },
  NO_MATCH: { label: 'Not in the system', tone: 'danger' },
};

/** The identity columns, in reading order, with names rather than payload keys. */
const SOURCE_FIELDS: { key: string; label: string }[] = [
  { key: 'title', label: 'Project name' },
  { key: 'prefix', label: 'Lead number' },
  { key: 'projectNumber', label: 'Project number' },
  { key: 'companyName', label: 'Company' },
  { key: 'contactName', label: 'Contact' },
  { key: 'contactPhone', label: 'Phone' },
];

export function ReconciliationPanel({
  record,
  onSave,
  onClose,
  saving,
}: {
  record: MigrationRecord;
  onSave: (decision: RecordDecision) => void;
  onClose: () => void;
  saving?: boolean;
}) {
  const differences = record.differences ?? [];
  const candidates = record.candidates ?? [];
  const isExecuted = record.status === 'EXECUTED';

  const [fieldDecisions, setFieldDecisions] = useState<Record<string, { choice: FieldChoice; value?: string | null }>>(
    record.decision?.fieldDecisions ?? {},
  );
  const [entityDecisions, setEntityDecisions] = useState<
    Record<string, { choice: EntityChoice; entityId?: string | null }>
  >(record.decision?.entityDecisions ?? {});
  const [targetLeadId, setTargetLeadId] = useState<string | null>(
    record.decision?.targetLeadId ?? record.matchedLeadId,
  );

  const changed = useMemo(
    () =>
      differences.filter(
        (d) => d.writable && (d.status === 'DIFFERENT' || d.status === 'CONFLICT' || d.status === 'OLD_ONLY'),
      ),
    [differences],
  );
  const identical = differences.length - changed.length;

  const source = record.sourceData ?? {};
  const sourceValue = (key: string) => source[key]?.original ?? null;

  const buildDecision = (action: RecordDecision['action']): RecordDecision => ({
    action,
    targetLeadId,
    fieldDecisions,
    entityDecisions,
  });

  return (
    <Stack spacing={2} sx={{ p: { xs: 1.5, sm: 2 } }}>
      {/* Why it matched — never just a bare percentage. */}
      <GlassSurface variant="thin" sx={{ p: 1.5, borderRadius: '14px', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ToneChip
            tone={(CONFIDENCE[record.confidence ?? 'NO_MATCH'] ?? CONFIDENCE.NO_MATCH).tone}
            label={`${(CONFIDENCE[record.confidence ?? 'NO_MATCH'] ?? CONFIDENCE.NO_MATCH).label}${
              record.matchScore !== null ? ` · ${record.matchScore}%` : ''
            }`}
            size="small"
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Row {record.csvRowNumber} of your file
          </Typography>
        </Stack>

        {(record.matchReasons ?? []).length > 0 && (
          <>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Why:
            </Typography>
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 0, listStyle: 'none' }}>
              {(record.matchReasons ?? []).map((reason) => (
                <Stack key={reason} component="li" direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ color: 'success.main', display: 'flex' }}>
                    <KTIcon iconName="check" className="fs-7" />
                  </Box>
                  <Typography variant="caption">{reason}</Typography>
                </Stack>
              ))}
            </Box>
          </>
        )}
      </GlassSurface>

      {record.error && (
        <Alert severity={record.status === 'STALE' ? 'warning' : 'error'} variant="outlined">
          {record.error}
          {record.status === 'STALE' && ' Re-analyze this file to pick up the newer values.'}
        </Alert>
      )}

      {isExecuted && (
        <Alert severity="success" variant="outlined">
          Already migrated{record.executionResult?.appliedFields?.length
            ? `: ${record.executionResult.appliedFields.join(', ')}`
            : ' with no field changes'}
          .
        </Alert>
      )}

      {/* Candidate picker for ambiguous / unmatched rows. */}
      {(record.confidence === 'AMBIGUOUS' || record.confidence === 'NO_MATCH' || candidates.length > 1) && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {record.confidence === 'NO_MATCH'
              ? 'No existing lead matched'
              : 'Several leads could be this record — pick one'}
          </Typography>
          <Stack spacing={1}>
            {candidates.map((candidate) => (
              <MatchCandidateCard
                key={candidate.leadId}
                candidate={candidate}
                selected={targetLeadId === candidate.leadId}
                disabled={isExecuted}
                onSelect={() => setTargetLeadId(candidate.leadId)}
              />
            ))}
            {candidates.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Nothing in this organization resembles this row. You can create it as a new lead or skip it.
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      {/* Legacy row, shown whenever there is nothing to diff against. */}
      {differences.length === 0 && (
        <GlassSurface variant="thin" sx={{ p: 1.5, borderRadius: '14px', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
            What your file says
          </Typography>
          {/* Was `prefix: WT/OFFER/16-17/425` — the payload's key, not the column's name. */}
          <Stack spacing={0.5}>
            {SOURCE_FIELDS.map(({ key, label }) =>
              sourceValue(key) ? (
                <Stack key={key} direction="row" spacing={1} alignItems="baseline">
                  <Typography
                    sx={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                      color: 'text.secondary', width: 130, flex: 'none',
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.primary', wordBreak: 'break-word' }}>
                    {formatMaybeDate(sourceValue(key))}
                  </Typography>
                </Stack>
              ) : null,
            )}
          </Stack>
        </GlassSurface>
      )}

      {/* A row that matched several leads was compared to none of them — the matcher
          holds back rather than preselect one — so there is no field list to show yet.
          Say what approving does instead of showing an empty section. */}
      {differences.length === 0 && targetLeadId && !isExecuted && (
        <GlassSurface variant="thin" sx={{ p: 1.5, borderRadius: '14px', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 13, lineHeight: 1.6, color: 'text.secondary' }}>
            This row was never compared to a single lead, because more than one fitted. Approving it compares
            it to the lead you picked and takes your file's values for every field that differs. You can
            reopen the row afterwards to change any of them before the migration runs.
          </Typography>
        </GlassSurface>
      )}

      {differences.length > 0 && (
        <Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ mb: 0.75 }}
          >
            <Typography variant="subtitle2">Field comparison</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
              {changed.length} to decide · {identical} identical
            </Typography>
            {/* Answering six fields one at a time is the common case and was the only
                case. These set every row at once; individual rows still override. */}
            {changed.length > 1 && !isExecuted && (
              <Stack direction="row" spacing={0.75}>
                <WtButton
                  size="small"
                  ghost
                  onClick={() =>
                    setFieldDecisions(
                      Object.fromEntries(changed.map((d) => [d.field, { choice: 'USE_OLD' as const }])),
                    )
                  }
                >
                  Take all from my file
                </WtButton>
                <WtButton
                  size="small"
                  ghost
                  onClick={() =>
                    setFieldDecisions(
                      Object.fromEntries(changed.map((d) => [d.field, { choice: 'KEEP_CURRENT' as const }])),
                    )
                  }
                >
                  Keep all as they are
                </WtButton>
              </Stack>
            )}
          </Stack>
          <Divider />
          {differences.map((difference) => (
            <FieldDifferenceRow
              key={difference.field}
              difference={difference}
              disabled={isExecuted}
              choice={fieldDecisions[difference.field]?.choice}
              customValue={fieldDecisions[difference.field]?.value ?? undefined}
              entityChoice={entityDecisions[difference.field]}
              onChoice={(choice, value) =>
                setFieldDecisions((prev) => ({ ...prev, [difference.field]: { choice, value } }))
              }
              onEntityChoice={(choice, entityId) =>
                setEntityDecisions((prev) => ({ ...prev, [difference.field]: { choice, entityId } }))
              }
            />
          ))}
        </Box>
      )}

      {/* "Approve this row" greys out until a lead is chosen, which looks like a broken
          button unless something says why. */}
      {!targetLeadId && candidates.length > 0 && !isExecuted && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: { sm: 'right' } }}>
          Choose which lead this row belongs to above, then approve it.
        </Typography>
      )}

      {/* What Approve is about to do, counted from the choices actually made — the
          dialog asked for six decisions and then never said what they added up to. */}
      {targetLeadId && changed.length > 0 && !isExecuted && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: { sm: 'right' } }}>
          {(() => {
            const writes = changed.filter(
              (d) => (fieldDecisions[d.field]?.choice ?? d.recommended) !== 'KEEP_CURRENT',
            ).length;
            if (writes === 0) return 'Approving will leave this lead exactly as it is.';
            return `Approving will change ${writes} of ${changed.length} field${changed.length === 1 ? '' : 's'} on this lead.`;
          })()}
        </Typography>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
        <WtButton ghost onClick={onClose}>
          Close
        </WtButton>
        <WtButton
          flat
          tone="danger"
          disabled={isExecuted || saving}
          onClick={() => onSave(buildDecision('SKIP'))}
        >
          Skip this row
        </WtButton>
        {!record.matchedLeadId && (
          <WtButton
            flat
            disabled={isExecuted || saving}
            onClick={() => onSave(buildDecision('CREATE'))}
          >
            Create new lead
          </WtButton>
        )}
        <WtButton
          disabled={isExecuted || saving || !targetLeadId}
          onClick={() => onSave(buildDecision(targetLeadId === record.matchedLeadId ? 'UPDATE' : 'MATCH_TO'))}
        >
          {saving ? 'Saving…' : 'Approve this row'}
        </WtButton>
      </Stack>
    </Stack>
  );
}

export default ReconciliationPanel;

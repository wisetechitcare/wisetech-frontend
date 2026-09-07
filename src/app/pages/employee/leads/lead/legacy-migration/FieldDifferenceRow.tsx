import { useMemo, useState } from 'react';
import { Box, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { ToneChip, toneAlpha } from '@app/modules/common/components/ui';
import { tonePair } from '@app/theme/tokens';
import { formatMaybeDate } from '@utils/dateFormats';
import { diffWords } from '@/modules/audit/wordDiff';
import type { EntityChoice, FieldChoice, FieldDifference } from '@/types/legacyMigration';

/**
 * One field, and which of its two values should win.
 *
 * WHAT THIS REPLACES
 * ------------------
 * The two values printed side by side as text, and underneath them — indented past
 * both, into empty space — a row of small text toggles reading "Keep current / Use
 * old / Custom". The decision was the entire purpose of the screen and was its least
 * visible element, phrased in the third person about values sitting somewhere above.
 *
 * THE IDEA HERE
 * -------------
 * You pick a value by clicking the value. The two candidates are the controls, so
 * the choice is made where the evidence is, the selected side is obvious without
 * reading anything, and the row fills the width it was already occupying.
 */

const STATUS_LABEL: Record<FieldDifference['status'], { tone: 'success' | 'warning' | 'danger' | 'cyan' | 'neutral'; label: string }> = {
  SAME: { tone: 'success', label: 'Same' },
  DIFFERENT: { tone: 'warning', label: 'Different' },
  OLD_ONLY: { tone: 'cyan', label: 'New' },
  CURRENT_ONLY: { tone: 'neutral', label: 'Only here' },
  CONFLICT: { tone: 'danger', label: 'Conflict' },
  INVALID: { tone: 'danger', label: 'Unreadable' },
};

/** Inline word-level highlight, so a one-letter difference is actually visible. */
function HighlightedValue({ from, to, side }: { from: string | null; to: string | null; side: 'old' | 'current' }) {
  // Formatted BEFORE diffing: a date must compare as 2021.04.06, not as the stored
  // 2021-04-06T00:00:00.000Z — which also diffs as though the whole time had been cut.
  const fromText = from === null ? null : formatMaybeDate(from, '');
  const toText = to === null ? null : formatMaybeDate(to, '');
  const segments = useMemo(() => diffWords(fromText ?? '', toText ?? ''), [fromText, toText]);
  const text = side === 'old' ? fromText : toText;

  if (!text) {
    return (
      <Typography sx={{ fontSize: 13.5, color: 'text.disabled', fontStyle: 'italic' }}>empty</Typography>
    );
  }
  // Highlighting exists to make a SMALL difference visible inside a mostly-identical
  // string. When the two values share nothing — WT/OFFER/21-22/21 against
  // WT/OFFER/25-26/2, 30000 against 500000 — every word is a change, so the whole
  // column ends up painted amber and the colour tells you nothing at all.
  const sharesAnything = segments?.some((segment) => segment.type === 'same');
  if (!segments || !sharesAnything) {
    return <Typography sx={{ fontSize: 13.5, wordBreak: 'break-word' }}>{text}</Typography>;
  }

  const wanted = side === 'old' ? 'removed' : 'added';
  return (
    <Typography sx={{ fontSize: 13.5, wordBreak: 'break-word' }}>
      {segments
        .filter((segment) => segment.type === 'same' || segment.type === wanted)
        .map((segment, i) => (
          <Box
            key={`${segment.value}-${i}`}
            component="span"
            sx={
              segment.type === 'same'
                ? undefined
                : {
                    borderRadius: '3px',
                    px: 0.25,
                    fontWeight: 700,
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(210,153,34,0.28)'
                        : 'rgba(217,119,6,0.16)',
                  }
            }
          >
            {segment.value}
          </Box>
        ))}
    </Typography>
  );
}

/** A value you can choose, presented as the choice itself. */
function ValueCard({
  tag, selected, disabled, onSelect, children,
}: {
  tag: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const accent = tonePair('brand').fg;
  return (
    <Box
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      sx={{
        flex: 1, minWidth: 0, px: 1.25, py: 1, borderRadius: '10px',
        border: '1px solid',
        borderColor: selected ? accent : 'divider',
        // Transparent, the unselected side read as empty space rather than as the
        // other half of a choice.
        bgcolor: selected ? toneAlpha(accent, 0.07) : 'action.hover',
        boxShadow: selected ? `0 0 0 2px ${toneAlpha(accent, 0.3)}` : 'none',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'border-color .15s, box-shadow .15s, background-color .15s',
        '&:hover': disabled ? undefined : { borderColor: accent },
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.25 }}>
        <Typography
          sx={{
            fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
            color: selected ? accent : 'text.secondary',
          }}
        >
          {tag}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Box
          sx={{
            width: 16, height: 16, borderRadius: '50%', flex: 'none',
            display: 'grid', placeItems: 'center',
            border: '2px solid', borderColor: selected ? accent : 'divider',
            bgcolor: selected ? accent : 'transparent', color: '#fff',
          }}
        >
          {selected && <KTIcon iconName="check" className="fs-9" />}
        </Box>
      </Stack>
      {children}
    </Box>
  );
}

export interface FieldDifferenceRowProps {
  difference: FieldDifference;
  choice: FieldChoice | undefined;
  entityChoice: { choice: EntityChoice; entityId?: string | null } | undefined;
  customValue: string | undefined;
  onChoice: (choice: FieldChoice, value?: string) => void;
  onEntityChoice: (choice: EntityChoice, entityId?: string | null) => void;
  disabled?: boolean;
}

export function FieldDifferenceRow({
  difference,
  choice,
  entityChoice,
  customValue,
  onChoice,
  onEntityChoice,
  disabled = false,
}: FieldDifferenceRowProps) {
  const [showCustom, setShowCustom] = useState(choice === 'CUSTOM');
  const meta = STATUS_LABEL[difference.status];
  const isEntity = Boolean(difference.entity);
  const needsChoice =
    difference.writable &&
    (difference.status === 'DIFFERENT' || difference.status === 'CONFLICT' || difference.status === 'OLD_ONLY');

  const effective = choice ?? difference.recommended;
  const effectiveEntity = entityChoice?.choice ?? (difference.recommended === 'USE_OLD' ? 'USE_EXISTING' : 'KEEP_CURRENT');

  // Nothing to decide: one quiet line rather than a full comparison block. Seven
  // identical-looking rows are what made the old dialog a wall.
  if (!needsChoice) {
    const agrees = difference.status === 'SAME';
    return (
      <Box sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
        {/* Same header line as a decision row. Rendered as a bare line instead, it
            read as a different kind of thing entirely and broke the column rhythm
            halfway down the list. */}
        <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.75, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.secondary' }}>
            {difference.label}
          </Typography>
          <ToneChip tone={meta.tone} label={meta.label} dense size="small" />
          {!difference.writable && (
            <Tooltip title="This column is shown for context; migrations do not write it.">
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>read-only</Typography>
            </Tooltip>
          )}
        </Stack>

        <Box
          sx={{
            px: 1.25, py: 1, borderRadius: '10px',
            border: '1px dashed', borderColor: 'divider',
            bgcolor: 'action.hover', opacity: 0.85,
          }}
        >
          <Typography
            sx={{
              fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
              textTransform: 'uppercase', color: 'text.secondary', mb: 0.25,
            }}
          >
            {agrees ? 'Both agree — nothing to decide' : 'Only in the system'}
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: 'text.primary', wordBreak: 'break-word' }}>
            {formatMaybeDate(difference.currentValue ?? difference.oldValue, 'empty')}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
      <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.75, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{difference.label}</Typography>
        <ToneChip tone={meta.tone} label={meta.label} dense size="small" />
        {difference.similarity !== null && (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {difference.similarity}% similar
          </Typography>
        )}
        {!difference.writable && (
          <Tooltip title="This column is shown for context; migrations do not write it.">
            <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>read-only</Typography>
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        {!isEntity && (
          <Typography
            role="button"
            tabIndex={0}
            onClick={() => {
              if (disabled) return;
              const next = !showCustom;
              setShowCustom(next);
              if (next) onChoice('CUSTOM', customValue ?? difference.oldValue ?? '');
              else onChoice(difference.recommended);
            }}
            sx={{
              fontSize: 11.5, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
              color: showCustom ? tonePair('brand').fg : 'text.secondary',
              '&:hover': { textDecoration: disabled ? 'none' : 'underline' },
            }}
          >
            {showCustom ? 'Cancel typed value' : 'Type a different value'}
          </Typography>
        )}
      </Stack>

      {isEntity ? (
        <Stack spacing={0.75}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <ValueCard
              tag="From your file"
              selected={effectiveEntity === 'USE_EXISTING' || effectiveEntity === 'CREATE_NEW'}
              disabled={disabled}
              onSelect={() =>
                onEntityChoice(
                  difference.entity?.matchedId ? 'USE_EXISTING' : 'CREATE_NEW',
                  difference.entity?.matchedId ?? null,
                )
              }
            >
              <HighlightedValue from={difference.oldValue} to={difference.currentValue} side="old" />
              {difference.entity?.matchedName && (
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                  {effectiveEntity === 'CREATE_NEW'
                    ? `A new ${difference.entity.kind} will be created`
                    : `links to existing “${difference.entity.matchedName}”`}
                  {difference.entity.similarity !== null && ` (${difference.entity.similarity}% similar)`}
                </Typography>
              )}
            </ValueCard>
            <ValueCard
              tag="In the system now"
              selected={effectiveEntity === 'KEEP_CURRENT'}
              disabled={disabled}
              onSelect={() => onEntityChoice('KEEP_CURRENT', null)}
            >
              <HighlightedValue from={difference.oldValue} to={difference.currentValue} side="current" />
            </ValueCard>
          </Stack>
          {difference.entity?.matchedId && difference.entity.kind !== 'employee' && (
            <Typography
              role="button"
              tabIndex={0}
              onClick={() => !disabled && onEntityChoice('CREATE_NEW', null)}
              sx={{
                fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                color: effectiveEntity === 'CREATE_NEW' ? tonePair('warning').fg : 'text.secondary',
              }}
            >
              Create “{difference.oldValue}” as a new {difference.entity.kind} instead
            </Typography>
          )}
        </Stack>
      ) : showCustom ? (
        <TextField
          size="small"
          fullWidth
          autoFocus
          value={customValue ?? ''}
          disabled={disabled}
          label="Value to save"
          placeholder="Enter the value to save"
          onChange={(event) => onChoice('CUSTOM', event.target.value)}
        />
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <ValueCard
            tag="From your file"
            selected={effective === 'USE_OLD'}
            disabled={disabled}
            onSelect={() => onChoice('USE_OLD')}
          >
            <HighlightedValue from={difference.oldValue} to={difference.currentValue} side="old" />
          </ValueCard>
          <ValueCard
            tag="In the system now"
            selected={effective === 'KEEP_CURRENT'}
            disabled={disabled}
            onSelect={() => onChoice('KEEP_CURRENT')}
          >
            <HighlightedValue from={difference.oldValue} to={difference.currentValue} side="current" />
          </ValueCard>
        </Stack>
      )}

      {difference.note && (
        <Typography sx={{ fontSize: 11.5, color: 'warning.main', mt: 0.5 }}>{difference.note}</Typography>
      )}
    </Box>
  );
}

export default FieldDifferenceRow;

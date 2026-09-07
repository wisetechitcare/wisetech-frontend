import { Box, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassCard, ToneChip, toneAlpha } from '@app/modules/common/components/ui';
import { tonePair } from '@app/theme/tokens';
import type { MatchCandidate } from '@/types/legacyMigration';

/**
 * One possible existing lead, with its score and the reasons behind it.
 * Used when a row is AMBIGUOUS or the admin wants to override the match.
 *
 * The whole card is the control. It used to be a wide block of left-aligned text with
 * a "Select" button pinned to the far right, so a dialog of two candidates was mostly
 * empty middle, and the one thing you had to do was the smallest target on screen.
 */
export function MatchCandidateCard({
  candidate,
  selected,
  onSelect,
  disabled,
}: {
  candidate: MatchCandidate;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const accent = tonePair('brand').fg;
  const { lead } = candidate;
  // Identifiers on one line: two stacked "Project: … / Lead: …" captions spent three
  // rows saying what fits in one.
  const identifiers = [
    lead.projectNumber ? `Project ${lead.projectNumber}` : null,
    lead.prefix ? `Lead ${lead.prefix}` : null,
    lead.companyName,
    lead.contactName,
  ].filter(Boolean) as string[];

  return (
    <GlassCard
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      sx={{
        p: 1.5,
        cursor: disabled ? 'default' : 'pointer',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: selected ? accent : 'divider',
        bgcolor: selected ? toneAlpha(accent, 0.06) : undefined,
        boxShadow: selected ? `0 0 0 2px ${toneAlpha(accent, 0.3)}` : undefined,
        transition: 'border-color .15s, box-shadow .15s, background-color .15s',
        '&:hover': disabled ? undefined : { borderColor: accent },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 20, height: 20, borderRadius: '50%', flex: 'none', mt: 0.25,
            display: 'grid', placeItems: 'center',
            border: '2px solid', borderColor: selected ? accent : 'divider',
            bgcolor: selected ? accent : 'transparent', color: '#fff',
          }}
        >
          {selected && <KTIcon iconName="check" className="fs-8" />}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 700, minWidth: 0 }}>
              {lead.title || 'Untitled lead'}
            </Typography>
            <ToneChip
              tone={candidate.score >= 80 ? 'success' : candidate.score >= 60 ? 'warning' : 'neutral'}
              label={`${candidate.score}% match`}
              dense
              size="small"
            />
          </Stack>

          {identifiers.length > 0 && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {identifiers.join('  ·  ')}
            </Typography>
          )}

          {candidate.reasons.length > 0 && (
            <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
              {candidate.reasons.map((reason) => (
                <ToneChip key={reason} tone="cyan" label={reason} dense size="small" />
              ))}
            </Stack>
          )}
        </Box>

        {selected && (
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: accent, flex: 'none', mt: 0.4 }}>
            SELECTED
          </Typography>
        )}
      </Stack>
    </GlassCard>
  );
}

export default MatchCandidateCard;

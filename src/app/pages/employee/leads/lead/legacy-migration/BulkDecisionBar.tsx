import { useState } from 'react';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { GlassSurface, WtButton } from '@app/modules/common/components/ui';
import type { BulkRule } from '@/types/legacyMigration';

/**
 * Bulk decisions for admins who are not going to click through 1,200 rows.
 *
 * Rules are applied server-side against the staged differences — this component only
 * chooses which rule to send. Note that a bulk rule never creates an entity and never
 * resolves an ambiguous match; those still need a per-row decision.
 *
 * The per-field half of this bar ("rule for one field" + choice + Apply to field) was
 * removed: it asked for a column and a choice in the abstract, away from any row it
 * would affect, and each row now carries its own Apply and Skip. The endpoint still
 * accepts `fieldRules` if a use for it turns up.
 */

const RULES: { value: BulkRule; label: string; help: string }[] = [
  { value: 'KEEP_ALL_CURRENT', label: 'Keep all current values', help: 'Nothing in the database changes.' },
  { value: 'USE_ALL_OLD', label: 'Use all old values', help: 'Legacy values overwrite, except unreadable ones.' },
  {
    value: 'USE_OLD_WHERE_CURRENT_EMPTY',
    label: 'Use old only where current is empty',
    help: 'Fills gaps without touching populated fields.',
  },
];

export function BulkDecisionBar({
  filter,
  onApply,
  applying,
  affectedLabel,
}: {
  filter: string;
  onApply: (input: { rule?: BulkRule; filter: string }) => void;
  applying?: boolean;
  affectedLabel: string;
}) {
  const [rule, setRule] = useState<BulkRule | ''>('');

  return (
    // One row: control on the left, what it will do filling the space to its right.
    // Stacked, the bar stood ~100px tall for a single dropdown and left two thirds of
    // its own width empty — the caption above the field only repeated the field's label.
    <GlassSurface variant="thin" sx={{ px: 1.75, py: 1.25, borderRadius: '14px', borderColor: 'divider' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.25}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <TextField
          select
          size="small"
          label="Apply to every difference"
          value={rule}
          onChange={(event) => setRule(event.target.value as BulkRule)}
          sx={{ minWidth: { xs: '100%', md: 280 }, flex: 'none' }}
        >
          {RULES.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <WtButton
          size="small"
          flat
          disabled={!rule || applying}
          onClick={() => rule && onApply({ rule, filter })}
          sx={{ flex: 'none', minWidth: 108, minHeight: 40, height: 40 }}
        >
          {applying ? 'Applying…' : 'Apply'}
        </WtButton>

        <Typography sx={{ fontSize: 12, lineHeight: 1.5, color: 'text.secondary', flex: 1, minWidth: 0 }}>
          Applies to {affectedLabel}. Ambiguous and unmatched rows still need an individual decision, and no
          new status, category or company is ever created by a bulk rule.
        </Typography>
      </Stack>
    </GlassSurface>
  );
}

export default BulkDecisionBar;

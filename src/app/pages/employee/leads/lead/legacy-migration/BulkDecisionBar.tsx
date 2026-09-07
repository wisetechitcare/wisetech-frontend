import { useState } from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
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

// Worded from the two sides the cards already name: "in the system" and "your file".
const RULES: { value: BulkRule; label: string; help: string }[] = [
  {
    value: 'KEEP_ALL_CURRENT',
    label: 'Keep what is in the system',
    help: 'Nothing in the system changes — your file is only marked as reviewed.',
  },
  {
    value: 'USE_ALL_OLD',
    label: 'Use what is in my file',
    help: 'Your file replaces what is in the system, except anything that could not be read.',
  },
  {
    value: 'USE_OLD_WHERE_CURRENT_EMPTY',
    label: 'Use my file only where the system is blank',
    help: 'Fills in the blanks only — anything already filled in is left as it is.',
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

  const selected = RULES.find((option) => option.value === rule);

  return (
    // Controls on their own line, the explanation on the next one at full width.
    // Beside the controls it had whatever space was left over and was cut off mid-word
    // on a normal laptop — a warning about overwriting data that nobody could finish reading.
    <GlassSurface variant="thin" sx={{ px: 1.75, py: 1.25, borderRadius: '14px', borderColor: 'divider' }}>
      <Stack spacing={1}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <TextField
            select
            size="small"
            label="Do the same for every change"
            value={rule}
            onChange={(event) => setRule(event.target.value as BulkRule)}
            sx={{ minWidth: { xs: '100%', sm: 300 }, flex: 'none' }}
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
        </Stack>

        <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, color: 'text.secondary' }}>
          {/* The per-rule help existed in this file from the start and was never rendered —
              the one sentence that says what the chosen rule actually does to your data. */}
          {selected && (
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {selected.help}{' '}
            </Box>
          )}
          This changes {affectedLabel} that is still waiting on you. Rows you have already imported, skipped,
          or that could not be read are left untouched. Rows that match more than one lead keep waiting for
          you to pick the right one. It never creates a new status, category or company.
        </Typography>
      </Stack>
    </GlassSurface>
  );
}

export default BulkDecisionBar;

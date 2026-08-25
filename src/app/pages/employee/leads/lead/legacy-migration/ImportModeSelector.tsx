import { useState } from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
  GlassCard,
  GlassDialog,
  GlassHeader,
  IconBox,
  TRIO,
  WtButton,
  toneAlpha,
} from '@app/modules/common/components/ui';
import { useOrgScope } from '@hooks/useOrgScope';

/**
 * Asks which kind of import this is, before either flow opens.
 *
 * Legacy migration also needs its organization settled up front: every candidate
 * query and every write is scoped to it, so it cannot be inferred later.
 */
export type ImportMode = 'standard' | 'legacy';

const MODES = [
  {
    mode: 'standard' as const,
    title: 'Standard import',
    description: 'Add or update leads from a CSV. Rows are matched on lead number or title.',
    // What it does to your data, which is the thing being chosen between.
    effect: 'Writes straight away',
    icon: 'file-up',
    trio: TRIO.blue,
  },
  {
    mode: 'legacy' as const,
    title: 'Legacy data migration',
    description:
      'Reconcile data from the previous system. Matches records intelligently, shows every difference and asks before changing anything.',
    effect: 'Nothing is written until you confirm',
    icon: 'data',
    trio: TRIO.purple,
  },
];

export function ImportModeSelector({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (mode: ImportMode, organizationId: string) => void;
}) {
  const [mode, setMode] = useState<ImportMode | null>(null);
  const { organizations, isLoading } = useOrgScope({ includeAll: false, initialScopeId: '' });
  const [organizationId, setOrganizationId] = useState('');

  const orgs = organizations ?? [];
  // One organization is not a choice. Asking anyway is a required field with a single
  // valid answer, between the user and the thing they came here to do.
  const effectiveOrgId = organizationId || (orgs.length === 1 ? String(orgs[0].id) : '');
  const canContinue = mode === 'standard' || (mode === 'legacy' && Boolean(effectiveOrgId));

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      header={
        <GlassHeader
          title="Bulk lead import"
          subtitle="Choose how this file should be handled"
          icon={<KTIcon iconName="cloud-add" className="fs-1" />}
          onClose={onClose}
        />
      }
    >
      <Stack spacing={1.5} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {MODES.map((option) => {
          const selected = mode === option.mode;
          return (
            <GlassCard
              key={option.mode}
              interactive
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => setMode(option.mode)}
              onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setMode(option.mode);
                }
              }}
              sx={{
                p: 1.75,
                cursor: 'pointer',
                borderStyle: 'solid',
                // A 1px→2px border was the only sign of a selection, which on a
                // dialog of two cards is no sign at all.
                borderWidth: 1,
                borderColor: selected ? option.trio.c : 'divider',
                bgcolor: selected ? toneAlpha(option.trio.c, 0.06) : undefined,
                boxShadow: selected ? `0 0 0 2px ${toneAlpha(option.trio.c, 0.35)}` : undefined,
                transition: 'border-color .15s, box-shadow .15s, background-color .15s',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <IconBox icon={option.icon} trio={option.trio} size={40} fs="fs-2" />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {option.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {option.description}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.75, fontSize: 11.5, fontWeight: 700, letterSpacing: '.03em',
                      color: option.trio.c,
                    }}
                  >
                    {option.effect}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 20, height: 20, borderRadius: '50%', flex: 'none', mt: 0.25,
                    display: 'grid', placeItems: 'center',
                    border: '2px solid',
                    borderColor: selected ? option.trio.c : 'divider',
                    bgcolor: selected ? option.trio.c : 'transparent',
                    color: '#fff',
                  }}
                >
                  {selected && <KTIcon iconName="check" className="fs-8" />}
                </Box>
              </Stack>
            </GlassCard>
          );
        })}

        {mode === 'legacy' && orgs.length > 1 && (
          <TextField
            select
            size="small"
            fullWidth
            label="Organization this legacy data belongs to"
            value={effectiveOrgId}
            disabled={isLoading}
            onChange={(event) => setOrganizationId(event.target.value)}
            helperText="Matching and every change stay inside this organization."
          >
            {orgs.map((organization: { id: string; name: string }) => (
              <MenuItem key={organization.id} value={organization.id}>
                {organization.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
          {!mode && (
            <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
              Pick one to continue.
            </Typography>
          )}
          <WtButton ghost onClick={onClose}>
            Cancel
          </WtButton>
          <WtButton disabled={!canContinue} onClick={() => mode && onSelect(mode, effectiveOrgId)}>
            Continue
          </WtButton>
        </Stack>
      </Stack>
    </GlassDialog>
  );
}

export default ImportModeSelector;

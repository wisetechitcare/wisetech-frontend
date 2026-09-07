import { useState } from 'react';
import { MenuItem, TextField, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { IconBox, OptionPickerDialog, TRIO } from '@app/modules/common/components/ui';
import { useOrgScope } from '@hooks/useOrgScope';

/**
 * Asks which kind of import this is, before either flow opens.
 *
 * Built on the kit's `OptionPickerDialog` in grid layout — the same component and the
 * same card design as "Create New Lead". This screen previously hand-rolled its own
 * option list, which is the thing the UI standard names outright; two dialogs a click
 * apart in the same feature should not be two different designs.
 *
 * Legacy migration also needs its organization settled up front: every candidate query
 * and every write is scoped to it, so it cannot be inferred later.
 */
export type ImportMode = 'standard' | 'legacy';

const MODES = [
  {
    mode: 'standard' as const,
    title: 'Import now',
    // What it does to your data — the thing actually being chosen between.
    caption: 'Writes straight away',
    description: 'Add or update leads from a CSV. Rows are matched on lead number or title.',
    icon: 'file-up',
    trio: TRIO.blue,
  },
  {
    mode: 'legacy' as const,
    // "Legacy data migration" named where the file came from, which is the one thing
    // the person choosing already knows. What they are actually picking between is
    // whether the file is written immediately or compared first.
    title: 'Compare first',
    caption: 'Nothing changes until you approve',
    description:
      'Check the file against your existing leads, see every difference side by side, and pick what to keep. Useful for data from an old system.',
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
  // subOrgsOnly: leads live under a sub-organization. The root ("WISETECH GROUP") was
  // offered and would scope a migration to an organization that owns no leads.
  const { organizations, isLoading } = useOrgScope({
    includeAll: false,
    initialScopeId: '',
    subOrgsOnly: true,
  });
  const [organizationId, setOrganizationId] = useState('');

  const orgs = organizations ?? [];
  // One organization is not a choice. Asking anyway is a required field with a single
  // valid answer, standing between the user and what they came here to do.
  const effectiveOrgId = organizationId || (orgs.length === 1 ? String(orgs[0].id) : '');
  const canContinue = mode === 'standard' || (mode === 'legacy' && Boolean(effectiveOrgId));
  const selected = MODES.find((option) => option.mode === mode);

  return (
    <OptionPickerDialog
      open={open}
      onClose={onClose}
      title="Bulk Lead Import"
      subtitle="Choose how this file should be handled"
      icon={<KTIcon iconName="cloud-add" className="fs-1 text-white" />}
      options={MODES.map((option) => ({
        id: option.mode,
        name: option.title,
        caption: option.caption,
        color: option.trio.c,
        leading: <IconBox icon={option.icon} trio={option.trio} size={56} fs="fs-1" />,
      }))}
      selectedId={mode}
      onSelect={(id) => setMode(id as ImportMode)}
      onConfirm={() => mode && onSelect(mode, effectiveOrgId)}
      confirmLabel="Continue"
      confirmDisabled={!canContinue}
      maxWidth="sm"
      layout="grid"
      gridMin={210}
    >
      {/* The full description belongs to whichever card is chosen, so the cards stay
          the same size and the reading is about the decision just made. */}
      {selected && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {selected.description}
        </Typography>
      )}

      {mode === 'legacy' && orgs.length > 1 && (
        <TextField
          select
          size="small"
          fullWidth
          label="Which organization do these leads belong to?"
          value={effectiveOrgId}
          disabled={isLoading}
          onChange={(event) => setOrganizationId(event.target.value)}
          helperText="Comparison and every change stay inside this organization."
          sx={{ mt: 1.5 }}
        >
          {orgs.map((organization: { id: string; name: string }) => (
            <MenuItem key={organization.id} value={organization.id}>
              {organization.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {!mode && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          Pick one to continue.
        </Typography>
      )}
    </OptionPickerDialog>
  );
}

export default ImportModeSelector;

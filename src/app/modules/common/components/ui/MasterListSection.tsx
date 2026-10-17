import {
  useState,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, CircularProgress, DialogContent, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
// Deep import — avoid ui ↔ configuration barrel cycle (ConfigSectionCard pulls ui/text only).
import ConfigSectionCard from '@app/modules/configuration/ConfigSectionCard';
import { GlassDialog, GlassHeader } from './glass';
import { GlassDialogActions } from './GlassDialogActions';
import { WtField } from './WtField';
import { WtSwitchField } from './switch';
import { WtColorPicker, KIT_HEX_SWATCHES } from './WtColorPicker';
import { WtEmptyState } from './WtEmptyState';
import { ConfigColorChip, ConfigChipGrid } from './ConfigColorChip';
import { toast, confirmDialog } from './feedback';
import { TRIO, type Trio } from './patterns';
import type { SemanticTone } from './tokens';
import { apiErrorMessage } from '@utils/apiError';
import { VersionHistory } from '@modules/audit/VersionHistory';
import type { AuditEntityType } from '@modules/audit/audit.service';

/** Minimum shape every master row must carry. Extra fields ride along as unknowns. */
export type MasterListRow = { id: string; color?: string | null; sortOrder?: number };

const field = (row: MasterListRow, key: string): unknown =>
  (row as Record<string, unknown>)[key];

export interface MasterListFlagDef {
  key: string;
  label: string;
  tone?: SemanticTone;
}

/** Opaque bag for consumer-owned dialog fields (stage email, thresholds, …). */
export interface MasterListExtraFieldsApi {
  disabled: boolean;
  extra: Record<string, string>;
  setExtra: Dispatch<SetStateAction<Record<string, string>>>;
}

type SectionIconColor = NonNullable<
  ComponentProps<typeof ConfigSectionCard>['iconColor']
>;

export interface MasterListSectionProps {
  title: string;
  description: string;
  /**
   * Bootstrap icon for the shared Configure section card (e.g. `bi-diagram-3`).
   * Same family as Billing / Gift Configure.
   */
  biIcon: string;
  /** Keenicon name for the edit dialog header. */
  icon: string;
  tone: Trio;
  /** ConfigSectionCard icon tile colour. Inferred from `tone` when omitted. */
  iconColor?: SectionIconColor;
  queryKey: readonly unknown[];
  /** Field on the row that holds the display name (`name` or `reason`, etc.). */
  labelField: string;
  fetchFn: () => Promise<MasterListRow[]>;
  createFn: (payload: Record<string, unknown>) => Promise<unknown>;
  updateFn: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  deleteFn: (id: string) => Promise<unknown>;
  /**
   * Persist a new order. Optional — chip grids match Billing/Gift (no drag).
   * When set, chips still paint in server order; call sites may expose reorder later.
   */
  onReorder?: (orderedIds: string[]) => Promise<unknown>;
  flags?: MasterListFlagDef[];
  /** Domain-specific dialog fields (kept out of the kit core). */
  renderExtraFields?: (api: MasterListExtraFieldsApi) => ReactNode;
  /** Merge extra bag into create/update payload. */
  extraToPayload?: (extra: Record<string, string>) => Record<string, unknown>;
  /** Seed the extra bag when opening an edit. */
  extraFromRow?: (row: MasterListRow) => Record<string, string>;
  /** Confirm-dialog copy for delete. Default: deactivated. */
  removeConfirmText?: string;
  /** Primary CTA label. Default: `New`. */
  newLabel?: string;
  /**
   * When set, the edit dialog shows per-record Version History for this Change
   * Intelligence entity type (e.g. APPLICATION_STATUS). Create dialogs omit it.
   */
  auditEntityType?: AuditEntityType;
}

const DEFAULT_COLOR = '#4B5563';

const toneToIconColor = (tone: Trio): SectionIconColor => {
  if (tone === TRIO.blue) return 'blue';
  if (tone === TRIO.green) return 'green';
  if (tone === TRIO.purple) return 'purple';
  if (tone === TRIO.amber) return 'amber';
  if (tone === TRIO.rose) return 'danger';
  if (tone === TRIO.cyan) return 'teal';
  return 'primary';
};

/**
 * MasterListSection — shared Configure masters: ConfigSectionCard + ConfigColorChip grid
 * (same detailed tile language as Billing / Gift Configure) + create/edit/delete dialog.
 *
 * Domain-only dialog fields go through `renderExtraFields` / `extraToPayload`.
 */
export function MasterListSection({
  title,
  description,
  biIcon,
  icon,
  tone,
  iconColor,
  queryKey,
  labelField,
  fetchFn,
  createFn,
  updateFn,
  deleteFn,
  flags = [],
  renderExtraFields,
  extraToPayload,
  extraFromRow,
  removeConfirmText = 'It will be deactivated.',
  newLabel,
  auditEntityType,
}: MasterListSectionProps) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: fetchFn,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MasterListRow | null>(null);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [flagVals, setFlagVals] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState<Record<string, string>>({});

  const invalidate = () => qc.invalidateQueries({ queryKey });
  const singular = title.replace(/s$/, '');
  const cta = newLabel ?? 'New';

  const buildPayload = (): Record<string, unknown> => ({
    [labelField]: label.trim(),
    color,
    ...flagVals,
    ...(extraToPayload ? extraToPayload(extra) : {}),
  });

  const createMut = useMutation({
    mutationFn: () => createFn(buildPayload()),
    onSuccess: () => {
      toast({ icon: 'success', title: `${singular} added` });
      close();
      invalidate();
    },
    onError: (err) =>
      toast({ icon: 'error', title: apiErrorMessage(err, `Could not add the ${singular.toLowerCase()}`) }),
  });
  const updateMut = useMutation({
    mutationFn: () => updateFn(editing!.id, buildPayload()),
    onSuccess: () => {
      toast({ icon: 'success', title: `${singular} updated` });
      close();
      invalidate();
    },
    onError: (err) =>
      toast({ icon: 'error', title: apiErrorMessage(err, `Could not update the ${singular.toLowerCase()}`) }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn(id),
    onSuccess: () => {
      toast({ icon: 'success', title: `${singular} removed` });
      invalidate();
    },
    onError: (err) =>
      toast({ icon: 'error', title: apiErrorMessage(err, `Could not remove the ${singular.toLowerCase()}`) }),
  });

  const openNew = () => {
    setEditing(null);
    setLabel('');
    setColor(DEFAULT_COLOR);
    setFlagVals({});
    setExtra({});
    setOpen(true);
  };
  const openEdit = (row: MasterListRow) => {
    setEditing(row);
    setLabel(String(field(row, labelField) ?? ''));
    setColor(row.color ?? DEFAULT_COLOR);
    setFlagVals(flags.reduce((acc, f) => ({ ...acc, [f.key]: Boolean(field(row, f.key)) }), {}));
    setExtra(extraFromRow ? extraFromRow(row) : {});
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  const remove = async (row: MasterListRow) => {
    const name = String(field(row, labelField) ?? '');
    if (
      await confirmDialog({
        icon: 'warning',
        title: `Remove "${name}"?`,
        text: removeConfirmText,
      })
    ) {
      deleteMut.mutate(row.id);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  const labelCaption = labelField === 'reason' ? 'Reason' : 'Name';
  const showCount = !isLoading && !isError && rows.length > 0;
  const cardIconColor = iconColor ?? toneToIconColor(tone);

  return (
    <>
      <ConfigSectionCard
        title={title}
        description={description}
        icon={biIcon}
        iconColor={cardIconColor}
        badge={showCount ? { label: String(rows.length) } : undefined}
        loading={isLoading}
        primaryAction={{
          label: cta,
          icon: 'bi-plus-lg',
          onClick: openNew,
          variant: 'primary',
        }}
      >
        {isError ? (
          <WtEmptyState
            variant="error"
            dense
            title={`Could not load ${title.toLowerCase()}`}
            hint={apiErrorMessage(error, 'Check your connection and try again.')}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : rows.length === 0 && !isLoading ? (
          <WtEmptyState
            dense
            icon={icon}
            tone={tone}
            title={`No ${singular} Yet`}
            hint={description}
            actionLabel={`${cta} ${singular}`}
            onAction={openNew}
          />
        ) : (
          <ConfigChipGrid>
            {rows.map((row) => {
              const activeFlags = flags.filter((f) => field(row, f.key));
              const badge = activeFlags[0]?.label;
              const caption =
                activeFlags.length > 1
                  ? activeFlags.slice(1).map((f) => f.label).join(' · ')
                  : undefined;
              const busy = deleteMut.isPending && deleteMut.variables === row.id;
              const name = String(field(row, labelField) ?? '');
              return (
                <ConfigColorChip
                  key={row.id}
                  name={name}
                  color={row.color ?? undefined}
                  badge={badge}
                  caption={caption}
                  captionStrong={Boolean(caption)}
                  disabled={busy}
                  onEdit={() => openEdit(row)}
                  action={{
                    icon: 'bi-trash',
                    title: `Delete ${name}`,
                    danger: true,
                    onClick: () => void remove(row),
                  }}
                />
              );
            })}
          </ConfigChipGrid>
        )}
        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 2 }}>
            <CircularProgress size={22} />
          </Stack>
        ) : null}
      </ConfigSectionCard>

      <GlassDialog
        open={open}
        onClose={saving ? undefined : close}
        maxWidth="xs"
        header={
          <GlassHeader
            title={editing ? `Edit ${singular}` : `New ${singular}`}
            icon={<KTIcon iconName={icon} className="fs-2" />}
            onClose={saving ? undefined : close}
          />
        }
      >
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <WtField
              label={labelCaption}
              required
              fullWidth
              value={label}
              onChange={setLabel}
              disabled={saving}
            />
            <WtColorPicker
              label="Colour"
              palette={KIT_HEX_SWATCHES}
              value={color}
              onChange={setColor}
              disabled={saving}
            />
            {flags.map((f) => (
              <WtSwitchField
                key={f.key}
                title={f.label}
                checked={!!flagVals[f.key]}
                onChange={(e) => setFlagVals((v) => ({ ...v, [f.key]: e.target.checked }))}
              />
            ))}
            {renderExtraFields?.({ disabled: saving, extra, setExtra })}
            {editing && auditEntityType ? (
              <Stack spacing={1} sx={{ pt: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                  Version History
                </Typography>
                <VersionHistory type={auditEntityType} id={editing.id} isAdmin={false} />
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
        <GlassDialogActions
          onCancel={close}
          cancelDisabled={saving}
          onSubmit={() => (editing ? updateMut.mutate() : createMut.mutate())}
          submitLabel="Save"
          submitting={saving}
          submitDisabled={!label.trim() || saving}
        />
      </GlassDialog>
    </>
  );
}

export default MasterListSection;

import type { ReactNode } from 'react';
import { Box, ButtonBase, CircularProgress, Stack, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, type GlassDialogProps } from './glass';
import { AutoGrid } from './patterns';
import { WtButton } from './buttons';

/**
 * OptionPickerDialog — the app-wide, theme-aware single-select picker modal.
 *
 * A GlassDialog wrapping a list of accent-dotted rows (dot + label + check) plus a Cancel/Confirm
 * footer, built entirely on the MUI+TW glass kit so it reads correctly in light AND dark with no
 * per-use styling. Use this instead of hand-rolling a react-bootstrap `<Modal>` with inline colors
 * whenever the user picks one option from a small set (status, category, type, priority, …).
 *
 *   <OptionPickerDialog
 *     open={open} onClose={close}
 *     title="Project Status" subtitle="Choose how this project is progressing"
 *     icon={<KTIcon iconName="flag" className="fs-1 text-white" />}
 *     options={statuses}                 // [{ id, name, color? }]
 *     selectedId={selectedId} onSelect={setSelectedId}
 *     onConfirm={save} confirmDisabled={!dirty} loading={saving}
 *   >
 *     {showEndDate && <EndDateSection/>}  // optional extra content under the list
 *   </OptionPickerDialog>
 */

export interface PickerOption {
  id: string;
  name: string;
  /** Accent hex — drives the leading dot and the selected row's tint/border. Default slate. */
  color?: string;
  disabled?: boolean;
  /** Muted second line (prefix, count, why it's disabled). */
  caption?: string;
  /** Replaces the accent dot — e.g. a logo avatar or an icon tile. */
  leading?: ReactNode;
}

/** A single selectable option row — exported for bespoke lists that don't need the full dialog. */
export function OptionRow({
  label, caption, leading, color = '#64748b', selected, onClick, disabled,
}: {
  label: string; caption?: string; leading?: ReactNode; color?: string;
  selected: boolean; onClick: () => void; disabled?: boolean;
}) {
  const dark = useTheme().palette.mode === 'dark';
  return (
    <ButtonBase
      disabled={disabled}
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25, width: '100%', justifyContent: 'flex-start',
        borderRadius: 2.5, px: 1.5, py: 1.25, textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
        border: `1px solid ${selected ? alpha(color, dark ? 0.6 : 0.45) : 'divider'}`,
        borderColor: selected ? alpha(color, dark ? 0.6 : 0.45) : 'divider',
        bgcolor: selected ? alpha(color, dark ? 0.22 : 0.1) : (dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
        transition: 'background-color .12s, border-color .12s',
        '&:hover': {
          bgcolor: selected ? alpha(color, dark ? 0.28 : 0.14) : (dark ? 'rgba(255,255,255,0.06)' : '#eef2f7'),
          borderColor: alpha(color, selected ? 0.7 : 0.4),
        },
      }}
    >
      {leading ?? (
        <Box sx={{
          width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0,
          boxShadow: selected ? `0 0 0 3px ${alpha(color, 0.25)}` : 'none',
        }} />
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: selected ? 700 : 500, color: 'text.primary' }}>{label}</Typography>
        {caption && (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.15 }}>{caption}</Typography>
        )}
      </Box>
      {selected && (
        <Box sx={{
          ml: 'auto', width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          display: 'grid', placeItems: 'center', bgcolor: color, color: '#fff',
        }}>
          <KTIcon iconName="check" className="fs-7" />
        </Box>
      )}
    </ButtonBase>
  );
}

/**
 * Card form of an option — logo/icon on top, name, muted caption, check badge when picked.
 * Used by `OptionPickerDialog layout="grid"`; exported for bespoke card grids.
 */
export function OptionCard({
  label, caption, leading, color = '#64748b', selected, onClick, disabled,
}: {
  label: string; caption?: string; leading?: ReactNode; color?: string;
  selected: boolean; onClick: () => void; disabled?: boolean;
}) {
  const dark = useTheme().palette.mode === 'dark';
  return (
    <ButtonBase
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        position: 'relative', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        gap: 1.5, width: '100%', height: '100%', px: 2, py: 2.5, borderRadius: 3, textAlign: 'center',
        opacity: disabled ? 0.55 : 1,
        border: `1px solid ${selected ? alpha(color, dark ? 0.6 : 0.45) : (dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0')}`,
        bgcolor: selected ? alpha(color, dark ? 0.22 : 0.1) : (dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
        transition: 'background-color .12s, border-color .12s, transform .12s, box-shadow .12s',
        '&:hover': {
          bgcolor: selected ? alpha(color, dark ? 0.28 : 0.14) : (dark ? 'rgba(255,255,255,0.06)' : '#eef2f7'),
          borderColor: alpha(color, selected ? 0.7 : 0.4),
          transform: disabled ? 'none' : 'translateY(-2px)',
        },
      }}
    >
      {leading ?? (
        <Box sx={{
          width: 64, height: 64, borderRadius: 2.5, flexShrink: 0,
          bgcolor: alpha(color, dark ? 0.3 : 0.14), border: `1px solid ${alpha(color, 0.35)}`,
        }} />
      )}
      <Box sx={{ width: '100%', minWidth: 0 }}>
        <Typography sx={{
          fontSize: 14, fontWeight: selected ? 700 : 600, color: 'text.primary', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {label}
        </Typography>
        {caption && (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5, lineHeight: 1.3 }}>{caption}</Typography>
        )}
      </Box>
      {selected && (
        <Box sx={{
          position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%',
          display: 'grid', placeItems: 'center', bgcolor: color, color: '#fff',
        }}>
          <KTIcon iconName="check" className="fs-7" />
        </Box>
      )}
    </ButtonBase>
  );
}

export interface OptionPickerDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Header glyph, e.g. `<KTIcon iconName="flag" className="fs-1 text-white" />`. */
  icon?: ReactNode;
  options: PickerOption[];
  selectedId: string | null;
  /** Fired when a row is clicked (update your selection state here). */
  onSelect: (id: string) => void;
  /** Fired when Confirm is pressed. Omit to hide the Confirm button (selection-only mode). */
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shows a spinner + disables Confirm while an async save runs. */
  loading?: boolean;
  maxWidth?: GlassDialogProps['maxWidth'];
  /** `'grid'` renders options as responsive cards (logo + name + caption) instead of rows. */
  layout?: 'list' | 'grid';
  /** Minimum card width in grid layout — drives how many fit per row. */
  gridMin?: number;
  /** Extra content rendered under the option list (e.g. a conditional date/notes section). */
  children?: ReactNode;
}

export function OptionPickerDialog({
  open, onClose, title, subtitle, icon, options, selectedId, onSelect,
  onConfirm, confirmDisabled, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  loading = false, maxWidth = 'xs', layout = 'list', gridMin = 170, children,
}: OptionPickerDialogProps) {
  const divider = useTheme().palette.divider;
  return (
    <GlassDialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth={maxWidth}
      header={<GlassHeader title={title} subtitle={subtitle} icon={icon} onClose={() => !loading && onClose()} />}
    >
      <Box sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {layout === 'grid' ? (
          <AutoGrid min={gridMin} gap={10}>
            {options.map((o) => (
              <OptionCard
                key={o.id}
                label={o.name}
                caption={o.caption}
                leading={o.leading}
                color={o.color || '#64748b'}
                selected={o.id === selectedId}
                disabled={o.disabled}
                onClick={() => onSelect(o.id)}
              />
            ))}
          </AutoGrid>
        ) : (
          <Stack spacing={0.85}>
            {options.map((o) => (
              <OptionRow
                key={o.id}
                label={o.name}
                caption={o.caption}
                leading={o.leading}
                color={o.color || '#64748b'}
                selected={o.id === selectedId}
                disabled={o.disabled}
                onClick={() => onSelect(o.id)}
              />
            ))}
          </Stack>
        )}
        {children}
      </Box>

      <Box sx={{
        px: { xs: 2, sm: 2.5 }, py: 1.75, display: 'flex', justifyContent: 'flex-end', gap: 1.25,
        borderTop: `1px solid ${divider}`, flexShrink: 0,
      }}>
        <WtButton ghost onClick={onClose} disabled={loading}>{cancelLabel}</WtButton>
        {onConfirm && (
          <WtButton
            tone="primary"
            onClick={onConfirm}
            disabled={confirmDisabled || loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {confirmLabel}
          </WtButton>
        )}
      </Box>
    </GlassDialog>
  );
}

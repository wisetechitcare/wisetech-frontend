import React from 'react';
import { DialogActions, type DialogActionsProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { WtButton, type WtCtaTone } from './buttons';
import { FORM_SPACE } from './FormSection';
import { DialogCloseContext } from './UnsavedChangesContext';

/**
 * Shared Cancel / Save (or custom) footer for GlassDialog — **dialog footer SSOT**.
 *
 * Renders `WtButton ghost` Cancel (white) + `WtButton` Submit. The built-in submit
 * explicitly defaults to navy primary; its density and flat treatment follow WtButton defaults.
 * Sandwich Add Rule is the visual benchmark. Prefer this over hand-rolled
 * `DialogActions sx={{ px, py, borderTop }}` so every form dialog agrees on footer
 * rhythm (FORM_SPACE) and button look.
 *
 * Pins to the bottom of a height-capped Paper when paired with DialogContent —
 * GlassDialog detects this component as dialog chrome (same as MUI DialogActions).
 *
 * `ConfigureFormDialog` / `WtFormDialog` already embed matching WtButtons — leave them.
 * When migrating a Bootstrap/MUI Cancel–Save pair, switch here (one surface per PR).
 *
 * @example
 * <GlassDialogActions onCancel={onClose} onSubmit={save} submitLabel="Create Rule" submitting={busy} />
 * <GlassDialogActions onCancel={onClose}>
 *   <WtButton tone="danger" onClick={remove}>Delete</WtButton>
 * </GlassDialogActions>
 */
export interface GlassDialogActionsProps extends Omit<DialogActionsProps, 'children'> {
  onCancel?: () => void;
  cancelLabel?: string;
  cancelDisabled?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  submitStartIcon?: React.ReactNode;
  /** Tone for the primary button when using the built-in submit. */
  submitTone?: WtCtaTone;
  /**
   * Custom footer content. When set, the Cancel/Submit convenience buttons
   * are skipped (callers can still pass `onCancel` as unused — prefer children only).
   */
  children?: React.ReactNode;
}

const footerSx: SxProps<Theme> = {
  px: FORM_SPACE.footerPx,
  py: FORM_SPACE.footerPy,
  gap: 1.25,
  flexShrink: 0,
  borderTop: '1px solid',
  borderColor: 'divider',
};

export function GlassDialogActions({
  onCancel,
  cancelLabel = 'Cancel',
  cancelDisabled,
  onSubmit,
  submitLabel = 'Save',
  submitting = false,
  submitDisabled,
  submitStartIcon,
  submitTone = 'primary',
  children,
  sx,
  ...rest
}: GlassDialogActionsProps) {
  const busy = submitting;
  const dialogClose = React.useContext(DialogCloseContext);
  const content = children ?? (
    <>
      {onCancel ? (
        <WtButton
          ghost
          onClick={() => {
            if (dialogClose) dialogClose.requestClose(onCancel);
            else onCancel();
          }}
          disabled={cancelDisabled || busy}
        >
          {cancelLabel}
        </WtButton>
      ) : null}
      {onSubmit ? (
        <WtButton
          tone={submitTone}
          onClick={onSubmit}
          disabled={submitDisabled || busy}
          startIcon={submitStartIcon}
        >
          {busy ? 'Saving…' : submitLabel}
        </WtButton>
      ) : null}
    </>
  );

  return (
    <DialogActions
      sx={[footerSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])] as SxProps<Theme>}
      {...rest}
    >
      {content}
    </DialogActions>
  );
}

/** Marker so GlassDialog treats this as pinned chrome (not body scroll). */
(GlassDialogActions as unknown as { wtDialogChrome: true }).wtDialogChrome = true;

export default GlassDialogActions;

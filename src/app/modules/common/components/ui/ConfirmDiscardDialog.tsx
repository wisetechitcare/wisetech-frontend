import { ConfirmDialog } from './ConfirmDialog';

export interface ConfirmDiscardDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  /** Overrides "Discard unsaved changes?" — e.g. "Discard employee changes?". */
  title?: string;
  message?: string;
  /** Stacking layer — set it above a modal that itself sits above the default dialog layer. */
  zIndex?: number;
}

/**
 * The unsaved-changes prompt: a preset of the kit's ConfirmDialog (`variant="discard"`),
 * so leaving a form looks like every other confirmation in the app.
 */
export function ConfirmDiscardDialog({
  open,
  onKeepEditing,
  onDiscard,
  title,
  message = "Your changes haven't been saved. Are you sure you want to leave?",
  zIndex,
}: ConfirmDiscardDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      variant="discard"
      title={title}
      message={message}
      onClose={onKeepEditing}
      onConfirm={onDiscard}
      zIndex={zIndex}
    />
  );
}

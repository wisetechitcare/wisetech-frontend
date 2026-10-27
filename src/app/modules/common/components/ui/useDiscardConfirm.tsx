import { useCallback, useRef, useState } from 'react';
import { ConfirmDiscardDialog } from './ConfirmDiscardDialog';

export interface DiscardConfirmOptions {
  /** Overrides "Discard unsaved changes?". */
  title?: string;
  message?: string;
}

/**
 * Ask before a wizard closes with unsaved work — the ONE discard prompt every wizard uses.
 *
 * `isDirty` is a function, read at click time, because wizard hosts keep Formik behind a ref
 * (`formikRef.current?.dirty`) and often count pending uploads too. For a reactive boolean
 * inside a dialog, `useUnsavedChangesGuard` is the alternative.
 *
 * @example
 * const discard = useDiscardConfirm(() => !!formikRef.current?.dirty, onClose);
 * <Shell onClose={discard.requestClose}>…<Wizard onCancel={discard.requestClose} /></Shell>
 * {discard.dialog}
 */
export function useDiscardConfirm(
  isDirty: () => boolean,
  onClose: () => void,
  options: DiscardConfirmOptions = {},
) {
  const [open, setOpen] = useState(false);
  // Latest callbacks without re-creating requestClose (hosts pass inline lambdas).
  const latest = useRef({ isDirty, onClose });
  latest.current = { isDirty, onClose };

  const requestClose = useCallback(() => {
    if (latest.current.isDirty()) setOpen(true);
    else latest.current.onClose();
  }, []);

  const dialog = (
    <ConfirmDiscardDialog
      open={open}
      title={options.title}
      message={options.message}
      onKeepEditing={() => setOpen(false)}
      onDiscard={() => {
        setOpen(false);
        latest.current.onClose();
      }}
    />
  );

  return { requestClose, dialog };
}

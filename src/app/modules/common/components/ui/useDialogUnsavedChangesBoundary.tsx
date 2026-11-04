import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDiscardDialog } from './ConfirmDiscardDialog';
import {
  DialogCloseContext,
  DialogDirtyContext,
} from './UnsavedChangesContext';

/** `zIndex`: where the discard prompt stacks — above the dialog it guards. */
export function useDialogUnsavedChangesBoundary(disabled = false, zIndex?: number) {
  const [dirtyRegistrations, setDirtyRegistrations] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingClose = useRef<(() => void) | null>(null);
  const hasUnsavedChanges = !disabled && dirtyRegistrations.size > 0;

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyRegistrations((current) => {
      if (current.has(id) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const requestClose = useCallback((onClose: () => void) => {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }
    pendingClose.current = onClose;
    setConfirmOpen(true);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (hasUnsavedChanges || !pendingClose.current) return;
    const close = pendingClose.current;
    pendingClose.current = null;
    setConfirmOpen(false);
    close();
  }, [hasUnsavedChanges]);

  const dirtyContext = useMemo(() => ({ setDirty }), [setDirty]);
  const closeContext = useMemo(() => ({ requestClose }), [requestClose]);
  const discardDialog = confirmOpen ? (
    <ConfirmDiscardDialog
      open
      zIndex={zIndex}
      onKeepEditing={() => {
        pendingClose.current = null;
        setConfirmOpen(false);
      }}
      onDiscard={() => {
        const close = pendingClose.current;
        pendingClose.current = null;
        setConfirmOpen(false);
        close?.();
      }}
    />
  ) : null;

  return {
    dirtyContext,
    closeContext,
    requestClose,
    discardDialog,
  };
}

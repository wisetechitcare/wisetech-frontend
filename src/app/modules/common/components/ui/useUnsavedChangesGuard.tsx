import { useCallback, useEffect, useState } from 'react';
import { ConfirmDiscardDialog } from './ConfirmDiscardDialog';
import { useUnsavedChangesRegistration } from './UnsavedChangesProvider';

export function useUnsavedChangesGuard(dirty: boolean, onClose: () => void) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  useUnsavedChangesRegistration(dirty);

  useEffect(() => {
    if (!dirty) setConfirmOpen(false);
  }, [dirty]);

  const requestClose = useCallback(() => {
    if (!dirty) {
      onClose();
      return;
    }
    setConfirmOpen(true);
  }, [dirty, onClose]);

  const dialog = (
    <ConfirmDiscardDialog
      open={confirmOpen}
      onKeepEditing={() => setConfirmOpen(false)}
      onDiscard={() => {
        setConfirmOpen(false);
        onClose();
      }}
    />
  );

  return { requestClose, dialog };
}

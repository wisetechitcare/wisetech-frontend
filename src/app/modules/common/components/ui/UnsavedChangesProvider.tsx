import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDiscardDialog } from './ConfirmDiscardDialog';
import { DialogDirtyContext, UnsavedChangesContext } from './UnsavedChangesContext';

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirtyForms, setDirtyForms] = useState<Set<string>>(() => new Set());
  const hasUnsavedChanges = dirtyForms.size > 0;
  const blocker = useBlocker(hasUnsavedChanges);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyForms((current) => {
      if (current.has(id) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges && blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker, hasUnsavedChanges]);

  const contextValue = useMemo(() => ({ setDirty }), [setDirty]);
  const blocked = blocker.state === 'blocked';

  return (
    <UnsavedChangesContext.Provider value={contextValue}>
      {children}
      <ConfirmDiscardDialog
        open={blocked}
        onKeepEditing={() => {
          if (blocker.state === 'blocked') blocker.reset();
        }}
        onDiscard={() => {
          if (blocker.state === 'blocked') blocker.proceed();
        }}
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesRegistration(dirty: boolean) {
  const context = useContext(UnsavedChangesContext);
  const dialogContext = useContext(DialogDirtyContext);
  const id = useId();

  useEffect(() => {
    context?.setDirty(id, dirty);
    dialogContext?.setDirty(id, dirty);
    return () => {
      context?.setDirty(id, false);
      dialogContext?.setDirty(id, false);
    };
  }, [context, dialogContext, dirty, id]);
}

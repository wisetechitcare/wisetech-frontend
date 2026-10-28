import { createContext } from 'react';

export type UnsavedChangesContextValue = {
  setDirty: (id: string, dirty: boolean) => void;
};

export const UnsavedChangesContext =
  createContext<UnsavedChangesContextValue | null>(null);

export type DialogDirtyContextValue = {
  setDirty: (id: string, dirty: boolean) => void;
};

export const DialogDirtyContext =
  createContext<DialogDirtyContextValue | null>(null);

export type DialogCloseContextValue = {
  requestClose: (onClose: () => void) => void;
};

export const DialogCloseContext =
  createContext<DialogCloseContextValue | null>(null);

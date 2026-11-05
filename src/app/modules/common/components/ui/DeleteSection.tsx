import React, { createContext, useContext, useSyncExternalStore } from "react";
import { store } from "@redux/store";
import { canDelete } from "@utils/can";

/**
 * Marks a screen as part of one section (a Configure tab, usually) so the shared trash controls
 * inside it — ConfigColorChip / MasterListSection trash, ActionIconButton "trash" — show only to
 * people with Delete on that section. Outside one, those controls are unchanged (the screen gates
 * itself).
 */
const SectionCtx = createContext<string | null>(null);
// Tests mock the store with getState only.
const subscribe = (cb: () => void) => (typeof store.subscribe === 'function' ? store.subscribe(cb) : () => undefined);

export const DeleteSection: React.FC<{ section: string; children: React.ReactNode }> = ({ section, children }) => (
  <SectionCtx.Provider value={section}>{children}</SectionCtx.Provider>
);

/** A screen wrapped in a DeleteSection for `section` — used at a Configure tab's export. */
export const withDeleteSection = <P extends object>(section: string, Component: React.ComponentType<P>) => {
  const Wrapped = (props: P) => <DeleteSection section={section}><Component {...props} /></DeleteSection>;
  Wrapped.displayName = `withDeleteSection(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

/** Renders its children (a delete button) only when a delete may show here. */
export const IfCanDelete: React.FC<{ children: React.ReactNode }> = ({ children }) => (useCanDeleteHere() ? <>{children}</> : null);

/** Whether a delete may show here: Delete on the enclosing section, or true outside a DeleteSection. */
export const useCanDeleteHere = (): boolean => {
  const section = useContext(SectionCtx);
  // Re-render when access changes live. Straight off the store, so it needs no <Provider>.
  useSyncExternalStore(subscribe, () => (store.getState() as any).authz?.access);
  return section ? canDelete(section) : true;
};

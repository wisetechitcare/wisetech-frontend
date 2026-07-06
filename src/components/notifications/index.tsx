/**
 * Floating notification center — public API.
 *
 * Mount <NotificationCenter /> once inside the authenticated layout. It bundles
 * the provider (state + realtime socket) and the floating UI (snackbar + panel).
 * Consumers that need imperative access can use the useNotificationCenter hook.
 */
import type { ReactNode } from 'react';
import { NotificationProvider } from './NotificationProvider';
import { FloatingNotifications } from './FloatingNotifications';

export { NotificationProvider, useNotificationCenter } from './NotificationProvider';
export { FloatingNotifications } from './FloatingNotifications';
export type {
  AppNotification,
  NotificationPriority,
  NotificationFilterState,
  ReadFilter,
} from './types';

/** Self-contained mount: provider + floating UI. Drop into the layout root. */
export function NotificationCenter({ children }: { children?: ReactNode }) {
  return (
    <NotificationProvider>
      {children}
      <FloatingNotifications />
    </NotificationProvider>
  );
}

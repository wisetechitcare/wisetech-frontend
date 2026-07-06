import { useEffect, useRef } from 'react';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import type { AppEventMap } from '@constants/eventKeys';

type PermissionsPayload = AppEventMap['permissionsUpdated'];

/**
 * Live-permissions realtime subscription.
 *
 * When an admin changes a role's permissions/section access, or changes an
 * employee's role assignment, the backend pushes a `permissions_updated` socket
 * event to that specific employee's session (bridged to the eventBus by
 * useRealtimeSync). This hook lets the app refetch capabilities in response,
 * so a revoked/changed user's effective access updates immediately - without
 * requiring them to log out or refresh the page.
 *
 * A permission edit can fire this several times in quick succession (e.g. the
 * legacy checkbox grid saves many resource/action rows at once) - bursts within
 * `debounceMs` are coalesced into a single refetch.
 *
 * @param onUpdate  refetch callback; receives the event payload (may be empty).
 * @param debounceMs  coalescing window (default 800ms).
 */
export function usePermissionsRealtime(
  onUpdate: (payload: PermissionsPayload) => void,
  debounceMs = 800
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadRef = useRef<PermissionsPayload>({});

  useEventBus(EVENT_KEYS.permissionsUpdated, (payload) => {
    lastPayloadRef.current = payload || {};
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onUpdateRef.current(lastPayloadRef.current);
    }, debounceMs);
  });

  // Clear any pending timer on unmount so we never refetch into a dead component.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}

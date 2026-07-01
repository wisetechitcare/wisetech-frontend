import { useEffect, useRef } from 'react';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import type { AppEventMap } from '@constants/eventKeys';

type AttendancePayload = AppEventMap['attendanceUpdated'];

/**
 * Live-attendance realtime subscription.
 *
 * Any attendance change on the server (biometric push/pull, admin edit, or a
 * self check-in/out) broadcasts an `attendance_updated` socket event, bridged to
 * the eventBus by useRealtimeSync. This hook lets a live "today" board refetch in
 * response, WITHOUT a page refresh.
 *
 * Bursts of punches are coalesced: rapid events within `debounceMs` trigger a
 * single refetch. The newest `onUpdate` is always used (ref-backed), so callers
 * need not memoise it.
 *
 * @param onUpdate  refetch callback; receives the event payload (may be empty).
 * @param options.debounceMs  coalescing window (default 1500ms).
 * @param options.enabled     set false to pause (e.g. while a modal is closed).
 */
export function useAttendanceRealtime(
  onUpdate: (payload: AttendancePayload) => void,
  options?: { debounceMs?: number; enabled?: boolean }
) {
  const debounceMs = options?.debounceMs ?? 1500;
  const enabled = options?.enabled ?? true;

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadRef = useRef<AttendancePayload>({});

  useEventBus(EVENT_KEYS.attendanceUpdated, (payload) => {
    if (!enabled) return;
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

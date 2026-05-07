import { useEffect, useRef } from 'react';
import eventBus from '../utils/EventBus';
import type { AppEventKey, AppEventMap } from '../constants/eventKeys';

/**
 * Subscribes to an eventBus event for the lifetime of the component.
 *
 * Uses a ref-backed stable handler so:
 *  - The listener is registered exactly once per eventKey (not on every render).
 *  - The callback reference never needs to be memoised by the caller — the
 *    latest version is always invoked via the ref.
 *  - No missed events from the listener being torn down and re-added on every
 *    render (the old pattern with [eventKey, callback] deps).
 */
export function useEventBus<K extends AppEventKey>(
  eventKey: K,
  callback: (payload: AppEventMap[K]) => void
) {
  // Always keep the ref pointing at the newest callback without re-running the effect.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // Stable wrapper — identity never changes, so the same function is passed to
    // both .on() and .off(), guaranteeing correct cleanup.
    const handler = (payload: AppEventMap[K]) => callbackRef.current(payload);
    eventBus.on(eventKey, handler);
    return () => {
      eventBus.off(eventKey, handler);
    };
  }, [eventKey]); // re-register only if the event key itself changes
}

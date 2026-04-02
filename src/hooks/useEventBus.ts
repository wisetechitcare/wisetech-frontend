import { useEffect } from 'react';
import eventBus from '../utils/EventBus';
import type { AppEventKey, AppEventMap } from '../constants/eventKeys';

export function useEventBus<K extends AppEventKey>(
  eventKey: K,
  callback: (payload: AppEventMap[K]) => void
) {
  useEffect(() => {
    eventBus.on(eventKey, callback);
    return () => {
      eventBus.off(eventKey, callback); // auto cleanup
    };
  }, [eventKey, callback]);
}
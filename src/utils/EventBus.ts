// utils/eventBus.ts
import { EventEmitter } from 'events';
import type { AppEventMap, AppEventKey } from '../constants/eventKeys';

class TypedEventBus extends EventEmitter {
  emit<K extends AppEventKey>(event: K, payload?: AppEventMap[K]): boolean {
    return super.emit(event, payload);
  }

  on<K extends AppEventKey>(
    event: K,
    listener: (payload: AppEventMap[K]) => void
  ): this {
    return super.on(event, listener);
  }

  off<K extends AppEventKey>(
    event: K,
    listener: (payload: AppEventMap[K]) => void
  ): this {
    return super.off(event, listener);
  }
}

const eventBus = new TypedEventBus();

export default eventBus;
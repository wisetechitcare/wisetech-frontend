import { useSyncExternalStore } from 'react';
import {
  getCourtesyDeskState,
  subscribeCourtesyDesk,
} from '../store/courtesyDeskStore';

export function useCourtesyDesk() {
  return useSyncExternalStore(subscribeCourtesyDesk, getCourtesyDeskState, getCourtesyDeskState);
}

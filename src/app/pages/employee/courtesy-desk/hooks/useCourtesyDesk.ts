import { useSyncExternalStore } from 'react';
import {
  getCourtesyDeskState,
  subscribeCourtesyDesk,
} from '../store/courtesyDeskStore';
import type { CourtesyDeskState } from '../types';

export function useCourtesyDesk(): CourtesyDeskState {
  return useSyncExternalStore(subscribeCourtesyDesk, getCourtesyDeskState, getCourtesyDeskState);
}

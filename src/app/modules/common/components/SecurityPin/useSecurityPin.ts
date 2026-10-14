import { useSyncExternalStore } from 'react';
import { securityPinBus, type SecurityPinSnapshot } from '@utils/securityPinBus';

/** The security PIN state, live across the page, the global dialog and other tabs. */
export const useSecurityPin = (): SecurityPinSnapshot =>
    useSyncExternalStore(securityPinBus.subscribe, securityPinBus.getSnapshot);

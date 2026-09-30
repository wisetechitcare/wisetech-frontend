/**
 * Security PIN — a 6-digit PIN, separate from the login password, that must be entered
 * before sensitive areas (salary, increment, roles & permissions) open. The backend enforces it
 * (403 SECURITY_LOCKED on those routes);
 * these components decide what the screen shows.
 *
 *   SecurityPinGate          wrap a tab body; shows the lock screen until unlocked
 *   SecurityPinHost          mount once in App: fallback dialog + idle re-lock
 *   SecurityPinLockButton  "Lock" button for a protected page's tab bar
 *   useSecurityPin           read the live state
 */
export { SecurityPinGate } from './SecurityPinGate';
export { SecurityPinHost } from './SecurityPinHost';
export { SecurityPinLockButton } from './SecurityPinLockButton';
export { SecurityPinPanel } from './SecurityPinPanel';
export { useSecurityPin } from './useSecurityPin';

/**
 * Security PIN — a 6-digit PIN, separate from the login password, that must be entered
 * before sensitive areas (salary, increment, roles & permissions) open. The backend enforces it
 * (403 SECURITY_LOCKED on those routes);
 * these components decide what the screen shows.
 *
 *   SecurityPinGate          wrap a tab body; shows the lock screen until unlocked
 *   SecurityPinHost          mount once in App: fallback dialog + idle re-lock
 *   SecurityPinLockButton  "Lock" button for a protected page's tab bar
 *   SecurityPinAreaControl    one tab's PIN select (listed in the row chip's dialog)
 *   SecurityPinRowChip        the PIN chip on a protected access-tree row (Salary, Increment, Roles & Permissions);
 *                             opens one dialog with every tab's PIN timing
 *   SecurityPinResetButton    admin "Reset PIN" for one employee (PIN settings live in the access tree)
 *   useSecurityPin           read the live state
 */
export { SecurityPinGate } from './SecurityPinGate';
export { SecurityPinHost } from './SecurityPinHost';
export { SecurityPinLockButton } from './SecurityPinLockButton';
export { SecurityPinPanel } from './SecurityPinPanel';
export { useSecurityPin } from './useSecurityPin';
export { SecurityPinResetButton } from './SecurityPinResetButton';
export { SecurityPinAreaControl } from './SecurityPinAreaControl';
export { SecurityPinRowChip, SECURITY_PIN_ROW_AREAS } from './SecurityPinRowChip';
export { SupportAccessPolicyChip } from './SupportAccessPolicyChip';
export { useSecurityPinPolicy, type SecurityPinSubject } from './useSecurityPinPolicy';
export { SupportAccessPanel } from './SupportAccessPanel';
export { SupportSessionBanner } from './SupportSessionBanner';
export { DeveloperMfaEnrollForm } from './DeveloperMfaEnrollForm';

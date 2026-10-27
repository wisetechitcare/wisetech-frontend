import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  ConfirmDialog,
  type ConfirmDialogDismissReason,
} from '@app/modules/common/components/ui/ConfirmDialog';
import { logoutUser } from '@redux/slices/auth';
import { getAuth, removeAuth, AUTH_LOCAL_STORAGE_KEY } from '@app/modules/auth/core/AuthHelpers';
import { logout as logoutApi } from '@services/auth';

// Idle logout is DISABLED by default: sessions persist until the user signs
// out explicitly (closing the browser / shutting down the PC never ends the
// session). Set VITE_APP_IDLE_TIMEOUT_MINUTES to a positive number to opt a
// deployment back into inactivity logout.
const configuredMinutes = Number(import.meta.env.VITE_APP_IDLE_TIMEOUT_MINUTES);
const IDLE_TIMEOUT_MS =
  Number.isFinite(configuredMinutes) && configuredMinutes > 0
    ? configuredMinutes * 60 * 1000
    : 0;
const WARNING_WINDOW_MS = 60 * 1000; // warn during the final 60s of the idle window
const CHECK_INTERVAL_MS = 5 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 2 * 1000;

// Last-activity timestamp is SHARED across tabs via localStorage. Every tab
// writes its own activity here and every tab's check loop reads it, so an
// idle background tab can never log out a user who is active in another tab
// (each tab used to run a private timer and clear the shared session).
const ACTIVITY_KEY = 'wt_last_activity_at';

/**
 * Same layer as the dialog service (dialogService.tsx DIALOG_Z_INDEX): above MUI dialogs (1300),
 * react-bootstrap modals (1055) and the 1500-level legacy modals such as GlobalTimerModal, so the
 * warning can never open behind a modal the idle user left open.
 */
const WARNING_Z_INDEX = 2000;

interface WarningState {
  open: boolean;
  /** Logout deadline (epoch ms) — the countdown is derived from it, never decremented. */
  deadline: number;
  /** Last countdown tick (epoch ms). */
  now: number;
}

const secondsLeft = ({ deadline, now }: WarningState) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

export const IdleLogoutGuard = () => {
  const dispatch = useDispatch();
  const [warning, setWarning] = useState<WarningState>({ open: false, deadline: 0, now: 0 });
  // The two user choices live inside the effect's closure (they read/write its flags); the
  // dialog calls them through this ref.
  const actionsRef = useRef<{ stay: () => void; signOut: () => void } | null>(null);

  // Countdown render tick. Derived from the deadline timestamp (not decremented per tick), so
  // it stays correct when the browser throttles timers in background tabs or after sleep. The
  // check loop performs the actual logout; this only renders.
  useEffect(() => {
    if (!warning.open) return undefined;
    const id = setInterval(() => {
      setWarning((w) => (w.open ? { ...w, now: Date.now() } : w));
    }, 1000);
    return () => clearInterval(id);
  }, [warning.open]);

  useEffect(() => {
    // Even with idle logout disabled, the cross-tab sign-out sync below must
    // stay active — signing out in one tab should log every tab out instantly.
    const idleLogoutEnabled = IDLE_TIMEOUT_MS > 0;

    let localActivityAt = Date.now();
    let lastActivityWriteAt = 0;
    let warningShown = false;
    let loggingOut = false;

    // Newest activity across ALL tabs (shared key), falling back to this
    // tab's in-memory value if storage is unavailable/corrupted.
    const lastActivityAt = (): number => {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      const shared = raw ? Number(raw) : 0;
      return Math.max(localActivityAt, Number.isFinite(shared) ? shared : 0);
    };

    const markActivity = (force = false) => {
      const now = Date.now();
      localActivityAt = now;
      // Throttled: mousemove can fire hundreds of times/sec.
      if (force || now - lastActivityWriteAt >= ACTIVITY_WRITE_THROTTLE_MS) {
        lastActivityWriteAt = now;
        try {
          localStorage.setItem(ACTIVITY_KEY, String(now));
        } catch {
          /* storage blocked/full — in-memory value still guards this tab */
        }
      }
    };

    // Programmatic close — no user choice is recorded (the old Swal.close()).
    const closeWarning = () => setWarning((w) => (w.open ? { ...w, open: false } : w));

    // Leave this tab only (no server call) — used when another tab already
    // ended the session and blacklisted the token.
    const leaveToLogin = () => {
      if (loggingOut) return;
      loggingOut = true;
      closeWarning();
      dispatch(logoutUser());
      window.location.href = '/auth';
    };

    const performLogout = async () => {
      if (loggingOut) return;
      loggingOut = true;
      closeWarning();
      // Best-effort server logout first, so the idle session's JWT is
      // blacklisted on the backend — mirrors the manual Sign Out flow.
      try {
        const auth = getAuth();
        if (auth) await logoutApi(auth.token, auth.id);
      } catch {
        /* clear local state regardless */
      }
      removeAuth();
      localStorage.removeItem('selectedCompany');
      localStorage.removeItem('selectedBranch');
      dispatch(logoutUser());
      window.location.href = '/auth';
    };

    const dismissWarning = () => {
      if (warningShown) {
        warningShown = false;
        closeWarning();
      }
    };

    const showWarning = (deadline: number) => {
      if (warningShown || loggingOut) return;
      warningShown = true;
      setWarning({ open: true, deadline, now: Date.now() });
    };

    // User choices. Both are ignored once the warning was closed programmatically
    // (dismissWarning / logout) — a click landing during the exit animation is no choice.
    actionsRef.current = {
      stay: () => {
        if (!warningShown || loggingOut) return;
        // "Stay signed in" — counts as activity for every tab.
        warningShown = false;
        closeWarning();
        markActivity(true);
      },
      signOut: () => {
        if (!warningShown || loggingOut) return;
        warningShown = false;
        performLogout();
      },
    };

    // Single source of truth: compare shared last-activity to the deadline.
    // Timestamp math survives setTimeout throttling and system sleep — a
    // timer that fires late still evaluates the true idle duration.
    const check = () => {
      if (loggingOut) return;
      if (!getAuth()) {
        // Session already cleared (e.g. logged out elsewhere) — just leave.
        leaveToLogin();
        return;
      }
      const idleFor = Date.now() - lastActivityAt();
      if (idleFor >= IDLE_TIMEOUT_MS) {
        performLogout();
      } else if (idleFor >= IDLE_TIMEOUT_MS - WARNING_WINDOW_MS) {
        // Warn only in a visible tab — a hidden tab can't be interacted with,
        // and its check loop will still enforce the deadline.
        if (document.visibilityState === 'visible') {
          showWarning(lastActivityAt() + IDLE_TIMEOUT_MS);
        }
      } else if (warningShown) {
        // Activity elsewhere (another tab) pushed the deadline out — dismiss.
        dismissWarning();
      }
    };

    const handleActivity = () => {
      // While the warning is up, staying signed in must be an explicit choice.
      if (!warningShown && !loggingOut) {
        markActivity();
      }
    };

    // Cross-tab session sync: when another tab logs out (removes the auth
    // key), this tab leaves immediately instead of lingering half-dead on an
    // in-memory token that the backend has already blacklisted.
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_LOCAL_STORAGE_KEY && e.newValue === null) {
        leaveToLogin();
      }
    };

    // Re-evaluate immediately when the tab becomes visible again (after
    // sleep/tab switch) instead of waiting for the next throttled tick.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    window.addEventListener('storage', handleStorage);
    if (idleLogoutEnabled) {
      events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
      document.addEventListener('visibilitychange', handleVisibility);
      markActivity(true); // mounting (login / reload) counts as activity
    }
    const intervalId = idleLogoutEnabled ? setInterval(check, CHECK_INTERVAL_MS) : null;

    return () => {
      if (intervalId) clearInterval(intervalId);
      actionsRef.current = null;
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = (reason: ConfirmDialogDismissReason) => {
    // Backdrop and Escape do nothing — the choice must be explicit (the old
    // allowOutsideClick / allowEscapeKey: false). The corner X is a click by a present
    // user closing the warning, so it counts as staying signed in.
    if (reason === 'cancel') actionsRef.current?.signOut();
    else if (reason === 'close') actionsRef.current?.stay();
  };

  return (
    <ConfirmDialog
      open={warning.open}
      variant="warning"
      title="Session Expiring"
      message=""
      messageNode={
        <>
          Your session will expire in <strong>{secondsLeft(warning)}</strong> seconds due to
          inactivity.
          <br />
          <br />
          Would you like to stay signed in?
        </>
      }
      confirmLabel="Stay signed in"
      cancelLabel="Sign out"
      onConfirm={() => actionsRef.current?.stay()}
      onClose={() => undefined}
      onDismiss={handleDismiss}
      zIndex={WARNING_Z_INDEX}
    />
  );
};

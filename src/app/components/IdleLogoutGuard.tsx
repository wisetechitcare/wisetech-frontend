import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
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

export const IdleLogoutGuard = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Even with idle logout disabled, the cross-tab sign-out sync below must
    // stay active — signing out in one tab should log every tab out instantly.
    const idleLogoutEnabled = IDLE_TIMEOUT_MS > 0;

    let localActivityAt = Date.now();
    let lastActivityWriteAt = 0;
    let warningShown = false;
    let loggingOut = false;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

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

    const clearCountdown = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };

    // Leave this tab only (no server call) — used when another tab already
    // ended the session and blacklisted the token.
    const leaveToLogin = () => {
      if (loggingOut) return;
      loggingOut = true;
      clearCountdown();
      Swal.close();
      dispatch(logoutUser());
      window.location.href = '/auth';
    };

    const performLogout = async () => {
      if (loggingOut) return;
      loggingOut = true;
      clearCountdown();
      Swal.close();
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
        clearCountdown();
        Swal.close();
      }
    };

    const warningHtml = (deadline: number) => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      return `Your session will expire in <strong>${seconds}</strong> seconds due to inactivity.<br><br>Would you like to stay signed in?`;
    };

    const showWarning = (deadline: number) => {
      if (warningShown || loggingOut) return;
      warningShown = true;

      Swal.fire({
        title: 'Session Expiring',
        html: warningHtml(deadline),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Stay signed in',
        cancelButtonText: 'Sign out',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          // Countdown is derived from the deadline timestamp (not decremented
          // per tick), so it stays correct even when the browser throttles
          // timers in background tabs or after system sleep.
          countdownInterval = setInterval(() => {
            Swal.update({ html: warningHtml(deadline) });
            // The check loop performs the actual logout; this only renders.
          }, 1000);
        },
      }).then((result) => {
        clearCountdown();
        if (result.isConfirmed) {
          // "Stay signed in" — counts as activity for every tab.
          warningShown = false;
          markActivity(true);
        } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
          warningShown = false;
          performLogout();
        }
        // Programmatic Swal.close() (dismissWarning/logout) needs no handling.
      });
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
      clearCountdown();
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This component doesn't render anything
  return null;
};

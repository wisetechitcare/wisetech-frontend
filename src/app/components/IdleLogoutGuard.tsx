import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { logoutUser } from '@redux/slices/auth';
import { removeAuth } from '@app/modules/auth/core/AuthHelpers';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_TIME_MS = 14 * 60 * 1000; // Show warning at 14 minutes
const COUNTDOWN_TIME_MS = 60 * 1000; // 60 second countdown

export const IdleLogoutGuard = () => {
  const dispatch = useDispatch();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isShowingWarningRef = useRef<boolean>(false);

  const resetIdleTimer = () => {
    lastActivityRef.current = Date.now();
    isShowingWarningRef.current = false;

    // Clear existing timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // Set timer to show warning after WARNING_TIME_MS
    warningTimerRef.current = setTimeout(() => {
      if (!isShowingWarningRef.current) {
        showIdleWarning();
      }
    }, WARNING_TIME_MS);

    // Set timer to logout after IDLE_TIMEOUT_MS if no activity
    idleTimerRef.current = setTimeout(() => {
      performLogout();
    }, IDLE_TIMEOUT_MS);
  };

  const showIdleWarning = () => {
    isShowingWarningRef.current = true;
    let remainingSeconds = COUNTDOWN_TIME_MS / 1000;

    // Show modal with countdown
    Swal.fire({
      title: 'Session Expiring',
      html: `Your session will expire in <strong>${Math.ceil(remainingSeconds)}</strong> seconds due to inactivity.<br><br>Would you like to stay signed in?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Stay signed in',
      cancelButtonText: 'Sign out',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        // Update countdown every second
        countdownIntervalRef.current = setInterval(() => {
          remainingSeconds -= 1;
          if (remainingSeconds <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            // Auto logout when countdown reaches 0
            Swal.close();
            performLogout();
          } else {
            // Update the HTML with remaining time
            const htmlContent = `Your session will expire in <strong>${Math.ceil(remainingSeconds)}</strong> seconds due to inactivity.<br><br>Would you like to stay signed in?`;
            Swal.update({ html: htmlContent });
          }
        }, 1000);
      },
    }).then((result) => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (result.isConfirmed) {
        // User clicked "Stay signed in"
        resetIdleTimer();
      } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
        // User clicked "Sign out"
        performLogout();
      }
    });
  };

  const performLogout = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    removeAuth();
    dispatch(logoutUser());
    window.location.href = '/auth';
  };

  const handleActivity = () => {
    // Only reset if we're not already showing the warning modal
    if (!isShowingWarningRef.current) {
      resetIdleTimer();
    }
  };

  useEffect(() => {
    // Initialize the idle timer on mount
    resetIdleTimer();

    // Add event listeners for user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup on unmount
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // This component doesn't render anything
  return null;
};

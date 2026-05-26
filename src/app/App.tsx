import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { I18nProvider } from '../_metronic/i18n/i18nProvider'
import { LayoutProvider, LayoutSplashScreen } from '../_metronic/layout/core'
import { MasterInit } from '../_metronic/layout/MasterInit'
import { ThemeModeProvider } from '../_metronic/partials'
import { RootState, AppDispatch } from '@redux/store'
import { setUserId, loadTimerStateThunk } from '@redux/slices/timer'
import GlobalTimerModal from '../components/GlobalTimerModal';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { Toaster } from 'sonner';
import { MaintenancePage } from './modules/errors/MaintenancePage';
import { NoInternetPage } from './modules/errors/NoInternetPage';

// Checks real internet connectivity by loading an external image (no CORS issues).
// navigator.onLine is unreliable — it returns true when on WiFi with no internet.
const checkInternetConnectivity = (): Promise<boolean> => {
  if (!navigator.onLine) return Promise.resolve(false);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 5000);
    const img = new Image();
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = `https://www.google.com/favicon.ico?_=${Date.now()}`;
  });
};

const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-cache', signal: controller.signal });
    clearTimeout(tid);
    return res.ok;
  } catch {
    return false;
  }
};

const App = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Global Error States
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isMaintenance, setIsMaintenance] = useState(false);
  // Prevent concurrent connectivity checks from racing
  const isCheckingRef = useRef(false);

  // Get authentication state
  const currentUser  = useSelector((state: RootState) => state.auth.currentUser);
  const employeeId   = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const isAuthenticated = !!currentUser?.id;

  // Listen for online/offline and backend-down events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      // Re-check backend when internet comes back
      const backendOk = await checkBackendHealth();
      setIsMaintenance(!backendOk);
    };

    // Internet is definitively gone — clear maintenance (internet takes priority)
    const handleOffline = () => {
      setIsOffline(true);
      setIsMaintenance(false);
    };

    const handleBackendDown = async () => {
      // Guard against multiple simultaneous checks from rapid API failures
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;
      try {
        // Do a real internet check — navigator.onLine is unreliable on WiFi with no internet
        const hasInternet = await checkInternetConnectivity();
        if (hasInternet) {
          // Internet works but our backend/frontend is unreachable → maintenance
          setIsMaintenance(true);
          setIsOffline(false);
        } else {
          // Can't reach anything → no internet (takes priority over maintenance)
          setIsOffline(true);
          setIsMaintenance(false);
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('backend-down', handleBackendDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('backend-down', handleBackendDown);
    };
  }, []);

  // Auto-poll to recover from error states without requiring a page refresh
  useEffect(() => {
    if (!isOffline && !isMaintenance) return;

    const poll = async () => {
      if (isOffline) {
        const hasInternet = await checkInternetConnectivity();
        if (hasInternet) {
          setIsOffline(false);
          const backendOk = await checkBackendHealth();
          setIsMaintenance(!backendOk);
        }
      } else if (isMaintenance) {
        const backendOk = await checkBackendHealth();
        if (backendOk) setIsMaintenance(false);
      }
    };

    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [isOffline, isMaintenance]);

  // Initialize timer with user ID when user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      dispatch(setUserId(currentUser.id));
      dispatch(loadTimerStateThunk(currentUser.id));
    } else {
      dispatch(setUserId(null));
    }
  }, [isAuthenticated, currentUser?.id, dispatch]);

  // Global real-time sync: backend socket events → eventBus → component refetches
  useRealtimeSync(isAuthenticated ? currentUser?.id : null);

  // Browser push notifications: register SW + subscribe when employee is loaded
  usePushSubscription(isAuthenticated ? employeeId : null);

  if (isOffline) {
    return <NoInternetPage />;
  }

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <>
      <Suspense fallback={<LayoutSplashScreen />}>
        <I18nProvider>
          <LayoutProvider>
            <ThemeModeProvider>
              <Outlet />
              <MasterInit />
              <Toaster richColors position="top-right" />
              
              {/* Global Timer Modal - only render when authenticated */}
              {isAuthenticated && <GlobalTimerModal />}
            </ThemeModeProvider>
          </LayoutProvider>
        </I18nProvider>
      </Suspense>
    </>
  )
}

export { App }

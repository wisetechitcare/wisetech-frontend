import { Suspense, useEffect, useState } from 'react'
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

const App = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Global Error States
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Get authentication state
  const currentUser  = useSelector((state: RootState) => state.auth.currentUser);
  const employeeId   = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const isAuthenticated = !!currentUser?.id;

  // Listen for online/offline and backend-down events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBackendDown = () => setIsMaintenance(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('backend-down', handleBackendDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('backend-down', handleBackendDown);
    };
  }, []);

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

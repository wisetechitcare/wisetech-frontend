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
const App = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Get authentication state
  const currentUser  = useSelector((state: RootState) => state.auth.currentUser);
  const employeeId   = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const isAuthenticated = !!currentUser?.id;

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

  return (
    <>
      <Suspense fallback={<LayoutSplashScreen />}>
        <I18nProvider>
          <LayoutProvider>
            <ThemeModeProvider>
              <Outlet />
              <MasterInit />
              
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

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
const App = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get authentication state
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const isAuthenticated = !!currentUser?.id;

  // Initialize timer with user ID when user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      // Set user ID in timer slice
      dispatch(setUserId(currentUser.id));
      
      // Load any existing timer state from localStorage for this user
      dispatch(loadTimerStateThunk(currentUser.id));
    } else {
      // Clear user ID when not authenticated
      dispatch(setUserId(null));
    }
  }, [isAuthenticated, currentUser?.id, dispatch]);

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

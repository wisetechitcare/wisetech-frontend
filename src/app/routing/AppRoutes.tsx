/**
 * High level router.
 *
 * Note: It's recommended to compose related routes in internal router
 * components (e.g: `src/app/modules/Auth/pages/AuthPage`, `src/app/BasePage`).
 */

import { FC } from 'react'
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom'
import { PrivateRoutes } from './PrivateRoutes'
import { ErrorsPage } from '../modules/errors/ErrorsPage'
import { Logout, AuthPage, getAuth } from '../modules/auth'
import { App } from '../App'
import { useSelector } from 'react-redux'
import { RootState } from '@redux/store'
import { jwtDecode } from "jwt-decode"

/**
 * Base URL of the website.
 *
 * @see https://facebook.github.io/create-react-app/docs/using-the-public-folder
 */
const { BASE_URL } = import.meta.env

const AppRoutes: FC = () => {
  const currentUser = useSelector((state: RootState) => state.auth.jwtToken) || getAuth();
  const redirect = useSelector((state: RootState) => state.auth.redirectToDashboard) || JSON.parse(localStorage.getItem("redirectToDashboard") || "false");
  let isTokenExpired = false;
  if (currentUser?.token) {
    const decodedToken = jwtDecode(currentUser.token);


    if (decodedToken.iat && decodedToken.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      isTokenExpired = currentTime > decodedToken.exp;
    }
  }

  return (
    <BrowserRouter basename={BASE_URL}>
      <Routes>
        <Route element={<App />}>
          <Route path='error/*' element={<ErrorsPage />} />
          <Route path='logout' element={<Logout />} />
          {currentUser && redirect && !isTokenExpired ? (
            <>
              <Route path='/*' element={<PrivateRoutes />} />
              {/* Landing is the DASHBOARD, in both navigation modes.
                  
                  This used to read the nav-transform flag and send shell-mode users to
                  the workspace launcher instead. That conflated two separate things: the
                  flag is a choice about CHROME — rail versus sidebar — and it was being
                  used to decide DESTINATION. The consequence was that changing your
                  navigation style silently changed where '/' lands, and since the flag
                  persists in localStorage, every later reload of '/' landed on the
                  launcher. One stray Ctrl+I (the toggle's global shortcut) was enough to
                  move a user's home page permanently, with nothing on screen explaining
                  why. That is what "reloading throws me on a weird page" was.

                  The dashboard is the app's home in BOTH modes — WorkspaceShell is a
                  pathless layout route, so '/dashboard' renders with the rail around it
                  in shell mode and with the sidebar in classic mode. The launcher is a
                  navigation surface, not a landing page, and it stays one click away on
                  the rail's permanent "All applications" row (DockHomeLink) as well as at
                  '/workspace' and '/home'. */}
              <Route index element={<Navigate to='/dashboard' replace />} />
            </>
          ) : (
            <>
              <Route path='auth/*' element={<AuthPage />} />
              <Route path='*' element={<Navigate to='/auth' />} />
            </>
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export { AppRoutes }

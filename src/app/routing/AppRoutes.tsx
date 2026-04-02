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
              <Route index element={<Navigate to='/dashboard' />} />
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

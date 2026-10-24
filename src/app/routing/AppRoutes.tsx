import { FC } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from 'react-router-dom'
import { useSelector } from 'react-redux'
import { jwtDecode } from 'jwt-decode'
import { RootState } from '@redux/store'
import { PrivateRoutes } from './PrivateRoutes'
import { ErrorsPage } from '../modules/errors/ErrorsPage'
import { Logout, AuthPage, getAuth } from '../modules/auth'
import GoogleContactsCallback from '@pages/employee/companies/contacts/components/GoogleContactsCallback'
import { App } from '../App'

const { BASE_URL } = import.meta.env

function useHasAuthenticatedSession() {
  const currentUser = useSelector((state: RootState) => state.auth.jwtToken) || getAuth()
  const redirect = useSelector((state: RootState) => state.auth.redirectToDashboard)
    || JSON.parse(localStorage.getItem('redirectToDashboard') || 'false')

  let isTokenExpired = false
  if (currentUser?.token) {
    const decodedToken = jwtDecode(currentUser.token)
    if (decodedToken.iat && decodedToken.exp) {
      isTokenExpired = Math.floor(Date.now() / 1000) > decodedToken.exp
    }
  }

  return Boolean(currentUser && redirect && !isTokenExpired)
}

const RootRedirect: FC = () => {
  const hasSession = useHasAuthenticatedSession()
  return <Navigate to={hasSession ? '/dashboard' : '/auth'} replace />
}

const AuthRoute: FC = () => {
  const hasSession = useHasAuthenticatedSession()
  return hasSession ? <Navigate to="/dashboard" replace /> : <AuthPage />
}

const ProtectedRoute: FC = () => {
  const hasSession = useHasAuthenticatedSession()
  return hasSession ? <PrivateRoutes /> : <Navigate to="/auth" replace />
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<App />}>
      <Route path="error/*" element={<ErrorsPage />} />
      <Route path="logout" element={<Logout />} />
      {/*
       * This OAuth return is intentionally outside the authentication branch. The popup
       * reads its own code/state, posts them to its opener, and closes.
       */}
      <Route path="google/contacts/callback" element={<GoogleContactsCallback />} />
      <Route index element={<RootRedirect />} />
      <Route path="auth/*" element={<AuthRoute />} />
      <Route path="/*" element={<ProtectedRoute />} />
    </Route>,
  ),
  { basename: BASE_URL },
)

const AppRoutes: FC = () => <RouterProvider router={router} />

export { AppRoutes }

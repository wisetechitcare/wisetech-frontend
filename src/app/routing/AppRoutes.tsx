import { FC, useEffect, useState } from 'react'
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
import { PlatformRoutes } from '../modules/platform/PlatformRoutes'
import { isPlatformConsoleEnabled } from '../modules/platform/platformConsoleFlag'
import { resolveAppHostMode } from '../modules/platform/platformHost'
import { SUPPORT_VIEW_TOKEN_MARKER } from '@services/platformSupport'
import { bootstrapSupportViewIfNeeded } from '../modules/platform/bootstrapSupportView'
import GoogleContactsCallback from '@pages/employee/companies/contacts/components/GoogleContactsCallback'
import ShareRedirect from '@pages/share/ShareRedirect'
import { App } from '../App'
import { Spinner } from '@/ds/ui/spinner'
import { DatePickerTestPage } from '@app/dev-preview/DatePickerTestPage' // TEMP: remove with dev/date-picker route

const { BASE_URL } = import.meta.env

function useHasAuthenticatedSession() {
  const currentUser = useSelector((state: RootState) => state.auth.jwtToken) || getAuth()
  const redirect = useSelector((state: RootState) => state.auth.redirectToDashboard)
    || JSON.parse(localStorage.getItem('redirectToDashboard') || 'false')

  let isTokenExpired = false
  if (currentUser?.token && currentUser.token !== SUPPORT_VIEW_TOKEN_MARKER) {
    try {
      const decodedToken = jwtDecode(currentUser.token)
      if (decodedToken.iat && decodedToken.exp) {
        isTokenExpired = Math.floor(Date.now() / 1000) > decodedToken.exp
      }
    } catch {
      isTokenExpired = true
    }
  }

  return Boolean(currentUser && redirect && !isTokenExpired)
}

/** null = still probing support cookie; true/false = settled. */
function useSupportViewBootstrap(hasSession: boolean): boolean | null {
  const [ready, setReady] = useState<boolean | null>(hasSession ? true : null)
  useEffect(() => {
    if (hasSession) {
      setReady(true)
      return
    }
    let alive = true
    void bootstrapSupportViewIfNeeded()
      .then((session) => {
        if (!alive) return
        setReady(Boolean(session))
      })
      .catch(() => {
        if (alive) setReady(false)
      })
    return () => {
      alive = false
    }
  }, [hasSession])
  return ready
}

function SupportProbeSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <Spinner aria-label="Loading support session" />
    </div>
  )
}

const RootRedirect: FC = () => {
  const hasSession = useHasAuthenticatedSession()
  const supportReady = useSupportViewBootstrap(hasSession)
  if (resolveAppHostMode() === 'platform') return <Navigate to="/platform" replace />
  if (hasSession || supportReady === true) return <Navigate to="/dashboard" replace />
  if (supportReady === null) return <SupportProbeSpinner />
  return <Navigate to="/auth" replace />
}

const AuthRoute: FC = () => {
  const hasSession = useHasAuthenticatedSession()
  const supportReady = useSupportViewBootstrap(hasSession)
  if (resolveAppHostMode() === 'platform') return <Navigate to="/platform/login" replace />
  if (hasSession || supportReady === true) return <Navigate to="/dashboard" replace />
  if (supportReady === null) return <SupportProbeSpinner />
  return <AuthPage />
}

const ProtectedRoute: FC = () => {
  const hasSession = useHasAuthenticatedSession()
  const supportReady = useSupportViewBootstrap(hasSession)
  if (resolveAppHostMode() === 'platform') return <Navigate to="/platform" replace />
  if (hasSession || supportReady === true) return <PrivateRoutes />
  if (supportReady === null) return <SupportProbeSpinner />
  return <Navigate to="/auth" replace />
}

/** Platform console — blocked on tenant-only hosts once VITE_PLATFORM_HOST is set. */
const PlatformConsoleRoute: FC = () => {
  if (!isPlatformConsoleEnabled()) return <Navigate to="/auth" replace />
  if (resolveAppHostMode() === 'tenant') return <Navigate to="/auth" replace />
  return <PlatformRoutes />
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
      {/* A shared document link — opened by clients with no session, so it sits outside the auth branch too. */}
      <Route path="s/:code" element={<ShareRedirect />} />
      <Route index element={<RootRedirect />} />
      <Route path="auth/*" element={<AuthRoute />} />
      {/* Platform console — separate cookie/session; must sit before the tenant catch-all.
          Kill switch: VITE_PLATFORM_CONSOLE_ENABLED=false. Host gate: VITE_PLATFORM_HOST. */}
      <Route path="platform/*" element={<PlatformConsoleRoute />} />
      {/* TEMP: manual DatePicker test page, public. Remove with DatePickerTestPage. */}
      <Route path="dev/date-picker" element={<DatePickerTestPage />} />
      <Route path="/*" element={<ProtectedRoute />} />
    </Route>,
  ),
  { basename: BASE_URL },
)

const AppRoutes: FC = () => <RouterProvider router={router} />

export { AppRoutes }

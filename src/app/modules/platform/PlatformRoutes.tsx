import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '@/ds/ui/spinner'
import PlatformAcceptPage from './PlatformAcceptPage'
import PlatformHomePage from './PlatformHomePage'
import PlatformLoginPage from './PlatformLoginPage'
import PlatformTenantCreatePage from './PlatformTenantCreatePage'
import PlatformTenantDetailPage from './PlatformTenantDetailPage'
import PlatformTenantsPage from './PlatformTenantsPage'
import { PlatformSessionProvider, usePlatformSession } from './PlatformSessionContext'

function PlatformGate({ children }: { children: ReactNode }) {
  const { user, loading } = usePlatformSession()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background" role="status">
        <Spinner aria-label="Loading platform session" />
      </div>
    )
  }
  if (!user) return <Navigate to="/platform/login" replace />
  return children
}

function PlatformLoginGate() {
  const { user, loading } = usePlatformSession()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background" role="status">
        <Spinner aria-label="Loading platform session" />
      </div>
    )
  }
  if (user) return <Navigate to="/platform/tenants" replace />
  return <PlatformLoginPage />
}

/**
 * KAIZNOVA platform console — tenants + operators; accept is public.
 */
export function PlatformRoutes() {
  return (
    <PlatformSessionProvider>
      <Routes>
        <Route path="login" element={<PlatformLoginGate />} />
        <Route path="accept" element={<PlatformAcceptPage />} />
        <Route
          path="tenants/new"
          element={
            <PlatformGate>
              <PlatformTenantCreatePage />
            </PlatformGate>
          }
        />
        <Route
          path="tenants/:id"
          element={
            <PlatformGate>
              <PlatformTenantDetailPage />
            </PlatformGate>
          }
        />
        <Route
          path="tenants"
          element={
            <PlatformGate>
              <PlatformTenantsPage />
            </PlatformGate>
          }
        />
        <Route
          index
          element={
            <PlatformGate>
              <PlatformHomePage />
            </PlatformGate>
          }
        />
        <Route path="*" element={<Navigate to="/platform/tenants" replace />} />
      </Routes>
    </PlatformSessionProvider>
  )
}

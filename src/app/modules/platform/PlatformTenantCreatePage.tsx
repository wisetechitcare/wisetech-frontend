import { Navigate } from 'react-router-dom'

/**
 * Legacy route `/platform/tenants/new` — Create Tenant is now a kit FormDialog
 * wizard on the Tenants list (`PlatformTenantCreateWizard`).
 */
export default function PlatformTenantCreatePage() {
  return <Navigate to="/platform/tenants" replace state={{ openCreateTenant: true }} />
}

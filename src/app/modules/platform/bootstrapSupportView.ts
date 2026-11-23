import { setAuth } from '@app/modules/auth/core/AuthHelpers'
import {
  SUPPORT_VIEW_TOKEN_MARKER,
  fetchActiveSupportSession,
  type ActiveSupportSession,
} from '@services/platformSupport'

/**
 * If a support view-as cookie is active and there is no normal tenant session,
 * seed a minimal auth marker so PrivateRoutes mounts. APIs use the support cookie
 * via protect — this marker is only for the FE router/Redux gate.
 */
export async function bootstrapSupportViewIfNeeded(): Promise<ActiveSupportSession | null> {
  const session = await fetchActiveSupportSession().catch(() => null)
  if (!session?.viewAsUserId) return null

  localStorage.setItem('redirectToDashboard', 'true')
  setAuth({
    id: session.viewAsUserId,
    token: SUPPORT_VIEW_TOKEN_MARKER,
  })
  return session
}

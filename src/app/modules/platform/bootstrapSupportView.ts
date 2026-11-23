import { setAuth } from '@app/modules/auth/core/AuthHelpers'
import { store } from '@redux/store'
import { redirect, saveCurrentUser, saveToken } from '@redux/slices/auth'
import { saveCurrentEmployee } from '@redux/slices/employee'
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions'
import { fetchAuthzCapabilities } from '@redux/slices/authz'
import { fetchCurrentUser } from '@services/users'
import { fetchCurrentEmployeeByUserId } from '@services/employee'
import {
  SUPPORT_VIEW_TOKEN_MARKER,
  fetchActiveSupportSession,
  type ActiveSupportSession,
} from '@services/platformSupport'

/**
 * If a support view-as cookie is active, seed auth + hydrate Redux as the viewed
 * employee (same chain as login). APIs authenticate via the support cookie.
 */
export async function bootstrapSupportViewIfNeeded(): Promise<ActiveSupportSession | null> {
  const session = await fetchActiveSupportSession().catch(() => null)
  if (!session?.viewAsUserId) return null

  localStorage.setItem('redirectToDashboard', 'true')
  setAuth({
    id: session.viewAsUserId,
    token: SUPPORT_VIEW_TOKEN_MARKER,
  })
  store.dispatch(saveToken(SUPPORT_VIEW_TOKEN_MARKER))
  store.dispatch(redirect(true))

  try {
    const { data: currUserRes } = await fetchCurrentUser(session.viewAsUserId)
    if (currUserRes?.user) {
      store.dispatch(saveCurrentUser(currUserRes.user))
    }
    const { data: currEmpRes } = await fetchCurrentEmployeeByUserId(session.viewAsUserId)
    const employee = currEmpRes?.employee
    if (employee) {
      store.dispatch(saveCurrentEmployee({ ...employee, avatar: employee.avatar || '' }))
    }
    await Promise.all([
      store.dispatch(fetchRolesAndPermissions()),
      store.dispatch(fetchAuthzCapabilities()),
    ])
  } catch (err) {
    console.warn('[support-view] Redux hydrate incomplete:', err)
  }

  return session
}

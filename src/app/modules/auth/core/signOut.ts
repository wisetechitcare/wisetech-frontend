import { logout } from '@services/auth'
import { logoutUser } from '@redux/slices/auth'
import type { AppDispatch } from '@redux/store'
import { getAuth, removeAuth } from './AuthHelpers'

/**
 * Sign out — the ONE implementation (the /logout route and the idle timeout use it; the header and aside menus
 * still carry their own copy until the app shell moves to the kit — FUTURE_ENHANCEMENTS.md).
 *
 * Best-effort server logout first, so the session token is revoked on the backend (cookie sessions have no token
 * in localStorage — the backend resolves it from the cookie). Never strands the user: even if the API call fails,
 * local state is cleared and the browser leaves for the sign-in page with a full reload, so no in-memory state
 * of the old session survives.
 */
export async function signOut(dispatch: AppDispatch): Promise<void> {
  const auth = getAuth()
  try {
    await logout(auth?.token, auth?.id)
  } catch (error) {
    console.error('Logout API failed — clearing local session anyway:', error)
  }
  removeAuth()
  localStorage.removeItem('selectedCompany')
  localStorage.removeItem('selectedBranch')
  dispatch(logoutUser())
  window.location.href = '/auth'
}

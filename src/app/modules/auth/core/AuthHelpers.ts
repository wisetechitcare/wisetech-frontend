import {AuthModel} from './_models'

const AUTH_LOCAL_STORAGE_KEY = 'wise_tech_login'

// The JWT lives in an httpOnly cookie set by the backend (XSS-safe) and is
// sent automatically because axios runs with `withCredentials: true`.
// This module-level copy only bridges the current tab's session (header
// fallback) — it is never persisted, so injected scripts can't steal it
// from storage.
let inMemoryToken: string | undefined

const getAuth = () => {
  if (!localStorage) {
    return
  }

  const lsValue: string | null = localStorage.getItem(AUTH_LOCAL_STORAGE_KEY)
  if (!lsValue) {
    return
  }

  try {
    const auth = JSON.parse(lsValue)
    if (auth) {
      return auth
    }
  } catch (error) {
    console.error('AUTH LOCAL STORAGE PARSE ERROR', error)
  }
}

const setAuth = (auth: any) => {
  if (!localStorage) {
    return
  }

  try {
    // TEMPORARY REVERT (prod hotfix): persist the JWT in localStorage so it is
    // sent as an Authorization: Bearer header and survives page reloads. The
    // httpOnly-cookie approach cannot work while the frontend (amplifyapp.com)
    // and API (wisetech-mep.com) are on different registrable domains — the
    // cross-site cookie is blocked by browsers. Restore the cookie-only,
    // token-stripped version once FE + API share a domain (e.g.
    // app.wisetech-mep.com + api.wisetech-mep.com). See [[auth-cookie-migration]].
    inMemoryToken = auth?.token
    const lsValue = JSON.stringify(auth)
    localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, lsValue)
  } catch (error) {
    console.error('AUTH LOCAL STORAGE SAVE ERROR', error)
  }
}

const removeAuth = () => {
  inMemoryToken = undefined
  if (!localStorage) {
    return
  }

  try {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY)
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error)
  }
}

// Scope auth to OUR backend only. Third-party requests that go through the
// global axios (geocoding, maps, …) must never receive our JWT, and their
// 401s must never end the session — an exhausted OpenCage API key used to
// log users out mid-form exactly this way (see SmartLocationPicker.tsx).
const API_BASE = String(import.meta.env.VITE_APP_WISE_TECH_BACKEND || '').replace(/\/+$/, '')

const isOwnApiUrl = (url: unknown): boolean => {
  if (typeof url !== 'string' || url === '') return false
  if (!/^https?:\/\//i.test(url)) return true // relative URL → our origin/dev proxy
  try {
    const targetOrigin = new URL(url).origin
    if (API_BASE && targetOrigin === new URL(API_BASE).origin) return true
    return targetOrigin === window.location.origin
  } catch {
    return false
  }
}

// A 401 ends the client session ONLY when the backend marks it as a session
// failure (contract with protect.ts / checkBlacklistToken / failureHandler).
// A 401 without any meta code still logs out for backward compatibility with
// an older deployed backend. Business 401s carrying other codes do not.
const SESSION_END_CODES = ['AUTH_REQUIRED', 'SESSION_EXPIRED', 'SESSION_INVALID', 'SESSION_REVOKED', 'EXIT_DATE_REACHED']

export const isSessionDeathResponse = (error: any): boolean => {
  const status = error?.response?.status
  const requestUrl: string = error?.config?.url || ''
  const metaCode = error?.response?.data?.meta?.code
  return (
    status === 401 &&
    isOwnApiUrl(requestUrl) &&
    !requestUrl.includes('api/auth/') &&
    (metaCode === undefined || SESSION_END_CODES.includes(metaCode))
  )
}

// End the session exactly once and route to login. The pathname guard stops
// redirect loops when several in-flight requests 401 together or when we are
// already on the auth pages.
export const endSessionAndRedirect = () => {
  removeAuth()
  if (!window.location.pathname.startsWith('/auth')) {
    window.location.href = '/auth'
  }
}

export function setupAxios(axios: any) {
  axios.defaults.headers.Accept = 'application/json'
  // Send the httpOnly auth cookie on every request (the backend CORS config
  // already runs with credentials: true).
  axios.defaults.withCredentials = true
  axios.interceptors.request.use(
    (config: any) => {
      if (isOwnApiUrl(config.url)) {
        // Header fallback: in-memory token (this session) or a token persisted
        // by a pre-cookie release. New sessions rely on the httpOnly cookie.
        const token = inMemoryToken || getAuth()?.token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } else {
        // Third-party host: never send our JWT, and drop credentials so APIs
        // answering with a wildcard CORS origin don't reject the request.
        if (config.headers?.Authorization) {
          delete config.headers.Authorization
        }
        config.withCredentials = false
      }

      return config
    },
    (err: any) => Promise.reject(err)
  )

  axios.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      // Ignore canceled requests (very common when components unmount)
      if (axios.isCancel(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        return Promise.reject(error);
      }

      // Session expired: the httpOnly cookie (or legacy token) no longer
      // authenticates. Without this, an expired session leaves a dead app —
      // every fetch fails silently and nothing routes back to login.
      // Auth endpoints are excluded: a 401 there means wrong credentials,
      // which the login form handles itself. Third-party 401s and business
      // 401s (non-session meta codes) are also excluded.
      if (isSessionDeathResponse(error) && getAuth()) {
        // Check if the error is due to exit date being reached, and store the message
        // for the login page to show after redirect
        const meta = error.response?.data?.meta;
        if (meta?.code === 'EXIT_DATE_REACHED') {
          sessionStorage.setItem('session_exit_date_message', error.response?.data?.detail || 'Your employment has ended');
        }
        endSessionAndRedirect();
        return Promise.reject(error);
      }

      // Determine if the error is a true network failure (no response from server).
      if (!error.response && error.message === 'Network Error') {
        // Always dispatch backend-down — App.tsx does the real internet check
        // (navigator.onLine is unreliable on WiFi with no internet)
        window.dispatchEvent(new Event('backend-down'));
      } else if (error.response && [502, 503, 504].includes(error.response.status)) {
        // Server reachable but returning gateway/service errors — backend is down
        window.dispatchEvent(new Event('backend-down'));
      }

      return Promise.reject(error);
    }
  )}

export {getAuth, setAuth, removeAuth, AUTH_LOCAL_STORAGE_KEY}

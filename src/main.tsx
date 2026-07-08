// ── Node.js polyfills — must be first, before any library that needs Buffer ──
import { Buffer } from 'buffer'
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

import { createRoot } from 'react-dom/client'
// Axios
import axios from 'axios'
import { Chart, registerables } from 'chart.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import { store } from '@redux/store'
import "./main.css"
// Apps
import { MetronicI18nProvider } from './_metronic/i18n/Metronici18n'
import './_metronic/assets/sass/style.react.scss'
import './_metronic/assets/fonticon/fonticon.css'
import './_metronic/assets/keenicons/duotone/style.css'
import './_metronic/assets/keenicons/outline/style.css'
import './_metronic/assets/keenicons/solid/style.css'
// import PauseCircleIcon from "@mui/icons-material/PauseCircle";
/**
 * TIP: Replace this style import with rtl styles to enable rtl mode
 *
 * import './_metronic/assets/css/style.rtl.css'
 **/
import './_metronic/assets/sass/style.scss'
import { AppRoutes } from './app/routing/AppRoutes'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { getAuth, setupAxios } from './app/modules/auth'
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { fetchCurrentUser } from '@services/users'
import { saveCurrentUser } from '@redux/slices/auth'
import { jwtDecode } from "jwt-decode"
// import Notification from "../src/app/pages/employee/tasks/components/notification/Notifications"
// import { useState } from 'react'
/**
 * Creates `axios-mock-adapter` instance for provided `axios` instance, add
 * basic Metronic mocks and returns it.
 *
 * @see https://github.com/ctimmerm/axios-mock-adapter
 */
/**
 * Inject Metronic interceptors for axios.
 *
 * @see https://github.com/axios/axios#interceptors
 */
setupAxios(axios)
Chart.register(...registerables)

// Sensible defaults so React Query caches/dedupes instead of refetching on every mount
// or window focus (the previous default of staleTime:0 made cached data instantly stale).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // treat data fresh for 5 min
      gcTime: 60 * 60 * 1000,          // keep in cache 1 hour
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const ls = localStorage.getItem("wise_tech_login")
const parsedLs = ls ? JSON.parse(ls) : null
const container = document.getElementById('root')
const currentUser = getAuth();

// Sessions started after the httpOnly-cookie migration have no token in
// localStorage — the cookie carries auth and the server validates it on the
// bootstrap calls below. Only legacy (pre-cookie) sessions still persist a
// readable token, so the client-side expiry check applies to them alone.
const hasLegacyToken = Boolean(currentUser?.token);
let isTokenExpired = false;
if (hasLegacyToken) {
  const decodedToken = jwtDecode(currentUser.token);

  if (decodedToken.iat && decodedToken.exp) {
    const currentTime = Math.floor(Date.now() / 1000);
    isTokenExpired = currentTime > decodedToken.exp;
  }
}

const renderApp = () => {
  if (!container) return
  createRoot(container).render(
    <QueryClientProvider client={queryClient}>
      <MetronicI18nProvider>
        <Provider store={store}>
          <AppRoutes />
        </Provider>
      </MetronicI18nProvider>
      <ToastContainer position="top-right" theme="light" />
    </QueryClientProvider>
  )
}

// A session exists when we have a persisted user id. Cookie sessions carry no
// readable token — if the httpOnly cookie is missing/expired, the bootstrap
// request 401s and the catch below routes to login. Legacy sessions are still
// short-circuited client-side when their persisted token has expired.
if (parsedLs?.id && (!hasLegacyToken || !isTokenExpired)) {
  store
    .dispatch(fetchRolesAndPermissions())
    .unwrap()
    .then(async () => {
      const { data: { user } } = await fetchCurrentUser(parsedLs.id)
      store.dispatch(saveCurrentUser({ ...user }))
      renderApp()
    })
    .catch((error) => {
      console.error("Failed to load roles and permissions:", error)
      localStorage.removeItem("wise_tech_login")
      window.location.reload()
    })
} else {
  localStorage.removeItem("wise_tech_login")
  renderApp()
}

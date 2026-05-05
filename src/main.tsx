import { createRoot } from 'react-dom/client'
// Axios
import axios from 'axios'
import { Chart, registerables } from 'chart.js'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
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

const queryClient = new QueryClient()

const ls = localStorage.getItem("wise_tech_login")
const parsedLs = ls ? JSON.parse(ls) : null
const container = document.getElementById('root')
const currentUser = getAuth();

let isTokenExpired = false;
if (currentUser?.token) {
  const decodedToken = jwtDecode(currentUser?.token);

  if (decodedToken.iat && decodedToken.exp) {
    const currentTime = Math.floor(Date.now() / 1000);
    isTokenExpired = currentTime > decodedToken.exp;
  }
}

if (parsedLs?.token && parsedLs?.id && !isTokenExpired) {
  store
    .dispatch(fetchRolesAndPermissions())
    .unwrap()
    .then(async () => {
      const { data: { user } } = await fetchCurrentUser(parsedLs.id)
      store.dispatch(saveCurrentUser({ ...user }))
      if (container) {
        createRoot(container).render(
          <QueryClientProvider client={queryClient}>
            <MetronicI18nProvider>
              <Provider store={store}>
                <AppRoutes />
              </Provider>
            </MetronicI18nProvider>
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
            {/* <Notification
              open={true}
              onClose={() => { return false }}
              title="Task Deleted"
              message="Task deleted successfully!"
              icon={<PauseCircleIcon sx={{ color: "green", fontSize: 48, mr: 1 }} />}
            /> */}
          </QueryClientProvider>
        )
      }
    })
    .catch((error) => {
      console.error("Failed to load roles and permissions:", error);
      localStorage.removeItem("wise_tech_login")
      window.location.reload();
    });
}
else {
  localStorage.removeItem("wise_tech_login")
  if (container) {
    createRoot(container).render(
      <QueryClientProvider client={queryClient}>
        <MetronicI18nProvider>
          <Provider store={store}>
            <AppRoutes />
          </Provider>
        </MetronicI18nProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    )
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import {AuthModel} from './_models'

const AUTH_LOCAL_STORAGE_KEY = 'wise_tech_login'
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
      // You can easily check auth_token expiration also
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
    const lsValue = JSON.stringify(auth)
    localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, lsValue)
  } catch (error) {
    console.error('AUTH LOCAL STORAGE SAVE ERROR', error)
  }
}

const removeAuth = () => {
  if (!localStorage) {
    return
  }

  try {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY)
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error)
  }
}

export function setupAxios(axios: any) {
  axios.defaults.headers.Accept = 'application/json'
  
  // Request Interceptor
  axios.interceptors.request.use(
    (config: {headers: {Authorization: string}}) => {
      const auth = getAuth()
      if (auth && auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`
      }

      return config
    },
    (err: any) => Promise.reject(err)
  )

  // Response Interceptor
  axios.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      // Check for network errors or specific 5xx server errors
      if (
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error' ||
        (error.response && [500, 502, 503, 504].includes(error.response.status))
      ) {
        window.dispatchEvent(new Event('backend-down'));
      }
      return Promise.reject(error);
    }
  )
}

export {getAuth, setAuth, removeAuth, AUTH_LOCAL_STORAGE_KEY}

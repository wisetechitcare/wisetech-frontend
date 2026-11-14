import {Navigate, Route, Routes} from 'react-router-dom'
import {ForgotPassword} from './components/ForgotPassword'
import Login from './components/Login'
import ResetPassword from './components/ResetPassword'
import InactiveEmployee from './components/InactiveEmployee'

/**
 * The sign-in pages — every one on the kit's Auth Layout (via AuthScreen).
 * /auth/registration is gone: it was the Metronic demo sign-up form, posting to the theme vendor's API.
 */
const AuthPage = () => (
  <Routes>
    <Route>
      <Route path='login' element={<Login />} />
      <Route path='forgot-password' element={<ForgotPassword />} />
      <Route path='reset-password' element={<ResetPassword />} />
      <Route path='inactive' element={<InactiveEmployee />} />
      <Route index element={<Login />} />
      {/* Any other /auth/... (an old /auth/registration bookmark, a typo) goes to Sign In, never a blank page. */}
      <Route path='*' element={<Navigate to='/auth/login' replace />} />
    </Route>
  </Routes>
)

export {AuthPage}

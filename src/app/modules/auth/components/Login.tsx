import { useEffect, useRef, useState } from 'react'
import * as Yup from 'yup'
import { useDispatch, useSelector } from 'react-redux'
import { useFormik } from 'formik'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/ds/ui/alert'
import { Button, buttonVariants } from '@/ds/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { CircleAlert, KeyRound, Lock, LogIn, Mail, TriangleAlert } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ds/ui/input-group'
import { PasswordField } from '@/ds/patterns/password-field'
import { login } from '@services/auth'
import { fetchCurrentUser } from '@services/users'
import { fetchCurrentEmployeeByUserId } from '@services/employee'
import { saveCurrentEmployee } from '@redux/slices/employee'
import { redirect, saveCurrentUser, saveToken } from '@redux/slices/auth'
import { RootState } from '@redux/store'
import { setAuth } from '../core/AuthHelpers'
import { AuthScreen } from '../AuthScreen'

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Wrong email format')
    .min(3, 'Minimum 3 symbols')
    .max(50, 'Maximum 50 symbols')
    .required('Email is required'),
  password: Yup.string()
    .min(3, 'Minimum 3 symbols')
    .max(50, 'Maximum 50 symbols')
    .required('Password is required'),
})

/**
 * Sign In, on the kit's Auth Layout (via AuthScreen). The auth flow is unchanged from the previous Login:
 * login() → save token → setAuth → current user → current employee (real photo only) → redirect flag;
 * ACCOUNT_INACTIVE goes to /auth/inactive with the server's message; any other failure shows the server's detail.
 *
 * Sign In is never disabled for an invalid form — that took it out of the tab order and made Enter do nothing.
 * Submitting validates, shows the errors and focuses the first field that needs attention.
 */
export default function Login() {
  const [loading, setLoading] = useState(false)
  // A message carried over from a session that ended (e.g. the exit date passed) — shown once.
  const [sessionNotice] = useState(() => {
    const message = sessionStorage.getItem('session_exit_date_message')
    if (message) sessionStorage.removeItem('session_exit_date_message')
    return message
  })
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const currEmployee = useSelector((state: RootState) => state.employee.currentEmployee)

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values, { setStatus, setSubmitting }) => {
      setLoading(true)
      setStatus(undefined)
      try {
        const { data: loginRes } = await login(values.email, values.password)
        dispatch(saveToken(loginRes.token))
        setAuth(loginRes)
        const { data: currUserRes } = await fetchCurrentUser(loginRes.id)
        dispatch(saveCurrentUser(currUserRes.user))
        if (!currEmployee.id) {
          const { data: currEmpRes } = await fetchCurrentEmployeeByUserId(currUserRes.user.id)
          const { employee } = currEmpRes
          // The real photo only; no photo renders initials (SmartAvatar), never a gender cartoon.
          dispatch(saveCurrentEmployee({ ...employee, avatar: employee.avatar || '' }))
        }
        dispatch(redirect(true))
        localStorage.setItem('redirectToDashboard', 'true')
        setLoading(false)
      } catch (error: any) {
        const data = error?.response?.data
        setSubmitting(false)
        setLoading(false)
        // Inactive / exited employee — the backend flags this so we can send them to the dedicated
        // "connect with HR" page instead of an inline error.
        if (data?.meta?.code === 'ACCOUNT_INACTIVE') {
          navigate('/auth/inactive', { state: { message: data?.detail } })
          return
        }
        setStatus(data?.detail || 'We could not sign you in. Please try again.')
      }
    },
  })

  // After a submit that did not validate, focus the first field that needs attention — once per attempt, when
  // validation has finished (Formik counts the attempt before its errors exist).
  const focusedAttempt = useRef(0)
  useEffect(() => {
    if (formik.submitCount === focusedAttempt.current || formik.isSubmitting) return
    if (!formik.errors.email && !formik.errors.password) return
    focusedAttempt.current = formik.submitCount
    if (formik.errors.email) emailRef.current?.focus()
    else passwordRef.current?.focus()
  }, [formik.submitCount, formik.isSubmitting, formik.errors.email, formik.errors.password])

  const emailError = formik.touched.email ? formik.errors.email : undefined
  const passwordError = formik.touched.password ? formik.errors.password : undefined

  return (
    <AuthScreen title="Welcome back" description="One sign-in for your people, projects and payroll.">
      <form className="grid gap-5" onSubmit={formik.handleSubmit} noValidate>
        {sessionNotice && (
          <Alert variant="warning">
            <TriangleAlert aria-hidden />
            <AlertDescription>{sessionNotice}</AlertDescription>
          </Alert>
        )}
        {formik.status && (
          <Alert variant="danger">
            <CircleAlert aria-hidden />
            <AlertDescription>{formik.status}</AlertDescription>
          </Alert>
        )}

        <FieldGroup className="gap-5">
          <Field data-invalid={emailError ? true : undefined}>
            <FieldLabel htmlFor="signin-email">Email</FieldLabel>
            <InputGroup size="lg">
              <InputGroupAddon aria-hidden="true">
                <Mail />
              </InputGroupAddon>
              <InputGroupInput
                id="signin-email"
                required
                size="lg"
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="username"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? 'signin-email-error' : undefined}
                {...formik.getFieldProps('email')}
              />
            </InputGroup>
            {emailError && <FieldError id="signin-email-error">{emailError}</FieldError>}
          </Field>

          <Field data-invalid={passwordError ? true : undefined}>
            <FieldLabel htmlFor="signin-password">Password</FieldLabel>
            <PasswordField
              id="signin-password"
              required
              size="lg"
              leadingIcon={<Lock />}
              inputRef={passwordRef}
              name="password"
              autoComplete="current-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'signin-password-error' : undefined}
            />
            {passwordError && <FieldError id="signin-password-error">{passwordError}</FieldError>}
          </Field>
        </FieldGroup>

        {/* Red (the rose hue's readable ink, user decision 2026-11-14) — the colour of the page it opens. */}
        <Link
          data-slot="button"
          to="/auth/forgot-password"
          className={buttonVariants({ variant: 'link', className: 'justify-self-end px-0 text-tone-rose-foreground' })}
        >
          <KeyRound aria-hidden="true" />
          Forgot password?
        </Link>

        <Button type="submit" size="lg" glow className="w-full" loading={loading} disabled={formik.isSubmitting}>
          {!loading && <LogIn data-icon="inline-start" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </AuthScreen>
  )
}

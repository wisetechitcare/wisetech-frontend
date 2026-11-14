import { useEffect, useRef } from 'react'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { useDispatch } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleAlert, KeyRound, Lock, MailPlus } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Button, buttonVariants } from '@/ds/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { PasswordField } from '@/ds/patterns/password-field'
import { resetPassword } from '@services/auth'
import { logoutUser } from '@redux/slices/auth'
import { removeAuth } from '../core/AuthHelpers'
import { AuthScreen } from '../AuthScreen'

const resetPasswordSchema = Yup.object().shape({
  password: Yup.string().required('Password is required').min(8, 'Password should have atleast 8 characters'),
  confirmPassword: Yup.string()
    .required('Confirm your password field is required')
    .min(8, 'Password should have atleast 8 characters')
    .oneOf([Yup.ref('password')], 'Both password should match'),
})

const FAILED_FALLBACK = 'Could not reset your password. The link may be invalid or expired — please request a new one.'

/**
 * Reset Password (the emailed link, /auth/reset-password?token=…), on the kit's Auth Layout via AuthScreen.
 *
 * Behaviour kept from the previous page: the same rules (8+ characters, both must match); on success the local
 * session is cleared and it returns to Sign In; a failure shows the server's reason (expired / invalid link…).
 * New: a link without a token says so up front, with the way to get a fresh one, instead of failing on submit.
 * Continue is never disabled for an invalid form — submitting validates and focuses the first field to fix.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const resetToken = searchParams.get('token') || ''
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const formik = useFormik({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values, { setStatus }) => {
      setStatus(undefined)
      try {
        await resetPassword(values.password, values.confirmPassword, resetToken)
        removeAuth()
        dispatch(logoutUser())
        navigate('/auth/')
      } catch (error: any) {
        // The real reason (expired / invalid token, server error…), never a silent spinner.
        setStatus(error?.response?.data?.detail || error?.response?.data?.message || FAILED_FALLBACK)
      }
    },
  })

  // After a submit that did not validate, focus the first field that needs attention — once per attempt.
  const focusedAttempt = useRef(0)
  useEffect(() => {
    if (formik.submitCount === focusedAttempt.current || formik.isSubmitting) return
    if (!formik.errors.password && !formik.errors.confirmPassword) return
    focusedAttempt.current = formik.submitCount
    if (formik.errors.password) passwordRef.current?.focus()
    else confirmRef.current?.focus()
  }, [formik.submitCount, formik.isSubmitting, formik.errors.password, formik.errors.confirmPassword])

  const passwordError = formik.touched.password ? formik.errors.password : undefined
  const confirmError = formik.touched.confirmPassword ? formik.errors.confirmPassword : undefined

  const backToSignIn = (
    <Link data-slot="button" to="/auth/login" className={buttonVariants({ variant: 'link', className: 'mx-auto px-0' })}>
      <ArrowLeft aria-hidden="true" />
      Back to Sign In
    </Link>
  )

  if (!resetToken) {
    return (
      <AuthScreen title="Reset Password" footer={backToSignIn}>
        <div className="grid gap-5">
          <Alert variant="warning">
            <CircleAlert aria-hidden />
            <AlertTitle>This link is incomplete</AlertTitle>
            <AlertDescription>
              Open the reset link from your email again, or request a new one.
            </AlertDescription>
          </Alert>
          <Link data-slot="button" to="/auth/forgot-password" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            <MailPlus data-icon="inline-start" />
            Request a New Link
          </Link>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen title="Reset Password" description="Choose a new password — at least 8 characters." footer={backToSignIn}>
      <form className="grid gap-5" onSubmit={formik.handleSubmit} noValidate>
        {formik.status && (
          <Alert variant="danger">
            <AlertDescription>{formik.status}</AlertDescription>
          </Alert>
        )}

        <FieldGroup className="gap-5">
          <Field data-invalid={passwordError ? true : undefined}>
            <FieldLabel htmlFor="reset-password">New Password</FieldLabel>
            <PasswordField
              id="reset-password"
              size="lg"
              leadingIcon={<Lock />}
              inputRef={passwordRef}
              name="password"
              autoComplete="new-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'reset-password-error' : undefined}
            />
            {passwordError && <FieldError id="reset-password-error">{passwordError}</FieldError>}
          </Field>

          <Field data-invalid={confirmError ? true : undefined}>
            <FieldLabel htmlFor="reset-confirm-password">Confirm Password</FieldLabel>
            <PasswordField
              id="reset-confirm-password"
              size="lg"
              leadingIcon={<Lock />}
              inputRef={confirmRef}
              name="confirmPassword"
              autoComplete="new-password"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              invalid={Boolean(confirmError)}
              aria-describedby={confirmError ? 'reset-confirm-password-error' : undefined}
            />
            {confirmError && <FieldError id="reset-confirm-password-error">{confirmError}</FieldError>}
          </Field>
        </FieldGroup>

        <Button type="submit" size="lg" glow className="w-full" loading={formik.isSubmitting} disabled={formik.isSubmitting}>
          {!formik.isSubmitting && <KeyRound data-icon="inline-start" />}
          {formik.isSubmitting ? 'Saving…' : 'Reset Password'}
        </Button>
      </form>
    </AuthScreen>
  )
}

export { ResetPassword }

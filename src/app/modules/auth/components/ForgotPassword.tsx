import { useEffect, useRef, useState } from 'react'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/ds/ui/alert'
import { Button, buttonVariants } from '@/ds/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { forgotPassword } from '@services/auth'
import { AuthScreen } from '../AuthScreen'

const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Wrong email format')
    .min(3, 'Minimum 3 symbols')
    .max(50, 'Maximum 50 symbols')
    .required('Email is required'),
})

/** After a request, Send waits this long before another one (kept from the previous page). */
const RESEND_COOLDOWN_MS = 10_000

const SENT_FALLBACK = 'If an account exists for that email, a password reset link has been sent to it.'
const FAILED_FALLBACK = 'Sorry, looks like there are some errors detected, please try again.'

/**
 * Forgot Password, on the kit's Auth Layout (via AuthScreen), the same frame as Sign In.
 *
 * The server answers the same way whether or not the address is an account, and never with a session: the
 * emailed link is the only way forward. (It used to return a token for any address, which this page then signed
 * in with — anyone could become anyone.)
 *
 * Send is never disabled for an invalid form (submitting validates and focuses the field); it is disabled only
 * while a request is in flight and for a short cooldown after one, so the link isn't requested twice by accident.
 */
export function ForgotPassword() {
  const [result, setResult] = useState<{ kind: 'sent' | 'failed'; message: string } | null>(null)
  const [coolingDown, setCoolingDown] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const cooldown = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(cooldown.current), [])

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values) => {
      setResult(null)
      setCoolingDown(true)
      window.clearTimeout(cooldown.current)
      cooldown.current = window.setTimeout(() => setCoolingDown(false), RESEND_COOLDOWN_MS)
      try {
        const response = await forgotPassword(values.email)
        setResult({ kind: 'sent', message: response?.message || SENT_FALLBACK })
      } catch (error: any) {
        setResult({ kind: 'failed', message: error?.response?.data?.detail || FAILED_FALLBACK })
      }
    },
  })

  // After a submit that did not validate, focus the email field — once per attempt, when validation has finished.
  const focusedAttempt = useRef(0)
  useEffect(() => {
    if (formik.submitCount === focusedAttempt.current || formik.isSubmitting || !formik.errors.email) return
    focusedAttempt.current = formik.submitCount
    emailRef.current?.focus()
  }, [formik.submitCount, formik.isSubmitting, formik.errors.email])

  const emailError = formik.touched.email ? formik.errors.email : undefined

  return (
    <AuthScreen
      title="Forgot Password"
      titleTone="rose"
      description="Enter your work email and we'll send you a link to reset your password."
      footer={
        <Link to="/auth/login" className={buttonVariants({ variant: 'link', className: 'mx-auto px-0' })}>
          <ArrowLeft aria-hidden="true" />
          Back to Sign In
        </Link>
      }
    >
      <form className="grid gap-5" onSubmit={formik.handleSubmit} noValidate>
        {result && (
          <Alert variant={result.kind === 'sent' ? 'info' : 'danger'}>
            <AlertDescription role={result.kind === 'sent' ? 'status' : 'alert'}>{result.message}</AlertDescription>
          </Alert>
        )}

        <FieldGroup className="gap-5">
          <Field data-invalid={emailError ? true : undefined}>
            <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
            <Input
              id="forgot-email"
              size="lg"
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="username"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'forgot-email-error' : undefined}
              {...formik.getFieldProps('email')}
            />
            {emailError && <FieldError id="forgot-email-error">{emailError}</FieldError>}
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          glow
          className="w-full"
          loading={formik.isSubmitting}
          disabled={formik.isSubmitting || coolingDown}
        >
          {formik.isSubmitting ? 'Sending…' : 'Send Reset Link'}
        </Button>
      </form>
    </AuthScreen>
  )
}

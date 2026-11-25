import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/ds/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { PasswordField } from '@/ds/patterns/password-field'
import { Spinner } from '@/ds/ui/spinner'
import { platformResetPassword } from '@services/platformAuth'
import { PlatformAuthScreen } from './PlatformAuthScreen'

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
}

export default function PlatformResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token')?.trim() ?? '', [params])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError('This reset link is missing a token. Request a new one from the sign-in page.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await platformResetPassword(token, password, confirm)
      navigate('/platform/login', { replace: true })
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PlatformAuthScreen
      title="Choose A New Password"
      description="After you save, every platform session is signed out. Sign in again with MFA."
    >
      {error && (
        <Alert variant="danger" className="mb-6">
          <AlertTitle>Could Not Reset</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form className="grid gap-6" onSubmit={onSubmit} noValidate>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="platform-reset-password">New Password</FieldLabel>
            <PasswordField
              id="platform-reset-password"
              size="lg"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="platform-reset-confirm">Confirm Password</FieldLabel>
            <PasswordField
              id="platform-reset-confirm"
              size="lg"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
          Save Password
        </Button>
        <Link to="/platform/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
          Back To Sign In
        </Link>
      </form>
    </PlatformAuthScreen>
  )
}

import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/ds/ui/button'
import { Field, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { platformForgotPassword } from '@services/platformAuth'
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

export default function PlatformForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const msg = await platformForgotPassword(email.trim())
      setDoneMessage(msg)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PlatformAuthScreen
      title="Reset Platform Password"
      description="Enter your operator email. If an account exists, we will send a reset link."
      footer={
        <Button
          variant="link"
          size="sm"
          className="w-full"
          nativeButton={false}
          render={<Link to="/platform/login" />}
        >
          Back To Sign In
        </Button>
      }
    >
      {error && (
        <Alert variant="danger" className="mb-6">
          <AlertTitle>Could Not Continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {doneMessage ? (
        <div className="grid gap-6">
          <Alert>
            <AlertTitle>Check Your Email</AlertTitle>
            <AlertDescription>{doneMessage}</AlertDescription>
          </Alert>
          <Button size="lg" className="w-full" nativeButton={false} render={<Link to="/platform/login" />}>
            Back To Sign In
          </Button>
        </div>
      ) : (
        <form className="grid gap-6" onSubmit={onSubmit} noValidate>
          <Field>
            <FieldLabel htmlFor="platform-forgot-email">Email</FieldLabel>
            <Input
              id="platform-forgot-email"
              size="lg"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            Send Reset Link
          </Button>
        </form>
      )}
    </PlatformAuthScreen>
  )
}

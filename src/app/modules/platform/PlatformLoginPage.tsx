import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/ds/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { PasswordField } from '@/ds/patterns/password-field'
import { Spinner } from '@/ds/ui/spinner'
import {
  platformLogin,
  platformMfaEnrollConfirm,
  platformMfaEnrollStart,
  platformMfaVerify,
  type PlatformLoginStep,
} from '@services/platformAuth'
import { PlatformAuthScreen } from './PlatformAuthScreen'
import { usePlatformSession } from './PlatformSessionContext'

type Phase = 'password' | PlatformLoginStep

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
}

export default function PlatformLoginPage() {
  const navigate = useNavigate()
  const { setUser } = usePlatformSession()

  const [phase, setPhase] = useState<Phase>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [manualSecret, setManualSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { step } = await platformLogin(email.trim(), password)
      setPassword('')
      if (step === 'enroll') {
        const enrollment = await platformMfaEnrollStart()
        setQrDataUrl(enrollment.qrDataUrl)
        setManualSecret(enrollment.manualSecret)
        setPhase('enroll')
      } else {
        setPhase('mfa')
      }
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onEnrollConfirm(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await platformMfaEnrollConfirm(code.trim())
      setUser(user)
      navigate('/platform/tenants', { replace: true })
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onMfa(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await platformMfaVerify(code.trim())
      setUser(user)
      navigate('/platform/tenants', { replace: true })
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const title = phase === 'password' ? 'Platform Sign In' : phase === 'enroll' ? 'Set Up Authenticator' : 'Authenticator Code'
  const description =
    phase === 'password'
      ? 'KAIZNOVA operators only. Use your platform email.'
      : phase === 'enroll'
        ? 'Scan the QR code, then enter a 6-digit code to finish.'
        : 'Enter the 6-digit code from your authenticator app.'

  return (
    <PlatformAuthScreen title={title} description={description}>
      {error && (
        <Alert variant="danger" className="mb-6">
          <AlertTitle>Could Not Continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {phase === 'password' && (
        <form className="grid gap-6" onSubmit={onPassword} noValidate>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="platform-email">Email</FieldLabel>
              <Input
                id="platform-email"
                size="lg"
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="platform-password">Password</FieldLabel>
              <PasswordField
                id="platform-password"
                size="lg"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            Continue
          </Button>
        </form>
      )}

      {phase === 'enroll' && (
        <form className="grid gap-6" onSubmit={onEnrollConfirm} noValidate>
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt="Authenticator QR code" className="size-[220px] rounded-md border border-border" />
              {manualSecret && (
                <p className="text-center text-sm text-muted-foreground">
                  Or enter this key manually:{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{manualSecret}</code>
                </p>
              )}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="platform-enroll-code">Authenticator Code</FieldLabel>
            <Input
              id="platform-enroll-code"
              size="lg"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            Activate And Sign In
          </Button>
        </form>
      )}

      {phase === 'mfa' && (
        <form className="grid gap-6" onSubmit={onMfa} noValidate>
          <Field>
            <FieldLabel htmlFor="platform-mfa-code">Authenticator Code</FieldLabel>
            <Input
              id="platform-mfa-code"
              size="lg"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            Sign In
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setPhase('password')
              setCode('')
              setError(null)
            }}
          >
            Back To Email
          </Button>
        </form>
      )}
    </PlatformAuthScreen>
  )
}

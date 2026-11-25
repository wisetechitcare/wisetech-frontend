import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

type Phase = 'password' | PlatformLoginStep | 'awaiting_next' | 'recovery'

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
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
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
      if (phase === 'awaiting_next') {
        const result = await platformMfaEnrollConfirm('', code.trim())
        if ('stage' in result && result.stage === 'awaiting_next') {
          setError('Enter the next code from your authenticator.')
          return
        }
        if ('recoveryCodes' in result && result.recoveryCodes?.length) {
          setRecoveryCodes(result.recoveryCodes)
          setUser({
            id: result.id,
            email: result.email,
            displayName: result.displayName,
            platformRole: result.platformRole,
          })
          setPhase('recovery')
          setCode('')
          return
        }
        setUser(result as { id: string; email: string; displayName: string; platformRole: string })
        navigate('/platform/tenants', { replace: true })
        return
      }

      const result = await platformMfaEnrollConfirm(code.trim())
      if ('stage' in result && result.stage === 'awaiting_next') {
        setPhase('awaiting_next')
        setCode('')
        return
      }
      if ('recoveryCodes' in result && result.recoveryCodes?.length) {
        setRecoveryCodes(result.recoveryCodes)
        setUser({
          id: result.id,
          email: result.email,
          displayName: result.displayName,
          platformRole: result.platformRole,
        })
        setPhase('recovery')
        setCode('')
        return
      }
      setUser(result as { id: string; email: string; displayName: string; platformRole: string })
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

  const title =
    phase === 'password'
      ? 'Platform Sign In'
      : phase === 'enroll' || phase === 'awaiting_next'
        ? 'Set Up Authenticator'
        : phase === 'recovery'
          ? 'Save Recovery Codes'
          : 'Authenticator Code'

  const description =
    phase === 'password'
      ? 'KAIZNOVA operators only. Use your platform email.'
      : phase === 'enroll'
        ? 'Scan the QR code, then enter the current 6-digit code.'
        : phase === 'awaiting_next'
          ? 'Wait for your authenticator to refresh, then enter the next code.'
          : phase === 'recovery'
            ? 'Store these codes somewhere safe. They are shown only once.'
            : 'Enter the 6-digit code from your authenticator app, or a recovery code.'

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
              <p className="mt-2 text-sm">
                <Link to="/platform/forgot-password" className="text-primary underline-offset-4 hover:underline">
                  Forgot password?
                </Link>
              </p>
            </Field>
          </FieldGroup>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            Continue
          </Button>
        </form>
      )}

      {(phase === 'enroll' || phase === 'awaiting_next') && (
        <form className="grid gap-6" onSubmit={onEnrollConfirm} noValidate>
          {phase === 'enroll' && qrDataUrl && (
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
            <FieldLabel htmlFor="platform-enroll-code">
              {phase === 'awaiting_next' ? 'Next Authenticator Code' : 'Authenticator Code'}
            </FieldLabel>
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
            {phase === 'awaiting_next' ? 'Confirm And Finish' : 'Continue'}
          </Button>
        </form>
      )}

      {phase === 'recovery' && (
        <div className="grid gap-6">
          <Alert>
            <AlertTitle>Shown Once</AlertTitle>
            <AlertDescription>
              Copy or download these codes before continuing. Each code signs you in once if you lose your authenticator.
            </AlertDescription>
          </Alert>
          <ul className="grid gap-2 rounded-md border border-border bg-muted/40 p-4 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(recoveryCodes.join('\n'))}
            >
              Copy Codes
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1"
              onClick={() => navigate('/platform/tenants', { replace: true })}
            >
              Continue To Platform
            </Button>
          </div>
        </div>
      )}

      {phase === 'mfa' && (
        <form className="grid gap-6" onSubmit={onMfa} noValidate>
          <Field>
            <FieldLabel htmlFor="platform-mfa-code">Authenticator Code</FieldLabel>
            <Input
              id="platform-mfa-code"
              size="lg"
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

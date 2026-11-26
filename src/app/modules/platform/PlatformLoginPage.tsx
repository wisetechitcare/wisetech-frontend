import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, buttonVariants } from '@/ds/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/ds/ui/field'
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
import { PlatformMfaEnrollForm } from './PlatformMfaEnrollForm'
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
  const [searchParams] = useSearchParams()
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

  /** After self-disable MFA, Settings sends here with setup cookie + ?reenroll=1. */
  useEffect(() => {
    if (searchParams.get('reenroll') !== '1') return
    let cancelled = false
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const enrollment = await platformMfaEnrollStart()
        if (cancelled) return
        setQrDataUrl(enrollment.qrDataUrl)
        setManualSecret(enrollment.manualSecret)
        setPhase('enroll')
      } catch (err) {
        if (!cancelled) setError(errMessage(err))
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams])

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

  async function onEnrollConfirm(entered: string) {
    setError(null)
    setBusy(true)
    try {
      if (phase === 'awaiting_next') {
        const result = await platformMfaEnrollConfirm('', entered)
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
          return
        }
        setUser(result as { id: string; email: string; displayName: string; platformRole: string })
        navigate('/platform/tenants', { replace: true })
        return
      }

      const result = await platformMfaEnrollConfirm(entered)
      if ('stage' in result && result.stage === 'awaiting_next') {
        setPhase('awaiting_next')
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
      const result = await platformMfaVerify(code.trim())
      setCode('')
      if ('step' in result && result.step === 'enroll') {
        const enrollment = await platformMfaEnrollStart()
        setQrDataUrl(enrollment.qrDataUrl)
        setManualSecret(enrollment.manualSecret)
        setPhase('enroll')
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
        ? 'Scan the QR code, then verify two consecutive authenticator codes.'
        : phase === 'awaiting_next'
          ? 'Wait for your authenticator to refresh, then enter the next code.'
          : phase === 'recovery'
            ? 'Store these codes somewhere safe. They are shown only once — we cannot show them again.'
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
              <p className="mt-2 text-sm">
                <Link
                  data-slot="button"
                  to="/platform/forgot-password"
                  className={buttonVariants({ variant: 'link', size: 'sm', className: 'h-auto px-0' })}
                >
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
        <PlatformMfaEnrollForm
          stage={phase}
          qrDataUrl={qrDataUrl}
          manualSecret={manualSecret}
          busy={busy}
          onConfirm={onEnrollConfirm}
          onBackToFirst={
            phase === 'awaiting_next'
              ? () => {
                  setError(null)
                  setPhase('enroll')
                }
              : undefined
          }
        />
      )}

      {phase === 'recovery' && (
        <div className="grid gap-6">
          <Alert>
            <AlertTitle>Shown Once</AlertTitle>
            <AlertDescription>
              Copy these now. If you lose your authenticator, one unused code gets you back in and forces a new
              authenticator setup. They are not stored in clear text — we cannot resend them later.
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
            <FieldLabel htmlFor="platform-mfa-code">Authenticator Or Recovery Code</FieldLabel>
            <Input
              id="platform-mfa-code"
              size="lg"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <FieldDescription>
              Recovery codes were shown once when you enrolled MFA (saved offline / password manager). Using one
              clears MFA and requires a new authenticator. Lost both phone and codes? Ask a platform ADMIN to use
              Reset Authenticator on Operators.
            </FieldDescription>
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

import { FormEvent, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/ds/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { PasswordField } from '@/ds/patterns/password-field'
import { Spinner } from '@/ds/ui/spinner'
import {
  acceptPlatformInvite,
  platformMfaEnrollConfirm,
  platformMfaEnrollStart,
} from '@services/platformAuth'
import { PlatformAuthScreen } from './PlatformAuthScreen'
import { usePlatformSession } from './PlatformSessionContext'

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
}

type Phase = 'password' | 'enroll'

/** Public accept invite — set password, then MFA enrol (bridge cookie from accept). */
export default function PlatformAcceptPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token')?.trim() ?? '', [params])
  const { setUser } = usePlatformSession()

  const [phase, setPhase] = useState<Phase>('password')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [manualSecret, setManualSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError('This invite link is missing a token. Ask an admin to resend the invite.')
      return
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await acceptPlatformInvite(token, password)
      setPassword('')
      setConfirm('')
      const enrollment = await platformMfaEnrollStart()
      setQrDataUrl(enrollment.qrDataUrl)
      setManualSecret(enrollment.manualSecret)
      setPhase('enroll')
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onEnroll(e: FormEvent) {
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

  const title = phase === 'password' ? 'Accept Platform Invite' : 'Set Up Authenticator'
  const description =
    phase === 'password'
      ? 'Choose a password for your KAIZNOVA platform account. You will enrol MFA next.'
      : 'Scan the QR code, then enter a 6-digit code to finish.'

  return (
    <PlatformAuthScreen title={title} description={description}>
      {error ? (
        <Alert variant="danger" className="mb-6">
          <AlertTitle>Could Not Continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!token && phase === 'password' ? (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>Invalid Link</AlertTitle>
          <AlertDescription>Ask a platform admin to resend your invite.</AlertDescription>
        </Alert>
      ) : null}

      {phase === 'password' ? (
        <form className="grid gap-6" onSubmit={onPassword} noValidate>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="accept-password">Password</FieldLabel>
              <PasswordField
                id="accept-password"
                size="lg"
                name="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="accept-confirm">Confirm Password</FieldLabel>
              <PasswordField
                id="accept-confirm"
                size="lg"
                name="confirm"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" size="lg" className="w-full" disabled={busy || !token}>
            {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            Continue
          </Button>
        </form>
      ) : (
        <form className="grid gap-6" onSubmit={onEnroll} noValidate>
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt="Authenticator QR code" className="size-[220px] rounded-md border border-border" />
              {manualSecret ? (
                <p className="text-center text-sm text-muted-foreground">
                  Or enter this key manually:{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{manualSecret}</code>
                </p>
              ) : null}
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="accept-enroll-code">Authenticator Code</FieldLabel>
            <Input
              id="accept-enroll-code"
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
    </PlatformAuthScreen>
  )
}

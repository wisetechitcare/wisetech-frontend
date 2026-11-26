import { FormEvent, useState } from 'react'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { Stepper } from '@/ds/patterns/stepper'
import { cn } from '@/ds/lib/utils'

const ENROLL_STEPS = [
  { label: 'First code', description: 'Current TOTP' },
  { label: 'Next code', description: 'After refresh' },
] as const

/**
 * Two-stage TOTP enroll — same contract as system MFA PIN (`DeveloperMfaEnrollForm`):
 * first code → awaiting_next → consecutive next code → recovery codes.
 */
export function PlatformMfaEnrollForm({
  stage,
  qrDataUrl,
  manualSecret,
  busy,
  onConfirm,
  onBackToFirst,
}: {
  stage: 'enroll' | 'awaiting_next'
  qrDataUrl: string | null
  manualSecret: string | null
  busy: boolean
  onConfirm: (code: string) => Promise<void>
  /** Optional — return to first-code step after a failed second code. */
  onBackToFirst?: () => void
}) {
  const [code, setCode] = useState('')
  const isNext = stage === 'awaiting_next'
  const activeStep = isNext ? 1 : 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    await onConfirm(trimmed)
    setCode('')
  }

  return (
    <form className="grid gap-6" onSubmit={(e) => void onSubmit(e)} noValidate>
      <Stepper
        steps={[...ENROLL_STEPS]}
        activeStep={activeStep}
        completed={isNext ? { 0: true } : {}}
      />

      {qrDataUrl ? (
        <div
          className={cn(
            'flex flex-col items-center gap-3 transition-opacity',
            isNext && 'opacity-70',
          )}
        >
          <img
            src={qrDataUrl}
            alt="Authenticator QR code"
            className="w-full max-w-[220px] rounded-md border border-border"
          />
          {!isNext && manualSecret ? (
            <p className="text-center text-sm text-muted-foreground">
              Or enter this key manually:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                {manualSecret}
              </code>
            </p>
          ) : null}
        </div>
      ) : null}

      {isNext ? (
        <Alert>
          <AlertTitle>First Code Accepted</AlertTitle>
          <AlertDescription>
            Wait until your authenticator shows a <strong>new</strong> 6-digit code (~30 seconds), then enter
            that next code. Reusing the first code will not work.
          </AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor="platform-enroll-code">
          {isNext ? 'Next Authenticator Code' : 'First Authenticator Code'}
        </FieldLabel>
        <Input
          id="platform-enroll-code"
          size="lg"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        <FieldDescription>
          {isNext
            ? 'Must be the consecutive code after the first — wait for the app to refresh.'
            : 'Setup needs two consecutive codes (same as system MFA). Enter the current code first.'}
        </FieldDescription>
      </Field>

      <div className="grid gap-2">
        <Button type="submit" size="lg" className="w-full" disabled={busy || code.trim().length < 6}>
          {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
          {isNext ? 'Verify And Enable MFA' : 'Verify First Code'}
        </Button>
        {isNext && onBackToFirst ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setCode('')
              onBackToFirst()
            }}
          >
            Back To First Code
          </Button>
        ) : null}
      </div>
    </form>
  )
}

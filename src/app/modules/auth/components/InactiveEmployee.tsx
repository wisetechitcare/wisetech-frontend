import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, UserX } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Button } from '@/ds/ui/button'
import { AuthScreen } from '../AuthScreen'

const DEFAULT_MESSAGE =
  "You're currently marked as an inactive employee. Please connect with HR to restore your access."

/**
 * Account Inactive, on the kit's Auth Layout via AuthScreen. Shown when an inactive / exited employee tries to
 * sign in: the backend rejects them with meta.code === 'ACCOUNT_INACTIVE' and Sign In routes here with the
 * server's message. A short, friendly dead end that points them to HR — no way back into the app until HR
 * reactivates the account.
 */
export default function InactiveEmployee() {
  const navigate = useNavigate()
  const location = useLocation()
  const message = (location.state as { message?: string } | null)?.message || DEFAULT_MESSAGE

  return (
    <AuthScreen title="Account Inactive">
      <div className="grid gap-5">
        <Alert variant="warning">
          <UserX aria-hidden />
          <AlertTitle>Your access is paused</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Alert variant="info">
          <Mail aria-hidden />
          <AlertTitle>Next Steps</AlertTitle>
          <AlertDescription>Reach out to your HR department for assistance.</AlertDescription>
        </Alert>
        <Button type="button" size="lg" className="w-full" onClick={() => navigate('/auth', { replace: true })}>
          <ArrowLeft data-icon="inline-start" />
          Back to Sign In
        </Button>
      </div>
    </AuthScreen>
  )
}

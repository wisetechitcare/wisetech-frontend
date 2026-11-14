import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@redux/store'
import { Spinner } from '@/ds/ui/spinner'
import { signOut } from './core/signOut'

/**
 * The /logout route: signs out for real (server revoke + local clear) and leaves for the sign-in page.
 * It used to call the Metronic AuthProvider's logout, which was never mounted — a no-op, so the route
 * reloaded into the same session.
 */
export function Logout() {
  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => {
    void signOut(dispatch)
  }, [dispatch])

  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <Spinner aria-label="Signing out" className="size-6 text-muted-foreground" />
    </div>
  )
}

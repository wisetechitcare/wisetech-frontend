import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import {
  endActiveSupportSessionFromBanner,
  fetchActiveSupportSession,
  type ActiveSupportSession,
} from '@services/platformSupport'
import { PLATFORM_CONSOLE_BRAND } from './platformCopy'
import { platformConsoleHref } from './platformHost'

/**
 * Fixed banner while a KAIZNOVA operator is viewing the tenant app as an employee.
 * Mounted app-wide; uses the support cookie (no tenant JWT required).
 */
export function PlatformSupportBanner() {
  const [session, setSession] = useState<ActiveSupportSession | null>(null)
  const [left, setLeft] = useState('')
  const [ending, setEnding] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setSession(await fetchActiveSupportSession())
    } catch {
      setSession(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 30_000)
    return () => clearInterval(t)
  }, [refresh])

  useEffect(() => {
    if (!session?.expiresAt) {
      setLeft('')
      return
    }
    const tick = () => {
      const ms = new Date(session.expiresAt!).getTime() - Date.now()
      if (ms <= 0) {
        setLeft('ended')
        void refresh()
        return
      }
      const m = Math.floor(ms / 60_000)
      const s = Math.floor((ms % 60_000) / 1000)
      setLeft(`${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.expiresAt, refresh])

  if (!session) return null

  const name = session.viewAsName || 'selected employee'

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-warning-foreground/20 bg-warning-soft px-4 py-2.5 text-sm text-warning-foreground"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p className="min-w-0 font-medium">
          {PLATFORM_CONSOLE_BRAND} Support viewing as {name}
        </p>
        {session.breakGlass ? (
          <Badge variant="danger" dot>
            Break-glass
          </Badge>
        ) : null}
        <Badge variant={session.accessMode === 'READ_WRITE' ? 'warning' : 'neutral'} dot>
          {session.accessMode === 'READ_WRITE' ? 'Read-write' : 'Read-only'}
        </Badge>
        {left ? (
          <span className="tabular text-warning-foreground/80">Ends {left}</span>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={ending}
        onClick={() => {
          setEnding(true)
          void endActiveSupportSessionFromBanner()
            .then(() => {
              setSession(null)
              toast.success('Support session ended')
              window.location.assign(platformConsoleHref('/platform/support'))
            })
            .catch((err: unknown) => {
              toast.error(err instanceof Error ? err.message : 'Could not end session')
            })
            .finally(() => setEnding(false))
        }}
      >
        End Session
      </Button>
    </div>
  )
}

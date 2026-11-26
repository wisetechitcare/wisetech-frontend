import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { platformLogout, platformMe, type PlatformUser } from '@services/platformAuth'

type PlatformSessionValue = {
  user: PlatformUser | null
  loading: boolean
  setUser: (user: PlatformUser | null) => void
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const PlatformSessionContext = createContext<PlatformSessionValue | null>(null)

export function PlatformSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await platformMe()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const me = await platformMe()
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await platformLogout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, setUser, refresh, signOut }),
    [user, loading, refresh, signOut],
  )

  return <PlatformSessionContext.Provider value={value}>{children}</PlatformSessionContext.Provider>
}

export function usePlatformSession(): PlatformSessionValue {
  const ctx = useContext(PlatformSessionContext)
  if (!ctx) throw new Error('usePlatformSession must be used inside PlatformSessionProvider')
  return ctx
}

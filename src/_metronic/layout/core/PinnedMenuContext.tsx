import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'

export type PinnedItem = {
  /** Route path — used as the stable identity of a pinned entry. */
  to: string
  title: string
  icon?: string
  activeIcon?: string
}

type PinnedMenuCtx = {
  pinned: PinnedItem[]
  isPinned: (to: string) => boolean
  togglePin: (item: PinnedItem) => void
}

const PinnedMenuContext = createContext<PinnedMenuCtx>({
  pinned: [],
  isPinned: () => false,
  togglePin: () => {},
})

export const usePinnedMenu = () => useContext(PinnedMenuContext)

// Pins are scoped to the logged-in user so different accounts on the same
// browser don't share favourites.
const storageKey = () => {
  try {
    const ls = localStorage.getItem('wise_tech_login')
    const id = ls ? JSON.parse(ls)?.id : null
    return id ? `wt_aside_pinned_${id}` : 'wt_aside_pinned'
  } catch {
    return 'wt_aside_pinned'
  }
}

const readPinned = (): PinnedItem[] => {
  try {
    const raw = localStorage.getItem(storageKey())
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.to === 'string') : []
  } catch {
    return []
  }
}

/**
 * Holds the user's pinned (favourited) sidebar items. State is persisted to
 * localStorage keyed by user id; the "Pinned" section in AsideMenuMain renders
 * from this list and each AsideMenuItem toggles membership via its pin button.
 */
export const PinnedMenuProvider = ({children}: {children: ReactNode}) => {
  const [pinned, setPinned] = useState<PinnedItem[]>(() => readPinned())

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(pinned))
    } catch {
      /* ignore storage failures */
    }
  }, [pinned])

  const isPinned = useCallback(
    (to: string) => pinned.some((p) => p.to === to),
    [pinned]
  )

  const togglePin = useCallback((item: PinnedItem) => {
    if (!item.to || item.to === '#') return
    setPinned((prev) =>
      prev.some((p) => p.to === item.to)
        ? prev.filter((p) => p.to !== item.to)
        : [...prev, {to: item.to, title: item.title, icon: item.icon, activeIcon: item.activeIcon}]
    )
  }, [])

  const value = useMemo(
    () => ({pinned, isPinned, togglePin}),
    [pinned, isPinned, togglePin]
  )

  return <PinnedMenuContext.Provider value={value}>{children}</PinnedMenuContext.Provider>
}

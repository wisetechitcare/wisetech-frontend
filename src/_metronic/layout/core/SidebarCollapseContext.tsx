import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'

const STORAGE_KEY = 'wt_aside_collapsed'

type SidebarCollapseCtx = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  toggle: () => void
}

const SidebarCollapseContext = createContext<SidebarCollapseCtx>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
})

export const useSidebarCollapse = () => useContext(SidebarCollapseContext)

/**
 * Drives the desktop mini-rail. State is persisted to localStorage and mirrored
 * onto <body data-aside-collapsed> so premium-layout.css can react. Mobile is
 * unaffected — the CSS only keys off this attribute at >=992px.
 */
export const SidebarCollapseProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.body.setAttribute('data-aside-collapsed', collapsed ? 'true' : 'false')
    return () => {
      document.body.removeAttribute('data-aside-collapsed')
    }
  }, [collapsed])

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v)
    try {
      localStorage.setItem(STORAGE_KEY, String(v))
    } catch {
      /* ignore storage failures */
    }
  }, [])

  const toggle = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed])

  return (
    <SidebarCollapseContext.Provider value={{collapsed, setCollapsed, toggle}}>
      {children}
    </SidebarCollapseContext.Provider>
  )
}

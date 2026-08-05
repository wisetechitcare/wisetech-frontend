import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip, type IconButtonProps } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { useIsMobile } from '@components/navigation/BottomNavigation/useIsMobile';

/**
 * "Transform" — swaps the left sidebar for container-based navigation on the Dashboard.
 *
 * A staged migration, not a replacement: the sidebar is untouched and one click away.
 * The container grid (components/navigation/NavContainers) renders the SAME permission-
 * resolved tree the rail does, so the two can be compared on equal terms before the rail
 * is retired.
 *
 *   const { enabled, toggle } = useNavTransform();
 *   <NavTransformToggle />   // drop-in header button
 *
 * The flag is broadcast to CSS as `body[data-nav-transform]`, which premium-layout.css
 * reads to zero `--wt-aside-eff` — one variable already drives the rail width, the header
 * brand cell and the content offset, so nothing else has to know about this feature.
 */

interface NavTransformCtx {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
}

/**
 * Defaults to a no-op rather than throwing (unlike useColorMode). This sits beside
 * SidebarCollapseContext and PinnedMenuContext, which both default — and Metronic
 * partials get mounted in places the provider does not always wrap.
 */
const NavTransformContext = createContext<NavTransformCtx>({
  enabled: false,
  setEnabled: () => { /* no provider */ },
  toggle: () => { /* no provider */ },
});

export const useNavTransform = () => useContext(NavTransformContext);

const STORAGE_BASE = 'wt_nav_transform';

/**
 * Scoped to the logged-in user, matching PinnedMenuContext — two accounts on one
 * browser must not inherit each other's shell.
 */
const storageKey = (): string => {
  try {
    const ls = localStorage.getItem('wise_tech_login');
    const id = ls ? JSON.parse(ls)?.id : null;
    return id ? `${STORAGE_BASE}_${id}` : STORAGE_BASE;
  } catch {
    return STORAGE_BASE;
  }
};

/**
 * Reads the flag WITHOUT the React context. The app's landing redirect (AppRoutes)
 * sits outside MasterLayout, so it cannot consume the provider — but it still has to
 * decide between /home and /dashboard. Keeping the key in one module means the two
 * readers can never disagree.
 */
export function readNavTransformEnabled(): boolean {
  try { return localStorage.getItem(storageKey()) === 'true'; } catch { return false; }
}

export function NavTransformProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => readNavTransformEnabled());

  // Layout effect, not effect: it runs before paint, so a reload with Transform on never
  // flashes the 265px rail before removing it. This is the whole reason the flag lives in
  // localStorage rather than server preferences, which cannot resolve this early.
  useLayoutEffect(() => {
    document.body.setAttribute('data-nav-transform', enabled ? 'true' : 'false');
    return () => { document.body.removeAttribute('data-nav-transform'); };
  }, [enabled]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem(storageKey(), String(v)); } catch { /* private mode */ }
  }, []);

  // Functional updater keeps this identity stable across toggles, so consumers that
  // depend on it do not re-render on every state change.
  const toggle = useCallback(() => setEnabledState((prev) => {
    const next = !prev;
    try { localStorage.setItem(storageKey(), String(next)); } catch { /* private mode */ }
    return next;
  }), []);

  const value = useMemo(() => ({ enabled, setEnabled, toggle }), [enabled, setEnabled, toggle]);

  return <NavTransformContext.Provider value={value}>{children}</NavTransformContext.Provider>;
}

/**
 * The switch between the product's TWO navigation systems.
 *
 *   off → the classic Metronic sidebar (the grouped list)
 *   on  → the workspace shell (application launcher + rail)
 *
 * Both are supported destinations, not a migration with a temporary escape hatch. This is
 * the single switch for that choice: WorkspaceShell reads the same flag and becomes a
 * pass-through when it is off, so the sidebar is untouched in that mode.
 *
 * Renders nothing below the desktop breakpoint: there the rail is already a drawer and
 * BottomNav is the navigation surface, so there is nothing to switch.
 */
export function NavTransformToggle(props: IconButtonProps) {
  const { enabled, toggle } = useNavTransform();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile) return null;

  const handleClick = () => {
    // Switching ON lands on the workspace launcher; switching OFF leaves /workspace, which
    // does not exist in sidebar mode, for the dashboard. Either way the user is never left
    // on a page whose navigation just disappeared.
    navigate(enabled ? '/dashboard' : '/workspace');
    toggle();
  };

  return (
    <Tooltip title={enabled ? 'Switch to the sidebar' : 'Switch to the workspace launcher'}>
      <IconButton
        onClick={handleClick}
        aria-pressed={enabled}
        aria-label="Switch navigation style"
        sx={{ color: enabled ? 'primary.main' : 'text.secondary' }}
        {...props}
      >
        <KTIcon iconName={enabled ? 'burger-menu-2' : 'element-11'} className="fs-3" />
      </IconButton>
    </Tooltip>
  );
}

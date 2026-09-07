import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton, Tooltip, type IconButtonProps } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { useIsMobile } from '@components/navigation/BottomNavigation/useIsMobile';
import { isWorkspacePath } from '@components/workspace/appSlug';

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
  const { pathname } = useLocation();
  const isMobile = useIsMobile();

  /*
   * Flip the navigation. Do NOT move the user.
   *
   * This used to navigate to '/workspace' or '/dashboard' on every toggle, which threw
   * away the page you were reading: switching modes on Attendance dropped you on the
   * dashboard. It does not have to. Both modes serve the SAME routes — WorkspaceShell is
   * a pathless layout route wrapping everything, so it changes what is drawn AROUND the
   * page, not which page — and '/workspace/*' is the only path that exists in one mode
   * and not the other. WorkspaceShell already redirects that one out to '/dashboard' when
   * the sidebar is chosen, so the case this navigate existed for is handled a layer down,
   * where it belongs, and handled for stale bookmarks too rather than only for this click.
   */
  const handleClick = useCallback(() => {
    // STAY ON THE PAGE. Both shells render the same routes — WorkspaceShell is a pathless
    // layout route wrapping every destination — so switching navigation is a change of
    // chrome, not of screen. Sending the user to the launcher or the dashboard threw away
    // whatever they were reading, which is the opposite of what the switch is for.
    //
    // /workspace/* is the sole exception: it exists only in shell mode, so switching OFF
    // from there has to land somewhere that still exists. WorkspaceShell redirects it too,
    // but doing it here means the URL is never momentarily pointed at a route the chosen
    // mode does not have.
    if (enabled && isWorkspacePath(pathname)) navigate('/dashboard');
    toggle();
  }, [enabled, pathname, navigate, toggle]);

  // Ctrl+I / Cmd+I mirrors the button, alongside GlobalSearch's Ctrl+K. Not bound on mobile
  // for the same reason the button is not rendered there: there is nothing to switch between.
  useEffect(() => {
    if (isMobile) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key.toLowerCase() !== 'i') return;

      // Cmd/Ctrl+I is italics inside a text field — leave it to the field.
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;

      e.preventDefault();
      handleClick();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobile, handleClick]);

  if (isMobile) return null;

  return (
    <Tooltip title={enabled ? 'Switch to the sidebar (Ctrl+I)' : 'Switch to the workspace shell (Ctrl+I)'}>
      <IconButton
        onClick={handleClick}
        aria-pressed={enabled}
        aria-label="Switch navigation style"
        sx={{ color: enabled ? 'primary.main' : 'text.secondary' }}
        {...props}
      >
        {/* Each icon names the DESTINATION, not the current state: a sidebar panel to go
            back to the sidebar, the app grid to go to the launcher. */}
        <KTIcon iconName={enabled ? 'panel-left' : 'element-11'} className="fs-3" />
      </IconButton>
    </Tooltip>
  );
}

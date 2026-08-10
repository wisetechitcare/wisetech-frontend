import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@components/navigation/BottomNavigation/useIsMobile';
import { useWorkspaceApps } from './useWorkspaceApps';
import { slugFromPathname, WORKSPACE_ROOT } from './appSlug';
import type { ActiveModuleRef, ShellMode, WorkspaceApp } from './types';

/**
 * Which application/module a pathname belongs to, resolved from the apps we ALREADY have.
 *
 * Longest prefix wins, so `/tasks/timesheet` resolves to "My Timesheet" rather than "Tasks",
 * and `/employees/123` resolves to `/employees`.
 *
 * ─── WHY THIS IS NOT `useActiveNavLocation()` ────────────────────────────────
 * That hook calls `useNavContainers()`, which calls `useNavigation()`. This provider already
 * calls `useNavigation()` once via `useWorkspaceApps()`, so using it built the ENTIRE
 * permission-resolved navigation tree TWICE per render — two independent
 * `pendingApprovalsCount` states and two `fetchPendingApprovals()` network calls. The two
 * resolved at different moments, and each resolution produced a fresh `menu` array, a fresh
 * `apps` array, fresh dock props, and a full re-render + Framer re-measure of every tile.
 * That was the visible flash on switching applications.
 *
 * A plain function over data we already hold costs nothing and cannot desynchronise.
 */
function resolveActive(apps: WorkspaceApp[], pathname: string) {
  let bestApp: WorkspaceApp | null = null;
  let bestModule: ActiveModuleRef | null = null;
  let bestLength = -1;

  for (const app of apps) {
    for (const cluster of [{ modules: app.modules }, ...app.clusters]) {
      for (const module of cluster.modules) {
        if (!module.to) continue;
        // A shortcut points at a route another application owns. Matching on it made
        // ownership depend on tree ORDER — /finance/bills resolved to HR, because HR's
        // My Team cluster links to it and HR is declared first. The owner is the only
        // entry that may answer this.
        if (module.alias) continue;
        const hit = pathname === module.to || pathname.startsWith(`${module.to}/`);
        if (hit && module.to.length > bestLength) {
          bestLength = module.to.length;
          bestApp = app;
          bestModule = { to: module.to, title: module.title };
        }
      }
    }
  }
  return { app: bestApp, module: bestModule };
}

/**
 * Workspace shell state.
 *
 * ─── THE URL IS THE STATE MACHINE ────────────────────────────────────────────
 * Shell mode, active app and active module are all DERIVED from the pathname — never stored.
 * That is what makes the shell deep-linkable, refresh-safe and correctly reversible by the
 * browser Back button, and it makes an entire class of "the highlight disagrees with the
 * page" bug unrepresentable.
 *
 * Everything below is therefore either (a) something the URL genuinely cannot hold, or
 * (b) a measurement. There are five values. None of them duplicates the URL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface WorkspaceShellCtx {
  /** Permission-resolved apps. Empty while authz capabilities are still loading. */
  apps: WorkspaceApp[];
  /** 'home' (centred launcher) | 'docked' (rail + workspace). Derived from the pathname. */
  mode: ShellMode;
  /** Below the 992px breakpoint the aside is a drawer and BottomNav owns navigation, so the
   *  rail must not render. Reuses the app-wide breakpoint — never a second one. */
  isCompact: boolean;
  /** The app the URL addresses, or the sticky last one for routes outside the nav tree. */
  activeApp: WorkspaceApp | null;
  /**
   * The module the URL is inside, if any. Null on an app landing page.
   *
   * Consumed by the workspace header and module strip — NEVER by the dock, which must not
   * know what the workspace is displaying. Resolves to null throughout Phase 2 because the
   * shell still only wraps /workspace/*; it starts resolving unchanged the moment module
   * routes are absorbed.
   */
  activeModule: ActiveModuleRef | null;
  /** The slug the URL asked for, even when it resolves to nothing (→ no access / unknown). */
  requestedSlug: string | null;
  /** Where "Home" goes. Resolved once here so no component builds a route. */
  homePath: string;
  /** True until authz lands. Distinguishes "still loading" from "you have no access". */
  isLoading: boolean;
  /**
   * Reserved for the motion phase: gates interaction locking, heavy-content mounting and
   * the aria-live announcement. Always false in Phase 1 — declared now so adding motion
   * does not change the context shape (and therefore does not touch every consumer).
   */
  isTransitioning: boolean;
  /** Return to the launcher. */
  goHome(): void;
}

const WorkspaceShellContext = createContext<WorkspaceShellCtx | null>(null);

export function useWorkspaceShell(): WorkspaceShellCtx {
  const ctx = useContext(WorkspaceShellContext);
  if (!ctx) throw new Error('useWorkspaceShell must be used within <WorkspaceShellProvider>');
  return ctx;
}

export function WorkspaceShellProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isCompact = useIsMobile();
  // ONE navigation tree per render. See resolveActive() above for why this must not be
  // paired with useActiveNavLocation().
  const apps = useWorkspaceApps();
  const requestedSlug = slugFromPathname(pathname);

  const resolved = useMemo(() => resolveActive(apps, pathname), [apps, pathname]);

  /**
   * Sticky fallback — the one piece of genuinely non-URL state.
   *
   * resolveActive() returns nothing for routes that are not in the nav tree at all
   * (wizards, /crafted/*, /error/*). Without a sticky value the rail highlight would blink
   * off whenever the user opened one of those, which reads as "you have left the workspace"
   * when they have not. Written from an effect, so render stays pure; the value consumed is
   * the previous render's, which is exactly the intended "last known app" semantics.
   */
  const lastAppIdRef = useRef<string | null>(null);

  const activeApp = useMemo<WorkspaceApp | null>(() => {
    if (requestedSlug) return apps.find((a) => a.slug === requestedSlug) ?? null;
    if (resolved.app) return resolved.app;
    if (lastAppIdRef.current) return apps.find((a) => a.id === lastAppIdRef.current) ?? null;
    return null;
  }, [apps, requestedSlug, resolved]);

  useEffect(() => {
    if (activeApp) lastAppIdRef.current = activeApp.id;
  }, [activeApp]);

  // A match is only the ACTIVE MODULE when the URL is on that module's own route — an
  // application landing (/workspace/hr) is not "inside" any of its modules.
  const activeModule = requestedSlug ? null : resolved.module;

  // Landing on the workspace root clears the memory, so returning Home and picking a
  // different app never inherits the previous one's context.
  useEffect(() => {
    if (pathname === WORKSPACE_ROOT) lastAppIdRef.current = null;
  }, [pathname]);

  const goHome = useCallback(() => { navigate(WORKSPACE_ROOT); }, [navigate]);

  const value = useMemo<WorkspaceShellCtx>(() => ({
    apps,
    // Home is exactly ONE url; everywhere else is docked.
    //
    // Not `requestedSlug ? docked : home` — that only recognised /workspace/:slug, so opening
    // an actual module route (/employees, /qc/companies) fell back to 'home' and the rail
    // disappeared mid-journey. Deriving from "am I at the root" instead means the rail
    // persists through every destination the shell wraps, which is the whole point of a
    // workspace: you enter it once and stay in it.
    mode: pathname === WORKSPACE_ROOT ? 'home' : 'docked',
    isCompact,
    activeApp,
    activeModule,
    requestedSlug,
    homePath: WORKSPACE_ROOT,
    // Empty apps means authz has not landed yet (useNavigation recomputes when capabilities
    // arrive). Rendering "no access" here would be a lie shown on every login.
    isLoading: apps.length === 0,
    isTransitioning: false,
    goHome,
  }), [apps, pathname, requestedSlug, isCompact, activeApp, activeModule, goHome]);

  return (
    <WorkspaceShellContext.Provider value={value}>{children}</WorkspaceShellContext.Provider>
  );
}

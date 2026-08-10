import { useMemo } from 'react';
import { LayoutGroup, MotionConfig } from 'framer-motion';
import { useWorkspaceShell } from '../WorkspaceShellContext';
import { toDockApp } from '../useWorkspaceApps';
import { HOME_BACKDROP, SHELL_DOCKED, SHELL_HOME } from '../shellTokens';
import { AppDock } from './AppDock';
import { DockHomeLink } from './DockHomeLink';
import { Workspace } from './Workspace';

/**
 * The shell frame — dock beside workspace.
 *
 * ─── THE ONLY COMPONENT THAT READS SHELL STATE AND FEEDS THE DOCK ────────────
 * Everything the dock needs is resolved here and handed down as plain props: the narrowed
 * `DockApp[]`, the mode, the active id, and the Home slot. The dock therefore has no
 * dependency on this feature's context, its hooks, or its data model beyond that projection
 * — it could be lifted into a component library unchanged.
 *
 * That single-container rule is what makes rules 1 and 4 hold in practice rather than in
 * comments: if only one component may read state, nothing else can quietly start doing it.
 *
 * ─── MOTION IS CONFIGURED ONCE, HERE ─────────────────────────────────────────
 * MotionConfig(reducedMotion="user") — the ONLY accessibility branch in the whole shell.
 * Framer drops transform and layout animations for users who ask for reduced motion and
 * keeps opacity, which is exactly the requirement: the layout changes instantly, only fades
 * remain. Doing this centrally means no component can forget, and there is one place to be
 * correct rather than a dozen `useReducedMotion()` calls to keep in sync.
 *
 * LayoutGroup — the dock's tiles and the workspace envelope must be measured in the SAME
 * frame. Measured separately, the workspace expands against a stale dock geometry and a
 * one-frame gap appears at the seam between them.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every application inherits this shell. It is applied once here, at the layout route, so a
 * new application is a new entry in the navigation tree — never a new layout.
 */
export function WorkspaceLayout() {
  const { apps, mode, isCompact, activeApp, isLoading, homePath } = useWorkspaceShell();

  // Narrow to what the dock may see. Memoised on `apps`, which is itself memoised on the
  // permission-resolved nav tree, so the dock's props are referentially stable across every
  // render that did not actually change the applications — which is what lets its memo work,
  // and what keeps a badge tick from re-rendering (and re-measuring) 30 animating tiles.
  const dockApps = useMemo(() => apps.map(toDockApp), [apps]);

  // Stable element, so passing a slot cannot defeat AppDock's memoisation.
  const homeLink = useMemo(() => <DockHomeLink to={homePath} />, [homePath]);

  // Below 992px the aside is a drawer and BottomNav owns navigation, so a rail must not
  // render once an application is chosen — two navigation systems at once is exactly what
  // the app-wide breakpoint exists to prevent. The launcher itself still shows.
  const showDock = !isLoading && !(isCompact && mode === 'docked');

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="workspace-shell">
        {/* `data-shell-mode` is the single styling/devtools hook for the whole shell. */}
        <div data-shell-mode={mode} className={mode === 'home' ? SHELL_HOME : SHELL_DOCKED}>
          {/* The one decorative layer in the product: a static radial wash so a sparse
              launcher does not read as an empty screen. No animation, no particles, no
              per-frame cost — it is a background-image on a single element. */}
          {mode === 'home' && <span className={HOME_BACKDROP} aria-hidden="true" />}
          {showDock && (
            <AppDock
              apps={dockApps}
              mode={mode}
              activeAppId={activeApp?.id ?? null}
              leading={mode === 'docked' ? homeLink : undefined}
            />
          )}
          <Workspace />
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}

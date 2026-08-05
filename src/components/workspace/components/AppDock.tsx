import { memo, type ReactNode } from 'react';
import {
  DOCK_DOCKED, DOCK_EYEBROW, DOCK_HOME,
  ORDER_DOCK_DOCKED, ORDER_DOCK_HOME,
} from '../shellTokens';
import { AppTile } from './AppTile';
import type { DockApp, ShellMode } from '../types';

/**
 * The dock — the single persistent instance of the application launcher.
 *
 * ─── IT RECEIVES DATA AND RENDERS UI. NOTHING ELSE. ──────────────────────────
 * No context, no hooks, no permissions, no breadcrumbs, no routing logic, no workspace
 * logic, no business logic. It is handed `DockApp[]` — a projection that structurally cannot
 * carry module data — a mode, and the id of the active app, and it draws them.
 *
 * It therefore cannot know what the workspace is displaying, which is the point: navigation
 * and content stay independent, so either can be rebuilt without touching the other. The one
 * component permitted to read shell state is WorkspaceLayout, which is what feeds this.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mounted by WorkspaceShell, which is a PATHLESS LAYOUT ROUTE, so it survives every child
 * navigation: React Router only remounts the segments that changed. That is what makes the
 * launcher and the rail literally the same component in two layout states rather than two
 * components animating into each other.
 *
 * `leading` is a slot, not a feature — the Home affordance is composed in by the parent so
 * the dock is not the thing deciding that Home exists, while the link still sits inside the
 * <nav> landmark where assistive technology expects it.
 *
 * Compact viewports (<992px): the parent does not render this at all once an app is chosen.
 * There is no horizontal room for a rail, and BottomNav is already the navigation surface
 * below that breakpoint.
 */
function AppDockBase({
  apps, mode, activeAppId, leading,
}: {
  apps: DockApp[];
  mode: ShellMode;
  activeAppId: string | null;
  leading?: ReactNode;
}) {
  const home = mode === 'home';
  // Where the ripple originates. Distance from THIS index drives every tile's delay, so the
  // movement propagates outward from the card the user pressed rather than from the top of
  // the list. -1 (nothing active) degrades to a plain index-ordered stagger.
  const activeIndex = activeAppId ? apps.findIndex((a) => a.id === activeAppId) : -1;

  return (
    // Deliberately a PLAIN <nav>, not a motion element. Two reasons:
    //
    //  1. The rail is `position: sticky`. A transform on a sticky element re-bases its
    //     offset while the transform is live, so animating this box would make the rail
    //     drift against its own sticky reference. The tiles are what the eye follows
    //     anyway.
    //  2. Framer's layout projection measures in VIEWPORT coordinates, so each tile FLIPs
    //     correctly whether or not its container animates. Letting the container snap while
    //     its children travel is both the safer and the cheaper arrangement — one fewer
    //     animating box, and no transform on the scroll-positioned element.
    <nav
      aria-label="Applications"
      // Styling/devtools hook — the mode stays legible without reading React state.
      data-dock-mode={mode}
      className={`${home ? DOCK_HOME : DOCK_DOCKED} ${home ? ORDER_DOCK_HOME : ORDER_DOCK_DOCKED}`}
    >
      {leading}
      {!home && <span className={DOCK_EYEBROW}>Applications</span>}
      {apps.map((app, index) => (
        <AppTile
          key={app.id}
          app={app}
          mode={mode}
          active={app.id === activeAppId}
          // Position in the dock, and where the ripple starts. Used only for the stagger —
          // the tile stays pure: it is told where it sits, it does not work it out.
          index={index}
          activeIndex={activeIndex}
        />
      ))}
    </nav>
  );
}

export const AppDock = memo(AppDockBase);

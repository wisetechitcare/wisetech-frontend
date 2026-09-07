/**
 * Workspace shell — the launcher-morph navigation architecture.
 *
 * The entire feature lives in this one folder. Its only inbound dependencies are
 * `useNavContainers` (read-only), `navIcon` / `sectionAccent` (two pure functions) and
 * `useIsMobile` (the app-wide 992px breakpoint) — so removing the feature is deleting this
 * folder plus one route block in PrivateRoutes.tsx, one CSS block in premium-layout.css and
 * one conditional in HeaderWrapper.tsx, with nothing else left behind.
 *
 * Route elements are intentionally NOT re-exported here: PrivateRoutes lazy-loads them by
 * path so they land in their own chunk, and going through this barrel would pull the whole
 * feature into whatever imports it.
 */
export { WorkspaceShellProvider, WorkspaceShellState, useWorkspaceShell } from './WorkspaceShellContext';
export { useWorkspaceApps, toDockApp } from './useWorkspaceApps';
export { useWorkspaceChrome } from './useWorkspaceChrome';
export { WorkspaceLayout } from './components/WorkspaceLayout';
export { AppDock } from './components/AppDock';
export { AppTile } from './components/AppTile';
export { DockHomeLink } from './components/DockHomeLink';
export { Workspace } from './components/Workspace';
export { WorkspaceHeader } from './components/WorkspaceHeader';
export { WorkspaceContent } from './components/WorkspaceContent';
export { WorkspaceBreadcrumb } from './components/WorkspaceBreadcrumb';
export { ModuleStrip } from './components/ModuleStrip';
export { ModuleGrid } from './components/ModuleGrid';
export {
  WORKSPACE_ROOT, isWorkspacePath, slugForSectionId, workspacePathForSlug, slugFromPathname,
} from './appSlug';
export type {
  ActiveModuleRef, DockApp, ShellMode, WorkspaceApp, WorkspaceCluster, WorkspaceModule,
} from './types';
/** Motion tokens — the single source of truth for every duration, spring and delay in the
 *  shell. Import these rather than writing a number into a component. */
export {
  MOTION, DECELERATE, ACCELERATE,
  navigationSpring, homewardSpring, workspaceSpring,
  pressAnimation, pressTransition,
  fadeAnimation, fadeTransition, contentRevealTransition,
  staggerConfig, railDelay, moduleDelay, moduleTileVariants,
  GLYPH_RADIUS, GLYPH_SIZE,
} from './motion';

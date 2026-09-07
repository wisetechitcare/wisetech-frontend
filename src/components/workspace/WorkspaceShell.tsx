import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useNavTransform } from '@/contexts/NavTransformContext';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { useWorkspaceChrome } from './useWorkspaceChrome';
import { isWorkspacePath } from './appSlug';

/**
 * The workspace shell — a PATHLESS LAYOUT ROUTE wrapping every route, and a PASS-THROUGH
 * whenever the user has chosen the classic sidebar.
 *
 * ─── TWO NAVIGATION SYSTEMS, ONE SWITCH ──────────────────────────────────────
 * The product ships BOTH: the classic Metronic sidebar (the grouped list, with its own UI
 * work) and this workspace shell. They are alternatives, not a migration — the user picks,
 * and the header's NavTransformToggle is the picker.
 *
 * That switch already existed (`NavTransformContext`: per-user, localStorage-backed, read
 * pre-paint so a reload never flashes the wrong shell). Reusing it rather than inventing a
 * second flag means there is exactly one answer to "which navigation am I in" — two flags
 * would eventually disagree and the answer would depend on which component you asked.
 *
 *   enabled = false → renders <Outlet/> bare. No dock, no provider, no body attribute, so
 *                     the sidebar keeps its width and behaves exactly as it always has.
 *                     This component is invisible in that mode.
 *   enabled = true  → the full shell: application rail + workspace, sidebar stepped aside.
 *
 * `/workspace/*` only exists in shell mode, so it redirects out when the sidebar is chosen —
 * otherwise a stale bookmark would land on a launcher with no launcher in it.
 *
 * ─── WHY A LAYOUT ROUTE ──────────────────────────────────────────────────────
 * React Router does not remount a parent element when a child route changes, so the rail
 * mounted inside persists across every destination. The launcher and the rail are one
 * component in two layout states, not two components faking continuity.
 */
export default function WorkspaceShell() {
  const { enabled } = useNavTransform();
  const { pathname } = useLocation();

  // Hooks run unconditionally, before any branch — the mode can flip at runtime.
  useWorkspaceChrome(enabled);

  if (!enabled) {
    if (isWorkspacePath(pathname)) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
  }

  // The provider itself is mounted by MasterLayout (WorkspaceShellState), above the header —
  // the header's breadcrumb reads this state too, and it renders outside this route.
  return <WorkspaceLayout />;
}

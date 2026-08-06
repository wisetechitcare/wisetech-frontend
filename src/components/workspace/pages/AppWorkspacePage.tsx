import { Link } from 'react-router-dom';
import { useWorkspaceShell } from '../WorkspaceShellContext';
import { ModuleGrid } from '../components/ModuleGrid';
import { WORKSPACE_SUBTITLE, WORKSPACE_TITLE } from '../shellTokens';

/**
 * An application's workspace landing — `/workspace/:appId`.
 *
 * This is a real destination, not a transient selection state: it has content (the module
 * grid), it is worth bookmarking, it is worth sending to a colleague, and it is the correct
 * target for the browser Back button coming from a module. Holding it in local state instead
 * would lose all four, and would leave the reverse transition with nothing to go back to.
 *
 * The page renders CONTENT ONLY. Title, breadcrumb and module strip are shell chrome and
 * belong to WorkspaceHeader — otherwise every future page in the workspace would have to
 * reproduce them, and they would drift.
 *
 * ─── ACCESS CONTROL ──────────────────────────────────────────────────────────
 * There is no permission check in this file, and there must never be one. `apps` is already
 * permission-filtered upstream by useNavigation(), so an application the user cannot reach
 * is simply not in the list and its slug resolves to the "not available" branch below. A
 * second set of checks here could drift from the sidebar's and silently disagree with it.
 *
 * The empty-vs-unavailable distinction matters: useNavigation() recomputes when authz
 * capabilities land, so `apps` is briefly empty right after login. Showing "not available"
 * during that window would accuse every user of lacking access on every sign-in.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function AppWorkspacePage() {
  const { activeApp, requestedSlug, isLoading, homePath } = useWorkspaceShell();

  if (isLoading) {
    return <div className={WORKSPACE_SUBTITLE} role="status">Loading…</div>;
  }

  if (!activeApp) {
    return (
      // role="heading" rather than <h1>: Metronic styles headings unlayered, which beats
      // Tailwind's layered utilities outright. See shellTokens.ts.
      <div>
        <div role="heading" aria-level={1} className={WORKSPACE_TITLE}>Not available</div>
        <div className={WORKSPACE_SUBTITLE}>
          {requestedSlug
            ? `"${requestedSlug}" is not an application you have access to.`
            : 'That application is not available.'}
        </div>
        {/* Colour on the inner span — Reboot's `a { color }` beats text-* utilities. */}
        <Link to={homePath} className="mt-[16px] inline-block">
          <span className="text-[13.5px] font-semibold text-blue-700 dark:text-blue-300">
            Back to all applications
          </span>
        </Link>
      </div>
    );
  }

  return <ModuleGrid app={activeApp} />;
}

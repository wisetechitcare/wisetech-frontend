import { Outlet } from 'react-router-dom';

/**
 * The workspace's content region — the seam between the shell and everything it hosts.
 *
 * ─── WHY THIS EXISTS AS ITS OWN COMPONENT ────────────────────────────────────
 * Phase 1 went Workspace → Outlet, which left nowhere to stand between the shell and a page.
 * Anything the workspace might one day contain — a dashboard, favourites, widgets,
 * analytics, a split view, a per-application layout — would have had to be bolted onto the
 * shell itself, and the shell would slowly become a switch statement over page types.
 *
 * With this seam in place, all of that arrives as ROUTE ELEMENTS rendered through the
 * Outlet. Adding an application dashboard is adding a route, not editing the shell.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `min-w-0` is load-bearing: this is a flex child, and flex items default to
 * `min-width: auto`, so a wide table or chart inside a page would refuse to shrink and push
 * the whole shell past the viewport. The app-wide overflow guard clips the symptom; this
 * removes the cause.
 */
export function WorkspaceContent() {
  return (
    // `w-full` is load-bearing: without it this shrink-wraps its content, and anything
    // relying on the parent to centre it ends up centred inside a narrow box at the left of
    // the page rather than on the page.
    <div className="w-full min-w-0 pb-[40px]">
      <Outlet />
    </div>
  );
}

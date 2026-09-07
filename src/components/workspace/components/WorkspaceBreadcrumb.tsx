import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspaceShell } from '../WorkspaceShellContext';

/**
 * Anything that owns Escape for itself. A modal, a drawer, a confirm dialog and a menu all
 * close on Escape, and every one of them can be open over the workspace — so the breadcrumb
 * shortcut stands down whenever one is on screen rather than firing underneath it.
 */
const OVERLAY_SELECTOR = [
  '.modal.show',            // react-bootstrap
  '.offcanvas.show',
  '.MuiModal-root',         // MUI Dialog / Drawer / Menu
  '.swal2-container',       // sweetalert
  '[role="dialog"][open]',
  'dialog[open]',
  '.menu-sub.show',         // Metronic dropdown
].join(', ');

/**
 * Where you are, and the way back.
 *
 * `Home › HR & People` on an application landing; `Home › HR & People › Documents` once the
 * URL is inside a module. The module crumb is already handled here rather than added later,
 * so absorbing module routes needs no change to this file.
 *
 * Deliberately NOT the old NavTransformBackBar. That existed because Transform mode had no
 * standing navigation, so it had to carry an explicit "← All navigation" escape. The dock is
 * the standing navigation now, which frees this to be what a breadcrumb should be:
 * orientation, not an exit.
 *
 * ─── IT RENDERS IN THE HEADER, IN THE HEADER'S OWN MARKUP ────────────────────
 * There were two breadcrumbs on screen: this one, and the header's `wt-crumb` list fed by
 * PageData — which each page hand-writes, so it drifted and omitted the application level
 * ("Home › Dashboard" where the truth was "Home › Overview › Dashboard"). This trail is
 * DERIVED from the nav tree and cannot drift, so it is the one that survived.
 *
 * It wears `wt-crumb` rather than the shell's own tokens because it now sits on the header
 * bar: the classes are the header's, styled once in premium-layout.css, and both navigation
 * modes therefore render an identical-looking crumb. Reading context directly (no props)
 * keeps DefaultTitle from having to know the shell's data model to place it.
 *
 * Every crumb is a real anchor. Hover is a colour change only — no transition, no transform.
 */
export function WorkspaceBreadcrumb() {
  const navigate = useNavigate();
  const { activeApp, activeModule, homePath } = useWorkspaceShell();
  const appTitle = activeApp?.title;
  const appPath = activeApp?.path;
  const moduleTitle = activeModule?.title;

  // The crumb one step up: the app landing from inside a module, the launcher from an app
  // landing, and nothing at all from home — the same target the previous crumb links to.
  const parentPath = moduleTitle ? (appPath ?? homePath) : (appTitle ? homePath : null);

  // Escape walks that link, so the way back is reachable without pointing at it. Deliberately
  // NOT history.back(): the breadcrumb describes the hierarchy, and a shortcut attached to it
  // should climb the hierarchy — going back through a sideways jump would contradict the very
  // trail it sits on.
  useEffect(() => {
    if (!parentPath) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      // An overlay owns Escape while it is open, and a field owns it while it is focused —
      // Escape there reverts or blurs the entry rather than leaving the page.
      if (document.querySelector(OVERLAY_SELECTOR)) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;

      e.preventDefault();
      navigate(parentPath);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [parentPath, navigate]);

  return (
    <ul className="wt-crumb" aria-label="Breadcrumb">
      <li className="wt-crumb__item"><Link to={homePath}>Home</Link></li>

      {appTitle && (
        <>
          <li className="wt-crumb__sep" aria-hidden>›</li>
          {/* The app crumb is a link only when it is NOT the current page — a self-link is
              noise for pointer users and a dead stop for screen readers. */}
          {moduleTitle && appPath
            ? <li className="wt-crumb__item"><Link to={appPath}>{appTitle}</Link></li>
            : <li className="wt-crumb__item wt-crumb__item--active" aria-current="page">{appTitle}</li>}
        </>
      )}

      {moduleTitle && (
        <>
          <li className="wt-crumb__sep" aria-hidden>›</li>
          <li className="wt-crumb__item wt-crumb__item--active" aria-current="page">{moduleTitle}</li>
        </>
      )}
    </ul>
  );
}

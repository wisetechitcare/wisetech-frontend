import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BREADCRUMB_CURRENT, BREADCRUMB_LINK, BREADCRUMB_NAV, BREADCRUMB_SEP,
} from '../shellTokens';

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
 * Every crumb is a real anchor. Hover is a colour change only — no transition, no transform.
 */
export function WorkspaceBreadcrumb({
  homePath, appTitle, appPath, moduleTitle,
}: {
  homePath: string;
  appTitle?: string;
  appPath?: string;
  moduleTitle?: string;
}) {
  const navigate = useNavigate();

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
    <nav aria-label="Breadcrumb" className={BREADCRUMB_NAV}>
      {/* Colour lives on the inner span in every crumb: Reboot's `a { color }` is unlayered
          and beats text-* utilities outright, so a directly-styled anchor renders
          brand-navy in both themes regardless of the class. */}
      <Link to={homePath}><span className={BREADCRUMB_LINK}>Home</span></Link>

      {appTitle && (
        <>
          <span className={BREADCRUMB_SEP} aria-hidden="true">›</span>
          {/* The app crumb is a link only when it is NOT the current page — a self-link is
              noise for pointer users and a dead stop for screen readers. */}
          {moduleTitle && appPath
            ? <Link to={appPath}><span className={BREADCRUMB_LINK}>{appTitle}</span></Link>
            : <span className={BREADCRUMB_CURRENT} aria-current="page">{appTitle}</span>}
        </>
      )}

      {moduleTitle && (
        <>
          <span className={BREADCRUMB_SEP} aria-hidden="true">›</span>
          <span className={BREADCRUMB_CURRENT} aria-current="page">{moduleTitle}</span>
        </>
      )}
    </nav>
  );
}

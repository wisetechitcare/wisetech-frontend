import { Link } from 'react-router-dom';
import {
  BREADCRUMB_CURRENT, BREADCRUMB_LINK, BREADCRUMB_NAV, BREADCRUMB_SEP,
} from '../shellTokens';

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

import { NavLink } from 'react-router-dom';
import {
  STRIP_BADGE, STRIP_ROW, STRIP_SCROLLER, STRIP_TAB, STRIP_TAB_ACTIVE,
  STRIP_TAB_TEXT, STRIP_TAB_TEXT_ACTIVE,
} from '../shellTokens';
import type { WorkspaceModule } from '../types';

/**
 * The active application's flat module navigation.
 *
 * This is workspace chrome, not dock chrome: the dock says which APPLICATION you are in, the
 * strip says which MODULE. Keeping them in separate components is what lets an application
 * switch repaint the strip without the dock re-rendering at all.
 *
 * ─── PHASE 2 NOTE, DELIBERATE ────────────────────────────────────────────────
 * The shell currently wraps /workspace/* only, so no module route renders inside it and the
 * active state below never lights up yet. The strip is still the real, working module nav —
 * its links navigate out to the flat module routes exactly as the sidebar's do. When module
 * routes are absorbed, the strip persists into them and the active tab starts resolving,
 * with no change to this file. The consequence today is that top-level modules appear both
 * here and in the grid on the landing page; that overlap ends with absorption, when the grid
 * is only ever seen on the landing.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Horizontal scroll rather than wrapping: a wrapping tab row changes the header's height as
 * the application changes, which shifts the content underneath it. Scrolling keeps the
 * header a fixed reference point — and is what stops this breaking at 14+ modules.
 */
export function ModuleStrip({
  modules, activeModulePath, label,
}: {
  modules: WorkspaceModule[];
  activeModulePath: string | null;
  label: string;
}) {
  if (modules.length === 0) return null;

  return (
    <nav aria-label={label} className={STRIP_SCROLLER}>
      <div className={STRIP_ROW}>
        {modules.map((module) => {
          const active = activeModulePath === module.to;
          return (
            // `group` + colour on the inner span: Reboot's `a { color }` is unlayered and
            // beats every text-* utility, so an anchor styled directly renders brand-navy in
            // both themes. The anchor carries layout and the active underline only.
            <NavLink
              key={module.id}
              to={module.to}
              // `end` mirrors the flag useNavContainers already computes: React Router
              // prefix-matches by default, so /employees would stay highlighted while on
              // /employees/calendar without it.
              end={module.exact}
              aria-current={active ? 'page' : undefined}
              className={`group ${STRIP_TAB} ${active ? STRIP_TAB_ACTIVE : ''}`}
            >
              <span className={`${STRIP_TAB_TEXT} ${active ? STRIP_TAB_TEXT_ACTIVE : ''}`}>
                {module.title}
              </span>
              {!!module.badgeCount && (
                <span className={STRIP_BADGE} aria-label={`${module.badgeCount} pending`}>
                  {module.badgeCount > 99 ? '99+' : module.badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

import { Link, useLocation } from 'react-router-dom';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { useActiveNavLocation } from '@hooks/useNavContainers';
import { useNavTransform } from '@/contexts/NavTransformContext';
import { useIsMobile } from '../BottomNavigation/useIsMobile';
import { navIcon } from './navIcons';
import { sectionAccent } from './navTheme';

/**
 * Persistent "where am I / how do I get back" bar for Transform mode.
 *
 * With the sidebar hidden there is no standing navigation on an inner page, so without
 * this the only ways out are the browser Back button and the header logo — neither of
 * which reads as an exit. This is the console-style equivalent: an always-visible return
 * path plus the trail that got you here.
 *
 *   [← All navigation]  |  ▣ HR & People  ›  Documents
 *
 * The section crumb deep-links back to its own section (`/home#nav-<id>`) rather than the
 * top of the page, so returning from a link deep in a long section lands you looking at
 * that section instead of scrolling for it.
 *
 * Renders nothing when: Transform is off (the sidebar is doing this job), on mobile (the
 * rail is a drawer and BottomNav is present), or on Home itself (already there).
 */
export function NavTransformBackBar() {
  const { enabled } = useNavTransform();
  const { pathname } = useLocation();
  const active = useActiveNavLocation();
  const isMobile = useIsMobile();

  if (!enabled || isMobile) return null;
  if (pathname === '/' || pathname === '/home') return null;

  const accent = active ? sectionAccent(active.container.id) : null;
  const SectionIcon = navIcon(active?.container.icon);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 sm:px-6 dark:border-slate-700 dark:bg-slate-900">
      <Link to="/home" className="shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[13px] font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10 dark:hover:text-blue-300">
          <ArrowBackRounded sx={{ fontSize: 16 }} />
          All navigation
        </span>
      </Link>

      {/* Absent for routes that are not in the nav at all (detail pages, wizards) — the
          return path above still works, so missing context is not a failure. */}
      {active && accent && (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${accent.iconWrap}`}>
            <SectionIcon sx={{ fontSize: 14 }} />
          </span>
          <Link to={`/home#nav-${active.container.id}`} className="shrink-0">
            <span className="text-[13px] font-semibold text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300">
              {active.container.title}
            </span>
          </Link>
          <ChevronRightRounded sx={{ fontSize: 15 }} className="shrink-0 text-slate-400" />
          <span
            className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100"
            title={active.link.title}
          >
            {active.link.title}
          </span>
        </div>
      )}
    </div>
  );
}

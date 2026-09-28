import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

/**
 * Tab state that lives in the PATH: `/projects/map`, not `/projects?tab=map`.
 *
 * Why the path and not component state: a tab held in `useState` is lost on every
 * remount, and the header remounts the whole page tree when the viewport crosses the
 * mobile breakpoint (991.98px) — so zooming the browser silently threw the user back
 * to the first tab. The URL survives that, and it makes a tab linkable and refreshable.
 *
 * Why the path and not `?tab=`: the query string belongs to the page's own filters, and
 * a tab is a place, not a filter. Old `?tab=` links still work — they are rewritten to
 * the path form once, so bookmarks and any link not yet updated keep working.
 *
 * The slug comes from the tab TITLE, so a tab list that changes with permissions cannot
 * drift out of step with a hand-kept key list ("My Salary" → `my-salary`). Register the
 * same slugs as routes (see `routing/tabPaths.ts`) or the URL will 404 on refresh.
 */

/** Joins a base and a tab slug without ever producing a double slash. */
const join = (base: string, slug: string) => `${base.replace(/\/+$/, '')}/${slug}`;

/** "My Salary" → "my-salary". */
export const tabSlug = (title: string) =>
    title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export interface TabRoute {
    /** Index into the tab list, 0 when the URL names no (or an unknown) tab. */
    activeTab: number;
    /** Navigate to a tab, keeping the page's query string (its filters) intact. */
    setActiveTab: (index: number) => void;
}

/**
 * `basePath` may be omitted. Then the base is the current path with its trailing tab slug
 * removed — which is what a page nested under a parent route wants, since it does not know
 * its own absolute path (`employees/calendar` is mounted under a parent prefix).
 */
export function useTabRoute(
    basePath: string | undefined,
    titles: readonly string[],
    /** Tab to land on when the URL names none. Index, or a slug. Defaults to the first. */
    fallback: number | string = 0,
): TabRoute {
    const navigate = useNavigate();
    const { pathname, search, state } = useLocation();
    // Under a splat route (`/project/:id/*`) the router already knows where the page's own
    // path ends: everything before the splat. See `base` below for why that matters.
    const splat = useParams()['*'];

    // Keyed on the joined titles, not the array: a caller that builds its tab list inline
    // (most do, because the list depends on permissions) hands us a new array every render,
    // and memoising on identity would recompute — and re-run the effect below — every time.
    const titleKey = titles.join('|');
    const slugs = useMemo(() => {
        const seen = new Map<string, number>();
        // Two tabs can legitimately share a title (Loans shows a personal AND a team
        // "Installments"). Without this the second would be unreachable, because its URL
        // would resolve to the first.
        return titleKey.split('|').filter(Boolean).map((title) => {
            const slug = tabSlug(title);
            const n = (seen.get(slug) ?? 0) + 1;
            seen.set(slug, n);
            return n === 1 ? slug : `${slug}-${n}`;
        });
    }, [titleKey]);

    // The segment straight after the base path: /projects/map → "map". Without a base,
    // the LAST segment is the tab when it names one (and the base is everything before it).
    const trimmed = pathname.replace(/\/+$/, '');
    const lastSegment = trimmed.slice(trimmed.lastIndexOf('/') + 1);
    /*
     * Without an explicit base, prefer the router's: under a splat route the base is the path
     * minus the splat, and the tab is the splat's first segment.
     *
     * Guessing it from the last segment ("a known tab, or else part of the base") broke any
     * page whose tab list changes after mount. The entity page drops its project-only tabs
     * while the lead is loading, so `/project/:id/teams` read as a base with no tab, got
     * `/leads` appended, and every later click stacked another segment onto that —
     * `/project/:id/teams/teams/teams/leads`.
     */
    const splatPath = splat?.replace(/\/+$/, '');
    const splatBase = splatPath !== undefined
        ? trimmed.slice(0, trimmed.length - splatPath.length).replace(/\/+$/, '') || '/'
        : undefined;
    const segment = basePath
        ? (trimmed.startsWith(basePath) ? trimmed.slice(basePath.length).replace(/^\/+/, '').split('/')[0] ?? '' : '')
        : splatPath !== undefined
            ? splatPath.split('/')[0] ?? ''
            : lastSegment;
    const fromPath = slugs.indexOf(segment);
    // Without a base or splat: everything before the tab segment, or the whole path when it
    // names no tab yet. `|| '/'` guards a one-segment path (`/employees`) whose own name
    // happens to match its first tab — the slice would otherwise be empty and build `/configure`.
    const base = basePath ?? splatBase ?? (fromPath >= 0 ? trimmed.slice(0, trimmed.lastIndexOf('/')) || '/' : trimmed);
    const legacy = slugs.indexOf(new URLSearchParams(search).get('tab') ?? '');

    /**
     * Normalise the URL so it always names its tab:
     *  - an old `?tab=x` link becomes `/base/x`, dropping only that param;
     *  - the bare base (`/leads`) becomes the first tab (`/leads/overview`).
     * Both replace the history entry, so Back still leaves the page in one step.
     */
    useEffect(() => {
        if (fromPath >= 0 || !slugs.length) return;
        const params = new URLSearchParams(search);
        const fallbackSlug = typeof fallback === 'string'
            ? (slugs.includes(fallback) ? fallback : slugs[0])
            : slugs[fallback] ?? slugs[0];
        const target = legacy >= 0 ? slugs[legacy] : fallbackSlug;
        if (legacy >= 0) params.delete('tab');
        const qs = params.toString();
        // `state` is carried through: it holds navigation context (e.g. whether a record was
        // opened from Leads or from Projects), and a navigation without it wipes that.
        navigate(`${join(base, target)}${qs ? `?${qs}` : ''}`, { replace: true, state });
    }, [fromPath, legacy, base, search, slugs, navigate, fallback, state]);

    const setActiveTab = useCallback(
        (index: number) => {
            const slug = slugs[index] ?? slugs[0];
            if (!slug) return;
            navigate(`${join(base, slug)}${search}`, { replace: true, state });
        },
        [base, navigate, search, slugs, state],
    );

    return { activeTab: Math.max(0, fromPath >= 0 ? fromPath : legacy), setActiveTab };
}

/**
 * The same thing for a page whose tabs are identified by KEY rather than position
 * (the entity detail page: `leads`, `billing`, `teams`…). Keys are already URL-safe,
 * so the key IS the path segment.
 */
export function useTabKeyRoute(
    basePath: string | undefined,
    keys: readonly string[],
    fallbackKey?: string,
): { activeKey: string; setActiveKey: (key: string) => void } {
    const { activeTab, setActiveTab } = useTabRoute(basePath, keys, fallbackKey ?? 0);
    return {
        activeKey: keys[activeTab] ?? keys[0] ?? '',
        setActiveKey: (key: string) => setActiveTab(Math.max(0, keys.indexOf(key))),
    };
}

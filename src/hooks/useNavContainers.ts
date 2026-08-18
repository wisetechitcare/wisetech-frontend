import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation, type NavigationItem } from './useNavigation';

/**
 * Reshapes the sidebar's navigation tree into equally-weighted CONTAINERS for the
 * Transform view (components/navigation/NavContainers).
 *
 * Deliberately derives from `useNavigation()` rather than declaring its own config:
 * that hook already resolves every permission check (`can`, `isSectionBlocked`,
 * `hasPermission`) into a plain `visible` flag, so the containers can never drift out
 * of sync with the rail they stand in for. No authorization logic is repeated here.
 *
 * The source array is FLAT — `type:'section'` nodes act as headers, and every node
 * after one belongs to it until the next section appears.
 */

export interface NavContainerLink {
  id: string;
  title: string;
  to: string;
  fontIcon?: string;
  badgeCount?: number;
  /** NavLink `end` — set when another link nests beneath this path (see pass 3). */
  exact: boolean;
  /** Shortcut to a route another container owns; never used to resolve "where am I". */
  alias?: boolean;
}

export interface NavContainerGroup {
  id: string;
  title: string;
  fontIcon?: string;
  /** Some `sub` nodes carry a route of their own, some do not — a linked vs. plain heading. */
  to?: string;
  links: NavContainerLink[];
}

export type NavEntry =
  | { kind: 'link'; link: NavContainerLink }
  | { kind: 'group'; group: NavContainerGroup };

export interface NavContainer {
  id: string;
  title: string;
  /**
   * Bootstrap Icons class — sections carry no icon of their own, so these are assigned
   * below. Consumers map it to their own icon set (see NavContainers/navIcons.tsx);
   * keeping the nav tree's own vocabulary here avoids a second source of truth.
   */
  icon: string;
  entries: NavEntry[];
  /** Total links including group children — drives empty-container elimination. */
  linkCount: number;
  badgeTotal: number;
}

/** Sections are pure text headers in the nav tree, so identity is assigned here. */
const SECTION_ICON: Record<string, string> = {
  'general-section': 'bi-grid-1x2',
  'hr-section': 'bi-people',
  'crm-section': 'bi-person-rolodex',
  'projects-section': 'bi-kanban',
  // Purchasing, not paying — a cart reads as procurement at a glance and keeps
  // this department distinct from Finance's cash and receipt glyphs.
  'purchase-section': 'bi-cart3',
  // Finance and Organization keep the glyph their group carried while it was a
  // `sub`, so the promotion doesn't also change what users are looking for.
  'finance-section': 'bi-cash-coin',
  'organization-section': 'bi-house-fill',
  'admin-section': 'bi-gear',
};

/** Items that precede the first section header (Inbox, Dashboard, Calendar). */
const GENERAL_ID = 'general-section';

interface DraftContainer {
  id: string;
  title: string;
  visible: boolean;
  /** Survive pass 2's empty-container elimination — see NavigationItem.allowEmpty. */
  allowEmpty: boolean;
  entries: NavEntry[];
}

const toLink = (node: NavigationItem): NavContainerLink => ({
  id: node.id,
  title: node.title,
  to: node.to ?? '',
  fontIcon: node.fontIcon,
  badgeCount: node.badgeCount,
  exact: false,
  alias: node.alias,
});

const countLinks = (entries: NavEntry[]): number =>
  entries.reduce((n, e) => n + (e.kind === 'link' ? 1 : e.group.links.length), 0);

const sumBadges = (entries: NavEntry[]): number =>
  entries.reduce((n, e) => n + (e.kind === 'link'
    ? (e.link.badgeCount ?? 0)
    : e.group.links.reduce((m, l) => m + (l.badgeCount ?? 0), 0)), 0);

export function useNavContainers(): NavContainer[] {
  const menu = useNavigation();

  return useMemo(() => {
    // ── Pass 1: bucket the flat array into containers ────────────────────────
    let open: DraftContainer = { id: GENERAL_ID, title: 'Overview', visible: true, allowEmpty: false, entries: [] };
    const drafts: DraftContainer[] = [open];

    for (const node of menu) {
      if (node.type === 'section') {
        // ALWAYS open a new container, even for a hidden section, and carry the flag
        // so pass 2 can drop it. Skipping here instead would drain every following
        // item into the PREVIOUS container — a user without CRM access would find
        // CRM links sitting inside HR & People.
        open = {
          id: node.id,
          title: node.title,
          visible: node.visible !== false,
          allowEmpty: node.allowEmpty === true,
          entries: [],
        };
        drafts.push(open);
        continue;
      }

      if (node.visible === false) continue;

      if (node.type === 'item') {
        if (!node.to) continue;
        open.entries.push({ kind: 'link', link: toLink(node) });
        continue;
      }

      // type === 'sub'
      const links = (node.children ?? [])
        .filter((c) => c.visible !== false && c.type === 'item' && !!c.to)
        .map(toLink);

      // A group whose every child is permission-gated must vanish entirely rather
      // than render an empty heading — same rule AsideMenuMain applies to the rail.
      if (links.length === 0) continue;

      open.entries.push({
        kind: 'group',
        group: { id: node.id, title: node.title, fontIcon: node.fontIcon, to: node.to, links },
      });
    }

    // ── Pass 2: finalise + drop hidden/empty containers ──────────────────────
    // Empty means "every module was permission-gated away", so the container goes
    // rather than offering a shell the user cannot use. A section flagged
    // `allowEmpty` is empty by DESIGN — a department declared before its modules
    // exist — and is kept.
    const containers: NavContainer[] = drafts
      .filter((d) => d.visible && (countLinks(d.entries) > 0 || d.allowEmpty))
      .map((d) => ({
        id: d.id,
        title: d.title,
        icon: SECTION_ICON[d.id] ?? 'bi-folder',
        entries: d.entries,
        linkCount: countLinks(d.entries),
        badgeTotal: sumBadges(d.entries),
      }));

    // ── Pass 3: exact-match flags ────────────────────────────────────────────
    // React Router v6 NavLink prefix-matches by default, so /employees would stay
    // highlighted while on /employees/calendar. Mark any link another link nests under.
    const paths: string[] = [];
    for (const c of containers) {
      for (const e of c.entries) {
        if (e.kind === 'link') paths.push(e.link.to);
        else e.group.links.forEach((l) => paths.push(l.to));
      }
    }
    const needsExact = (to: string) => paths.some((p) => p !== to && p.startsWith(`${to}/`));
    for (const c of containers) {
      for (const e of c.entries) {
        if (e.kind === 'link') e.link.exact = needsExact(e.link.to);
        else e.group.links.forEach((l) => { l.exact = needsExact(l.to); });
      }
    }

    return containers;
  }, [menu]);
}

/** Which container/link the current URL belongs to. */
export interface ActiveNavLocation {
  container: NavContainer;
  link: NavContainerLink;
}

/**
 * Resolves the current pathname back to its place in the nav tree, so a page reached
 * from a container can say which section it came from and offer a way back.
 *
 * Longest-prefix wins, so `/tasks/timesheet` resolves to "My Timesheet" rather than
 * "Tasks" — the same rule the bottom nav uses to pick its active tab. Returns null for
 * routes that are not in the nav at all (detail pages, wizards, settings sub-routes),
 * which callers should treat as "no context", not as an error.
 */
/**
 * Dev-only: shout when two OWNING entries claim the same route.
 *
 * "Which section am I in" must have exactly one answer. When two non-alias entries
 * point at the same path the winner is whichever is declared first, which is silent,
 * order-dependent, and how /finance/reimbursements came to render as "HR Department >
 * Reimbursements". Either the route belongs to one section, or the other entry is a
 * shortcut and should carry `alias: true`.
 *
 * Warns once per duplicated route so a re-render does not spam the console.
 */
const warnedRoutes = new Set<string>();

const assertSingleOwner = (flat: ActiveNavLocation[]) => {
  if (!import.meta.env.DEV) return;
  const owners = new Map<string, string[]>();
  for (const { container, link } of flat) {
    if (!link.to || link.alias) continue;
    owners.set(link.to, [...(owners.get(link.to) ?? []), container.title]);
  }
  for (const [route, sections] of owners) {
    if (sections.length < 2 || warnedRoutes.has(route)) continue;
    warnedRoutes.add(route);
    console.warn(
      `[nav] "${route}" is claimed by ${sections.length} sections (${sections.join(', ')}). ` +
      'Breadcrumbs and the rail highlight will pick whichever is declared first. ' +
      'Mark the shortcut with `alias: true` in useNavigation.',
    );
  }
};

export function useActiveNavLocation(): ActiveNavLocation | null {
  const containers = useNavContainers();
  const { pathname } = useLocation();

  return useMemo(() => {
    const flat: ActiveNavLocation[] = [];
    for (const container of containers) {
      for (const entry of container.entries) {
        if (entry.kind === 'link') {
          flat.push({ container, link: entry.link });
          continue;
        }
        if (entry.group.to) {
          flat.push({
            container,
            link: {
              id: entry.group.id,
              title: entry.group.title,
              to: entry.group.to,
              fontIcon: entry.group.fontIcon,
              exact: false,
            },
          });
        }
        for (const link of entry.group.links) flat.push({ container, link });
      }
    }

    assertSingleOwner(flat);

    // Shortcuts are excluded: an alias points at a route another container owns, so
    // letting it match would make "which container am I in" depend on declaration
    // ORDER rather than ownership — the same bug that made /finance/reimbursements resolve to
    // HR instead of Finance.
    const matches = flat.filter(({ link }) =>
      !link.alias && !!link.to && (pathname === link.to || pathname.startsWith(`${link.to}/`)));
    matches.sort((a, b) => b.link.to.length - a.link.to.length);
    return matches[0] ?? null;
  }, [containers, pathname]);
}

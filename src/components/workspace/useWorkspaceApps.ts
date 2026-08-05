import { useMemo } from 'react';
import { useNavContainers, type NavContainer } from '@hooks/useNavContainers';
import { slugForSectionId, workspacePathForSlug } from './appSlug';
import type { DockApp, WorkspaceApp, WorkspaceCluster, WorkspaceModule } from './types';

/**
 * Reshapes the permission-resolved navigation tree into workspace APPS.
 *
 * ─── NO AUTHORIZATION LOGIC LIVES HERE, BY DESIGN ────────────────────────────
 * This derives from `useNavContainers()`, which derives from `useNavigation()` — the hook
 * that already resolves every `can()`, `hasPermission()`, `isSectionBlocked()` and
 * `isSubsectionVisible()` call into a plain `visible` flag, and already drops empty/hidden
 * containers. Not one permission check is written, copied or re-implemented below.
 *
 * The consequence that matters: an app the user cannot access is simply ABSENT from this
 * array. Its `/workspace/<slug>` URL then resolves to "no access" with no guard of its own —
 * RBAC/PBAC is preserved by construction rather than by a second set of checks that could
 * drift from the sidebar's.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The one deliberate reshaping: `NavContainer.entries` interleaves links and groups; this
 * splits them into `modules` (flat, in order) then `clusters` (in order). The workspace grid
 * reads better as "everything direct, then the grouped things" than as an interleaved run —
 * and it is what lets a group render as a labelled cluster instead of opening a dialog.
 */

const toModule = (link: {
  id: string; title: string; to: string; fontIcon?: string; badgeCount?: number; exact: boolean;
}): WorkspaceModule => ({
  id: link.id,
  title: link.title,
  to: link.to,
  fontIcon: link.fontIcon,
  badgeCount: link.badgeCount,
  exact: link.exact,
});

function toApp(container: NavContainer): WorkspaceApp {
  const modules: WorkspaceModule[] = [];
  const clusters: WorkspaceCluster[] = [];

  for (const entry of container.entries) {
    if (entry.kind === 'link') {
      modules.push(toModule(entry.link));
      continue;
    }
    clusters.push({
      id: entry.group.id,
      title: entry.group.title,
      fontIcon: entry.group.fontIcon,
      to: entry.group.to,
      modules: entry.group.links.map(toModule),
    });
  }

  const slug = slugForSectionId(container.id);

  return {
    id: container.id,
    slug,
    path: workspacePathForSlug(slug),
    title: container.title,
    icon: container.icon,
    modules,
    clusters,
    // Reuse the container's own totals rather than recomputing — they already account for
    // cluster children, and a second computation is a second thing that can disagree.
    moduleCount: container.linkCount,
    badgeTotal: container.badgeTotal,
  };
}

export function useWorkspaceApps(): WorkspaceApp[] {
  const containers = useNavContainers();
  return useMemo(() => containers.map(toApp), [containers]);
}

/**
 * Narrows an app to what the dock is permitted to see (see DockApp in types.ts).
 *
 * This is the projection that makes "navigation is independent of content" a compile-time
 * fact rather than a code-review convention: the dock is handed these, so `modules` and
 * `clusters` are not merely unused there — they are absent.
 */
export const toDockApp = (app: WorkspaceApp): DockApp => ({
  id: app.id,
  slug: app.slug,
  path: app.path,
  title: app.title,
  icon: app.icon,
  badgeTotal: app.badgeTotal,
  moduleCount: app.moduleCount,
});

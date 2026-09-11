import { useSyncExternalStore } from 'react';
import type { WorkspaceCluster, WorkspaceModule } from './types';

/**
 * How the module grid is ordered, and the usage counts that "Frequently used" reads.
 *
 * ─── WHY LOCALSTORAGE AND NOT THE SERVER ─────────────────────────────────────
 * This is a per-person, per-device view preference — the same class of thing as the pinned
 * sidebar rows and the collapsed rail, which already live in localStorage. Nothing here is
 * shared, audited or acted on by anyone else, so a table, an endpoint and a sync story would
 * all be cost with no consumer. Move it server-side the day the preference has to follow a
 * user between devices.
 *
 * Every read is wrapped: Safari private mode throws on access, and a nav grid that cannot
 * render because a preference could not be read is a worse outcome than an unsorted grid.
 */
export type ModuleSort = 'frequent' | 'az' | 'za';

export const MODULE_SORTS: { id: ModuleSort; label: string }[] = [
  { id: 'frequent', label: 'Frequently used' },
  { id: 'az', label: 'A–Z' },
  { id: 'za', label: 'Z–A' },
];

const SORT_KEY = 'wt.workspace.moduleSort';
const USAGE_KEY = 'wt.workspace.moduleUsage';

const isSort = (v: unknown): v is ModuleSort =>
  v === 'frequent' || v === 'az' || v === 'za';

type Usage = Record<string, number>;

const readUsage = (): Usage => {
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
    return raw && typeof raw === 'object' ? (raw as Usage) : {};
  } catch {
    return {};
  }
};

/** Bump a module's counter. Called on click, so it must never throw into the navigation. */
export const recordModuleUse = (to: string) => {
  if (!to) return;
  try {
    const usage = readUsage();
    usage[to] = (usage[to] ?? 0) + 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {
    /* preference storage unavailable — ordering silently stays as it was */
  }
};

/**
 * Sorts a module list.
 *
 * `frequent` falls back to NAV ORDER for anything never opened — including every module on
 * a first visit — because `Array.prototype.sort` is stable. That is what makes it a safe
 * default: with no usage history the grid looks exactly as it did before this control
 * existed, and it only diverges once the user has actually earned the ordering.
 */
export function sortModules(
  modules: WorkspaceModule[],
  sort: ModuleSort,
  usage: Usage = readUsage(),
): WorkspaceModule[] {
  const copy = [...modules];
  if (sort === 'frequent') {
    return copy.sort((a, b) => (usage[b.to] ?? 0) - (usage[a.to] ?? 0));
  }
  const dir = sort === 'az' ? 1 : -1;
  return copy.sort((a, b) => dir * a.title.localeCompare(b.title));
}

/**
 * Same ordering applied to the labelled clusters, so an alphabetical grid is alphabetical
 * all the way down rather than A–Z inside headings that are still in nav order.
 *
 * `frequent` leaves cluster ORDER alone: a group's "frequency" would have to be invented
 * from its children (sum? max? mean?), and every answer is arguable. Nav order is not.
 */
export function sortClusters(clusters: WorkspaceCluster[], sort: ModuleSort): WorkspaceCluster[] {
  const usage = readUsage();
  const sorted = clusters.map((c) => ({ ...c, modules: sortModules(c.modules, sort, usage) }));
  if (sort === 'frequent') return sorted;
  const dir = sort === 'az' ? 1 : -1;
  return sorted.sort((a, b) => dir * a.title.localeCompare(b.title));
}

/**
 * The chosen ordering, remembered across visits and shared across components.
 *
 * ─── WHY AN EXTERNAL STORE AND NOT CONTEXT ───────────────────────────────────
 * The control lives in WorkspaceHeader and the grid it orders lives under the <Outlet>, so
 * the two are siblings with the router between them. The alternatives were a provider around
 * the shell — which puts CONTENT state into the navigation shell, the one boundary this
 * folder is built to keep (see types.ts) — or lifting the grid's ordering into
 * WorkspaceShellContext, same problem. A four-line store with `useSyncExternalStore` keeps
 * both components dumb and the boundary intact, and it is React's own answer for state that
 * lives outside the tree.
 *
 * `cached` exists because `getSnapshot` must return a stable value: reading localStorage on
 * every call returns a fresh string each time and React re-renders forever.
 */
let cached: ModuleSort | null = null;
const listeners = new Set<() => void>();

const getSort = (): ModuleSort => {
  if (cached) return cached;
  try {
    const stored = localStorage.getItem(SORT_KEY);
    cached = isSort(stored) ? stored : 'frequent';
  } catch {
    cached = 'frequent';
  }
  return cached;
};

export const setModuleSort = (next: ModuleSort) => {
  cached = next;
  try {
    localStorage.setItem(SORT_KEY, next);
  } catch {
    /* not persisted; the choice still applies for this visit */
  }
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

export const useModuleSort = (): ModuleSort => useSyncExternalStore(subscribe, getSort, getSort);

/**
 * Central React Query key factory.
 *
 * Phase 0 of the Lead/Project dual-workspace architecture
 * (docs/LEAD_PROJECT_DUAL_WORKSPACE_ARCHITECTURE.md §8.3): all new data
 * fetching goes through React Query with keys minted here — never inline
 * string arrays — so invalidation stays reliable as adoption spreads.
 *
 * Invalidation contract:
 *   - a lead mutation invalidates queryKeys.leads.all AND queryKeys.projects.all
 *     (a project is a Received lead — the two caches describe one aggregate)
 *   - master-data mutations invalidate the specific queryKeys.masters.* entry
 */
export const queryKeys = {
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.leads.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.leads.all, 'detail', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.projects.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
    mapPoints: () => [...queryKeys.projects.all, 'map-points'] as const,
  },
  masters: {
    all: ['masters'] as const,
    leadStatuses: () => [...queryKeys.masters.all, 'lead-statuses'] as const,
    projectStatuses: () => [...queryKeys.masters.all, 'project-statuses'] as const,
    projectServices: () => [...queryKeys.masters.all, 'project-services'] as const,
    projectCategories: () => [...queryKeys.masters.all, 'project-categories'] as const,
    projectSubcategories: () => [...queryKeys.masters.all, 'project-subcategories'] as const,
  },
} as const;

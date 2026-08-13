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
  /**
   * Task module (Phase 4). The old module used no React Query at all — bare `useEffect`s with
   * no cancellation, which is how one task's data ended up rendering under another task's id.
   *
   * Invalidation contract: any task WRITE (create, update, stage move, delete, subtask,
   * timesheet) invalidates `tasks.all`. The board and the list are two projections of one
   * dataset, so they must never be invalidated separately — a stage move that refreshed the
   * board but not the table would leave the two disagreeing on screen.
   */
  tasks: {
    all: ['tasks'] as const,
    board: (filters: Record<string, unknown> = {}) => [...queryKeys.tasks.all, 'board', filters] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.tasks.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
    subtasks: (id: string) => [...queryKeys.tasks.all, 'subtasks', id] as const,
    timesheets: (id: string) => [...queryKeys.tasks.all, 'timesheets', id] as const,
    statuses: () => [...queryKeys.tasks.all, 'statuses'] as const,
    priorities: () => [...queryKeys.tasks.all, 'priorities'] as const,
    presets: () => [...queryKeys.tasks.all, 'presets'] as const,
    /** Authorized selectors — the server decides membership, so these are cached per actor session. */
    availableProjects: () => [...queryKeys.tasks.all, 'available-projects'] as const,
    /** The BROWSE list — derived from visible tasks, unlike availableProjects (create authority). */
    boardProjects: () => [...queryKeys.tasks.all, 'board-projects'] as const,
    projectAssignees: (projectId: string) => [...queryKeys.tasks.all, 'project-assignees', projectId] as const,
    generalAssignees: () => [...queryKeys.tasks.all, 'general-assignees'] as const,
  },
  masters: {
    all: ['masters'] as const,
    leadStatuses: () => [...queryKeys.masters.all, 'lead-statuses'] as const,
    projectStatuses: () => [...queryKeys.masters.all, 'project-statuses'] as const,
    projectServices: () => [...queryKeys.masters.all, 'project-services'] as const,
    projectCategories: () => [...queryKeys.masters.all, 'project-categories'] as const,
    projectSubcategories: () => [...queryKeys.masters.all, 'project-subcategories'] as const,
  },
  recruitment: {
    all: ['recruitment'] as const,
    requisitions: () => [...queryKeys.recruitment.all, 'requisitions'] as const,
    requisition: (id: string) => [...queryKeys.recruitment.all, 'requisition', id] as const,
    requisitionStages: () => [...queryKeys.recruitment.all, 'requisition-stages'] as const,
    applications: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.recruitment.all, 'applications', filters] as const,
    applicants: (search = '') => [...queryKeys.recruitment.all, 'applicants', search] as const,
    applicationStatuses: () => [...queryKeys.recruitment.all, 'application-statuses'] as const,
    rejectionReasons: () => [...queryKeys.recruitment.all, 'rejection-reasons'] as const,
    applicantSources: () => [...queryKeys.recruitment.all, 'applicant-sources'] as const,
    settings: () => [...queryKeys.recruitment.all, 'settings'] as const,
    interviews: (applicationId: string) => [...queryKeys.recruitment.all, 'interviews', applicationId] as const,
    evaluation: (applicationId: string) => [...queryKeys.recruitment.all, 'evaluation', applicationId] as const,
    offer: (applicationId: string) => [...queryKeys.recruitment.all, 'offer', applicationId] as const,
    postings: () => [...queryKeys.recruitment.all, 'postings'] as const,
    overview: () => [...queryKeys.recruitment.all, 'overview'] as const,
  },
} as const;

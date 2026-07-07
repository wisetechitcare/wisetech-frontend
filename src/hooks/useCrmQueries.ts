import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getAllLeads, getLeadById, createLead, updateLead, deleteLead } from '@services/leads';
import { getAllProjects, createProject, updateProjectById as updateProject, deleteProjectById as deleteProject } from '@services/projects';

/**
 * React Query wrappers around the existing lead/project services.
 *
 * Phase 0 of the Lead/Project dual-workspace architecture
 * (docs/LEAD_PROJECT_DUAL_WORKSPACE_ARCHITECTURE.md §13): new code fetches
 * server state through these hooks instead of calling services + useState
 * directly. Mutations should invalidate via the queryKeys factory — see the
 * invalidation contract documented there.
 */

export const useLeads = (params?: { page?: number; pageSize?: number; fields?: string[] }) =>
  useQuery({
    queryKey: queryKeys.leads.list(params ?? {}),
    queryFn: () => getAllLeads(params),
  });

export const useLead = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.leads.detail(id ?? ''),
    queryFn: () => getLeadById(id as string),
    enabled: !!id,
  });

/** Lean project rows (legacy project shape) — pickers, dropdowns, search. */
export const useProjects = () =>
  useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => getAllProjects(),
  });

/** Project rows with the table's derived-column relations included. */
export const useProjectsForTable = () =>
  useQuery({
    queryKey: queryKeys.projects.list({ view: 'table' }),
    queryFn: () => getAllProjects(),
  });

export const useProject = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.projects.detail(id ?? ''),
    queryFn: () => import('@services/projects').then((m) => m.getProjectById(id as string)),
    enabled: !!id,
  });

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateLead(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.id) }); // Invalidate related project
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
};

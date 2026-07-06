import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AuditApi,
  AuditEntityType,
  AuditTimelinePage,
} from './audit.service';

/**
 * React Query hooks for the Audit read API.
 * Cursor-based infinite timeline + immutable (cache-forever) diffs.
 */

export function useAuditTimeline(
  type: AuditEntityType,
  id?: string,
  limit = 15,
  freshRef?: { current: boolean },
) {
  return useInfiniteQuery({
    queryKey: ['audit-timeline', type, id],
    enabled: !!id,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      AuditApi.timeline(type, id as string, {
        cursor: pageParam,
        limit,
        // Set by an explicit Refresh click so the server skips its cached page.
        fresh: freshRef?.current ? 1 : undefined,
      }),
    getNextPageParam: (last: AuditTimelinePage) => last.nextCursor ?? undefined,
    // Audit data changes out-of-band (the user edits the entity elsewhere), so
    // always show fresh data when the tab is opened or the window regains focus.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useAuditDiff(
  type: AuditEntityType,
  id: string | undefined,
  from: number | null,
  to: number | null,
) {
  return useQuery({
    queryKey: ['audit-diff', type, id, from, to],
    enabled: !!id && from != null && to != null,
    staleTime: Infinity, // diffs of immutable revisions never change
    queryFn: () => AuditApi.diff(type, id as string, from as number, to as number),
  });
}

export function useAuditInsights(type: AuditEntityType, id: string | undefined) {
  return useQuery({
    queryKey: ['audit-insights', type, id],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => AuditApi.insights(type, id as string),
  });
}

/** Authoritative viewer identity + elevation (drives "Advanced Audit" / reset gating). */
export function useAuditViewer() {
  return useQuery({
    queryKey: ['audit-me'],
    staleTime: Infinity,
    queryFn: () => AuditApi.me(),
  });
}

export function useResetPreview(
  type: AuditEntityType,
  id: string | undefined,
  targetVersion: number | null,
) {
  return useQuery({
    queryKey: ['audit-reset-preview', type, id, targetVersion],
    enabled: !!id && targetVersion != null,
    staleTime: 0,
    queryFn: () => AuditApi.resetPreview(type, id as string, targetVersion as number),
  });
}

export function useReset(type: AuditEntityType, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetVersion: number) => AuditApi.reset(type, id as string, targetVersion),
    onSuccess: () => {
      // Versions were deleted — refresh timeline + insights.
      qc.invalidateQueries({ queryKey: ['audit-timeline', type, id] });
      qc.invalidateQueries({ queryKey: ['audit-insights', type, id] });
    },
  });
}

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AuditV2Api,
  AuditEntityType,
  V2TimelinePage,
} from './auditV2.service';

/**
 * React Query hooks for the Change Intelligence v2 read API.
 * Cursor-based infinite timeline + immutable (cache-forever) diffs.
 */

export function useAuditTimeline(type: AuditEntityType, id?: string, limit = 15) {
  return useInfiniteQuery({
    queryKey: ['audit-timeline', type, id],
    enabled: !!id,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      AuditV2Api.timeline(type, id as string, { cursor: pageParam, limit }),
    getNextPageParam: (last: V2TimelinePage) => last.nextCursor ?? undefined,
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
    queryFn: () => AuditV2Api.diff(type, id as string, from as number, to as number),
  });
}

export function useRestorePreview(
  type: AuditEntityType,
  id: string | undefined,
  targetRev: number | null,
) {
  return useQuery({
    queryKey: ['audit-restore-preview', type, id, targetRev],
    enabled: !!id && targetRev != null,
    staleTime: 0,
    queryFn: () => AuditV2Api.restorePreview(type, id as string, targetRev as number),
  });
}

export function useAuditInsights(type: AuditEntityType, id: string | undefined) {
  return useQuery({
    queryKey: ['audit-insights', type, id],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => AuditV2Api.insights(type, id as string),
  });
}

export function useRestore(type: AuditEntityType, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { targetRev: number; reason?: string; expectedCurrentRev?: number }) =>
      AuditV2Api.restore(type, id as string, body),
    onSuccess: () => {
      // The rollback produced a new ROLLBACK ChangeSet — refresh the timeline.
      qc.invalidateQueries({ queryKey: ['audit-timeline', type, id] });
    },
  });
}

/** Authoritative viewer identity + elevation (drives "Advanced Audit" / reset gating). */
export function useAuditViewer() {
  return useQuery({
    queryKey: ['audit-me'],
    staleTime: Infinity,
    queryFn: () => AuditV2Api.me(),
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
    queryFn: () => AuditV2Api.resetPreview(type, id as string, targetVersion as number),
  });
}

export function useReset(type: AuditEntityType, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetVersion: number) => AuditV2Api.reset(type, id as string, targetVersion),
    onSuccess: () => {
      // Versions were deleted — refresh timeline + insights.
      qc.invalidateQueries({ queryKey: ['audit-timeline', type, id] });
      qc.invalidateQueries({ queryKey: ['audit-insights', type, id] });
    },
  });
}

import { useState, useCallback, useEffect } from 'react';
import RevisionsService from '../services/revisions.service';
import {
  Revision,
  RevisionHistory,
  FieldChange,
  DiffChange,
  ActivityLogEntry,
  RevisionDetail
} from '../types/revisions.types';

/**
 * useRevisions - React hook for managing revision data
 * Handles fetching, caching, and state management
 */
export const useRevisions = (entityType: string, entityId: string) => {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 0 });

  const fetchRevisions = useCallback(
    async (page: number = 1, pageSize: number = 20) => {
      try {
        setLoading(true);
        setError(null);
        const data = await RevisionsService.getRevisionHistory(entityType, entityId, page, pageSize);
        setRevisions(data.revisions);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch revisions');
      } finally {
        setLoading(false);
      }
    },
    [entityType, entityId]
  );

  useEffect(() => {
    if (entityId) {
      fetchRevisions();
    }
  }, [entityId, fetchRevisions]);

  return {
    revisions,
    loading,
    error,
    pagination,
    fetchRevisions
  };
};

/**
 * useFieldHistory - Hook for fetching field-level change history
 */
export const useFieldHistory = (entityType: string, entityId: string, fieldName?: string) => {
  const [changes, setChanges] = useState<FieldChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFieldHistory = useCallback(async (field: string) => {
    if (!field) return;
    try {
      setLoading(true);
      setError(null);
      const data = await RevisionsService.getFieldHistory(entityType, entityId, field);
      setChanges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch field history');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (fieldName) {
      fetchFieldHistory(fieldName);
    }
  }, [fieldName, fetchFieldHistory]);

  return {
    changes,
    loading,
    error,
    fetchFieldHistory
  };
};

/**
 * useDiff - Hook for comparing two revisions
 */
export const useDiff = (
  entityType: string,
  entityId: string,
  fromRevision?: number,
  toRevision?: number
) => {
  const [changes, setChanges] = useState<DiffChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiff = useCallback(
    async (from: number, to: number) => {
      if (!from || !to) return;
      try {
        setLoading(true);
        setError(null);
        const data = await RevisionsService.getDiff(entityType, entityId, from, to);
        setChanges(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch diff');
      } finally {
        setLoading(false);
      }
    },
    [entityType, entityId]
  );

  useEffect(() => {
    if (fromRevision && toRevision) {
      fetchDiff(fromRevision, toRevision);
    }
  }, [fromRevision, toRevision, fetchDiff]);

  return {
    changes,
    loading,
    error,
    fetchDiff
  };
};

/**
 * useActivityLog - Hook for fetching activity timeline
 */
export const useActivityLog = (entityType: string, entityId: string) => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 50, totalPages: 0 });

  const fetchActivityLog = useCallback(
    async (page: number = 1, pageSize: number = 50) => {
      try {
        setLoading(true);
        setError(null);
        const data = await RevisionsService.getActivityLog(entityType, entityId, page, pageSize);
        setActivities(data.activities);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch activity log');
      } finally {
        setLoading(false);
      }
    },
    [entityType, entityId]
  );

  useEffect(() => {
    if (entityId) {
      fetchActivityLog();
    }
  }, [entityId, fetchActivityLog]);

  return {
    activities,
    loading,
    error,
    pagination,
    fetchActivityLog
  };
};

/**
 * useRevisionDetail - Hook for fetching full revision details
 */
export const useRevisionDetail = (
  entityType: string,
  entityId: string,
  revisionNumber?: number
) => {
  const [revision, setRevision] = useState<RevisionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRevisionDetail = useCallback(
    async (revNum: number) => {
      if (!revNum) return;
      try {
        setLoading(true);
        setError(null);
        const data = await RevisionsService.getRevision(entityType, entityId, revNum);
        setRevision(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch revision');
      } finally {
        setLoading(false);
      }
    },
    [entityType, entityId]
  );

  useEffect(() => {
    if (revisionNumber) {
      fetchRevisionDetail(revisionNumber);
    }
  }, [revisionNumber, fetchRevisionDetail]);

  return {
    revision,
    loading,
    error,
    fetchRevisionDetail
  };
};

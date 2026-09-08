import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  analyzeLegacyCsv,
  applyBulkDecision,
  cancelMigration,
  deleteSavedRun,
  executeMigrationBatch,
  fetchLegacyColumns,
  fetchSavedRuns,
  fetchMigrationRecords,
  fetchMigrationRun,
  saveRecordDecision,
  type RecordsQuery,
} from '@services/LegacyLeadMigrationService';
import type {
  BulkRule,
  ExecuteProgress,
  FieldChoice,
  RecordDecision,
} from '@/types/legacyMigration';

/**
 * React Query bindings for the legacy migration wizard.
 *
 * The execute mutation is the interesting one: it loops batches until the server
 * reports nothing remaining, publishing running totals as it goes. That is where the
 * progress bar's numbers come from — there is no simulated percentage anywhere in
 * this feature.
 */

const keys = {
  columns: ['legacy-migration', 'columns'] as const,
  savedRuns: (organizationId: string) => ['legacy-migration', 'saved-runs', organizationId] as const,
  run: (runId: string) => ['legacy-migration', 'run', runId] as const,
  records: (runId: string, query: RecordsQuery) => ['legacy-migration', 'records', runId, query] as const,
};

export const useLegacyColumns = () =>
  useQuery({
    queryKey: keys.columns,
    queryFn: fetchLegacyColumns,
    // Column metadata only changes when the code does.
    staleTime: Infinity,
  });

/**
 * Saved uploads for the org. Backs the picker on the upload step, which is the
 * only way back into a half-reviewed run — re-uploading the file stages every
 * row PENDING again and loses the decisions already made.
 */
export const useSavedRuns = (organizationId: string) =>
  useQuery({
    queryKey: keys.savedRuns(organizationId),
    queryFn: () => fetchSavedRuns(organizationId),
    enabled: Boolean(organizationId),
  });

export const useDeleteSavedRun = (organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => deleteSavedRun(runId, organizationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.savedRuns(organizationId) }),
  });
};

export const useMigrationRun = (runId: string | null, organizationId: string) =>
  useQuery({
    queryKey: keys.run(runId ?? ''),
    queryFn: () => fetchMigrationRun(runId!, organizationId),
    enabled: Boolean(runId && organizationId),
  });

export const useMigrationRecords = (
  runId: string | null,
  organizationId: string,
  query: RecordsQuery,
) =>
  useQuery({
    queryKey: keys.records(runId ?? '', query),
    queryFn: () => fetchMigrationRecords(runId!, organizationId, query),
    enabled: Boolean(runId && organizationId),
    placeholderData: (previous) => previous,
  });

export const useAnalyzeLegacyCsv = () =>
  useMutation({
    mutationFn: ({ file, organizationId }: { file: File; organizationId: string }) =>
      analyzeLegacyCsv(file, organizationId),
  });

export const useSaveDecision = (runId: string | null, organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, decision }: { recordId: string; decision: RecordDecision }) =>
      saveRecordDecision(runId!, recordId, decision, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legacy-migration', 'records', runId ?? ''] });
      queryClient.invalidateQueries({ queryKey: keys.run(runId ?? '') });
    },
  });
};

export const useBulkDecision = (runId: string | null, organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      filter?: string;
      rule?: BulkRule;
      fieldRules?: Record<string, FieldChoice>;
      approve?: boolean;
    }) => applyBulkDecision(runId!, organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legacy-migration', 'records', runId ?? ''] });
      queryClient.invalidateQueries({ queryKey: keys.run(runId ?? '') });
    },
  });
};

export const useCancelMigration = (runId: string | null, organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelMigration(runId!, organizationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.run(runId ?? '') }),
  });
};

/**
 * Runs the migration batch by batch, accumulating real counters.
 *
 * Stops on the first batch that throws, leaving already-executed records committed —
 * the run is resumable, because the server only ever picks up APPROVED rows.
 */
export const useExecuteMigration = (runId: string | null, organizationId: string) => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ExecuteProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (batchSize = 25) => {
      if (!runId || !organizationId) return null;

      setIsRunning(true);
      setError(null);

      const totals: ExecuteProgress = {
        processed: 0,
        remaining: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        stale: 0,
        done: false,
      };

      try {
        // Bounded so a server bug that never drains the queue cannot spin forever.
        for (let guard = 0; guard < 10_000; guard += 1) {
          const batch = await executeMigrationBatch(runId, organizationId, batchSize);

          totals.processed += batch.processed;
          totals.updated += batch.updated;
          totals.created += batch.created;
          totals.skipped += batch.skipped;
          totals.failed += batch.failed;
          totals.stale += batch.stale;
          totals.remaining = batch.remaining;
          setProgress({ ...totals });

          if (batch.remaining === 0) break;
          // A batch that reports work left but processed nothing would loop forever.
          if (batch.processed === 0) break;
        }

        totals.done = true;
        setProgress({ ...totals });
        return totals;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Migration failed');
        throw err;
      } finally {
        setIsRunning(false);
        queryClient.invalidateQueries({ queryKey: ['legacy-migration', 'records', runId] });
        queryClient.invalidateQueries({ queryKey: keys.run(runId) });
      }
    },
    [runId, organizationId, queryClient],
  );

  return { execute, progress, isRunning, error };
};

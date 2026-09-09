import { useMemo, useState } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
  GlassDialog,
  GlassHeader,
  WtButton,
  WtStepper,
} from '@app/modules/common/components/ui';
import { confirmDialog, toast } from '@app/modules/common/components/ui/feedback';
import {
  useAnalyzeLegacyCsv,
  useBulkDecision,
  useDeleteSavedRun,
  useExecuteMigration,
  useLegacyColumns,
  useMigrationRecords,
  useMigrationRun,
  useSaveDecision,
  useSavedRuns,
} from '@hooks/useLegacyMigration';
import CsvUploadStep from '../CsvUploadStep';
import SavedRunsPanel from './SavedRunsPanel';
import AnalysisSummary from './AnalysisSummary';
import MatchReviewTable, { filterLabel } from './MatchReviewTable';
import ReconciliationPanel from './ReconciliationPanel';
import BulkDecisionBar from './BulkDecisionBar';
import MigrationSummaryStep from './MigrationSummary';
import MigrationResult from './MigrationResult';
import type { MigrationRecord, RecordDecision, SavedMigrationRun } from '@/types/legacyMigration';

/**
 * Legacy Data Migration wizard.
 *
 * Upload → Analyze → Review → Confirm → Result. The database is untouched until the
 * admin presses Confirm on the summary step; everything before that is staged
 * server-side and can be abandoned safely.
 */

const STEPS = [
  { label: 'Upload' },
  { label: 'Compare' },
  { label: 'Review changes' },
  { label: 'Confirm' },
  { label: 'Done' },
];

/** Named rather than numeric: 'analyzing' and 'summary' share one rail position. */
type WizardStep = 'upload' | 'analyzing' | 'summary' | 'review' | 'confirm' | 'result';

const RAIL_INDEX: Record<WizardStep, number> = {
  upload: 0,
  analyzing: 1,
  summary: 1,
  review: 2,
  confirm: 3,
  result: 4,
};

export function LegacyMigrationWizard({
  show,
  onHide,
  organizationId,
  onCompleted,
}: {
  show: boolean;
  onHide: () => void;
  organizationId: string;
  onCompleted?: () => void;
}) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [runId, setRunId] = useState<string | null>(null);
  const [migrationCode, setMigrationCode] = useState('');
  const [reviewing, setReviewing] = useState<MigrationRecord | null>(null);
  const [filter, setFilter] = useState('needs_review');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: columns = [] } = useLegacyColumns();
  const analyze = useAnalyzeLegacyCsv();
  const { data: savedRuns = [], isLoading: savedRunsLoading } = useSavedRuns(organizationId);
  const deleteRun = useDeleteSavedRun(organizationId);
  const { data: runData, isLoading: runLoading } = useMigrationRun(runId, organizationId);
  const recordsQuery = useMigrationRecords(runId, organizationId, { filter, search, page, pageSize: 25 });
  const saveDecision = useSaveDecision(runId, organizationId);
  const bulkDecision = useBulkDecision(runId, organizationId);
  const { execute, progress, isRunning, error: executeError } = useExecuteMigration(runId, organizationId);

  const columnLabels = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.key, column.label])),
    [columns],
  );

  const summary = runData?.summary;

  const reset = () => {
    setStep('upload');
    setRunId(null);
    setMigrationCode('');
    setReviewing(null);
    setFilter('needs_review');
    setSearch('');
    setPage(1);
  };

  const handleClose = () => {
    if (progress?.done) onCompleted?.();
    reset();
    onHide();
  };

  /**
   * Reopens a saved run. Lands on the review list rather than the summary: the
   * admin came back to keep deciding rows, and every decision already made is
   * still on the record, so there is nothing to re-read first.
   */
  const handleResume = (run: SavedMigrationRun) => {
    setRunId(run.id);
    setMigrationCode(run.migrationCode);
    setReviewing(null);
    setFilter('needs_review');
    setSearch('');
    setPage(1);
    setStep('review');
  };

  const handleAnalyze = async (file: File) => {
    // Uploading a file that already has an open run is almost always "let me get
    // back into that", not "compare this again from scratch" — and analyzing
    // afresh stages every row PENDING, losing the skips and approvals already
    // saved. Ask rather than silently making a second run for the same file.
    const open = savedRuns.find((run) => run.resumable && run.fileName === file.name);
    if (open) {
      const resume = await confirmDialog({
        icon: 'question',
        title: `${open.migrationCode} is still open`,
        text: `You already have an upload of "${open.fileName}" in review — ${open.decidedRows} of ${open.totalRows} rows decided. Resume it, or start a fresh comparison? Starting fresh leaves those decisions behind.`,
        confirmText: 'Resume',
        cancelText: 'Start fresh',
      });
      if (resume) {
        handleResume(open);
        return;
      }
    }

    setStep('analyzing');
    try {
      const result = await analyze.mutateAsync({ file, organizationId });
      setRunId(result.runId);
      setMigrationCode(result.migrationCode);
      setStep('summary');
    } catch {
      // The error surfaces on the upload step via analyze.error.
      setStep('upload');
    }
  };

  /** Which row's inline button is waiting on the server, so only that one disables. */
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const handleDecideInline = async (record: MigrationRecord, decision: RecordDecision) => {
    setDecidingId(record.id);
    try {
      await saveDecision.mutateAsync({ recordId: record.id, decision });
      toast({
        icon: 'success',
        title: decision.action === 'SKIP'
          ? `Row ${record.csvRowNumber} skipped`
          : `Row ${record.csvRowNumber} will import`,
      });
    } catch (error) {
      toast({ icon: 'error', title: error instanceof Error ? error.message : 'Could not save that' });
    } finally {
      setDecidingId(null);
    }
  };

  const handleSaveDecision = async (decision: RecordDecision) => {
    if (!reviewing) return;
    try {
      await saveDecision.mutateAsync({ recordId: reviewing.id, decision });
      toast({ icon: 'success', title: `Row ${reviewing.csvRowNumber} ${decision.action === 'SKIP' ? 'skipped' : 'approved'}` });
      setReviewing(null);
    } catch (error) {
      toast({ icon: 'error', title: error instanceof Error ? error.message : 'Could not save the decision' });
    }
  };

  const handleConfirm = async () => {
    setStep('result');
    try {
      await execute(25);
      toast({ icon: 'success', title: 'Import completed' });
    } catch {
      // Surfaced on the result screen, including what was already committed.
    }
  };

  const problemRecords = (recordsQuery.data?.records ?? []).filter(
    (record) => record.status === 'FAILED' || record.status === 'STALE',
  );

  const header = (
    <GlassHeader
      title="Compare & import"
      subtitle={
        migrationCode
          ? `${migrationCode} · ${runData?.run.fileName ?? ''}`
          : 'Check this file against your existing leads'
      }
      icon={<KTIcon iconName="data" className="fs-1" />}
      onClose={handleClose}
      onBack={reviewing ? () => setReviewing(null) : undefined}
      backLabel="Back to the record list"
    />
  );

  return (
    // xl: step 3 is a side-by-side comparison of a spreadsheet row against a lead,
    // and at lg every change wrapped onto three lines.
    <GlassDialog open={show} onClose={handleClose} header={header} maxWidth="xl" fullWidth>
      <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {!reviewing && (
          <Box sx={{ mb: 2 }}>
            <WtStepper steps={STEPS} activeStep={RAIL_INDEX[step]} />
          </Box>
        )}

        {reviewing ? (
          <ReconciliationPanel
            record={reviewing}
            saving={saveDecision.isPending}
            onSave={handleSaveDecision}
            onClose={() => setReviewing(null)}
          />
        ) : (
          <>
            {step === 'upload' && (
              <SavedRunsPanel
                runs={savedRuns}
                loading={savedRunsLoading}
                deletingId={deleteRun.isPending ? deleteRun.variables ?? null : null}
                onResume={handleResume}
                onDelete={(run) => deleteRun.mutateAsync(run.id).then(() => undefined)}
              />
            )}

            {step === 'upload' && (
              <CsvUploadStep
                columns={columns}
                submitting={analyze.isPending}
                busyLabel="Comparing…"
                error={analyze.error instanceof Error ? analyze.error.message : null}
                onSubmit={handleAnalyze}
                intro="Upload a CSV whose headers match the column names below. Nothing is written until you review the changes and confirm."
                primaryLabel="Columns used to find the matching lead"
                secondaryLabel="Other supported columns"
                submitLabel="Compare →"
                readyVerb="compare"
                templateFileName="lead-compare-template.csv"
              />
            )}

            {step === 'analyzing' && (
              <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                <CircularProgress />
                {/* Honest state: this really is the server working, with no fake timeline. */}
                <Box sx={{ color: 'text.secondary' }}>
                  Reading the file, finding the matching leads and comparing every field…
                </Box>
              </Stack>
            )}

            {step === 'summary' && summary && (
              <Stack spacing={2}>
                <AnalysisSummary
                  summary={summary}
                  migrationCode={migrationCode}
                  columnLabels={columnLabels}
                />
                <Stack direction="row" justifyContent="flex-end">
                  <WtButton onClick={() => setStep('review')}>Review changes</WtButton>
                </Stack>
              </Stack>
            )}

            {step === 'review' && (
              <Stack spacing={2}>
                <BulkDecisionBar
                  filter={filter}
                  applying={bulkDecision.isPending}
                  affectedLabel={filter === 'all' ? 'every row' : `every row under "${filterLabel(filter)}"`}
                  onApply={async (input) => {
                    try {
                      const result = await bulkDecision.mutateAsync(input);
                      toast({ icon: 'success', title: `${result.affected} records updated` });
                    } catch (error) {
                      toast({ icon: 'error', title: error instanceof Error ? error.message : 'Bulk update failed' });
                    }
                  }}
                />
                <MatchReviewTable
                  records={recordsQuery.data?.records ?? []}
                  total={recordsQuery.data?.total ?? 0}
                  page={page}
                  pageSize={recordsQuery.data?.pageSize ?? 25}
                  filter={filter}
                  search={search}
                  loading={recordsQuery.isLoading}
                  busyRecordId={saveDecision.isPending ? decidingId : null}
                  onFilterChange={setFilter}
                  onSearchChange={setSearch}
                  onPageChange={setPage}
                  onReview={setReviewing}
                  // Accept or skip straight from the list. The per-field dialog is
                  // still there for the rows that need it, but a run of a thousand
                  // rows cannot be a thousand dialogs.
                  onDecide={handleDecideInline}
                />
                <Stack direction="row" justifyContent="space-between">
                  <WtButton ghost onClick={() => setStep('summary')}>
                    Back to summary
                  </WtButton>
                  <WtButton onClick={() => setStep('confirm')}>Continue to confirmation</WtButton>
                </Stack>
              </Stack>
            )}


            {step === 'confirm' && summary && (
              <MigrationSummaryStep
                summary={summary}
                migrationCode={migrationCode}
                columnLabels={columnLabels}
                confirming={isRunning}
                onBack={() => setStep('review')}
                onConfirm={handleConfirm}
              />
            )}

            {step === 'result' && (
              <MigrationResult
                progress={progress}
                migrationCode={migrationCode}
                running={isRunning}
                error={executeError}
                problemRecords={problemRecords}
                onClose={handleClose}
                onReviewProblems={() => {
                  setFilter('failed');
                  setPage(1);
                  setStep('review');
                }}
              />
            )}

            {runLoading && step !== 'upload' && step !== 'analyzing' && !summary && (
              <Stack alignItems="center" sx={{ py: 4 }}>
                <CircularProgress size={24} />
              </Stack>
            )}
          </>
        )}
      </Box>
    </GlassDialog>
  );
}

export default LegacyMigrationWizard;

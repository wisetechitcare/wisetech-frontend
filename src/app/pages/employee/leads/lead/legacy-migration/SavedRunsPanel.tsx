import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import {
  GlassCard,
  ToneChip,
  WtButton,
  WtIconButton,
  type SemanticTone,
} from '@app/modules/common/components/ui';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { confirmDialog, toast } from '@app/modules/common/components/ui/feedback';
import { formatDateTime } from '@utils/dateFormats';
import type { SavedMigrationRun } from '@/types/legacyMigration';

/**
 * Saved uploads picker.
 *
 * The run — not the CSV file — is the workspace: it already holds every row, its
 * match, its field diff and the admin's decision. Before this existed the only
 * way back into a half-reviewed upload was to upload the file again, which
 * staged every row PENDING a second time and silently discarded the skips and
 * approvals already made. So this list is the resume path, and re-uploading is
 * reserved for genuinely new data.
 */

const STATUS_TONE: Record<SavedMigrationRun['status'], SemanticTone> = {
  ANALYZING: 'cyan',
  READY_FOR_REVIEW: 'warning',
  EXECUTING: 'cyan',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};

const STATUS_LABEL: Record<SavedMigrationRun['status'], string> = {
  ANALYZING: 'Analyzing',
  READY_FOR_REVIEW: 'In review',
  EXECUTING: 'Applying',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export default function SavedRunsPanel({
  runs,
  loading,
  deletingId,
  onResume,
  onDelete,
}: {
  runs: SavedMigrationRun[];
  loading: boolean;
  deletingId: string | null;
  onResume: (run: SavedMigrationRun) => void;
  onDelete: (run: SavedMigrationRun) => Promise<void>;
}) {
  // Nothing saved yet is the normal first-run state, not an error — say nothing
  // and let the upload form be the only thing on screen.
  if (!loading && !runs.length) return null;

  const handleDelete = async (run: SavedMigrationRun) => {
    const confirmed = await confirmDialog({
      icon: 'warning',
      title: `Delete ${run.migrationCode}?`,
      text:
        'This removes the upload and every review decision saved against it. Leads it already updated are not affected. This cannot be undone.',
      confirmText: 'Delete upload',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await onDelete(run);
      toast({ icon: 'success', title: `${run.migrationCode} deleted` });
    } catch (error) {
      toast({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Failed to delete the upload',
      });
    }
  };

  return (
    <Stack spacing={1.25} sx={{ mb: 2.5 }}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Saved uploads
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Pick up where you left off. Uploading the same file again starts a fresh
          comparison and does not carry your decisions across.
        </Typography>
      </Box>

      {loading && <LinearProgress />}

      {runs.map((run) => {
        const progress = run.totalRows ? Math.round((run.decidedRows / run.totalRows) * 100) : 0;
        // Confirming a few rows used to stamp the whole run COMPLETED. The server
        // now derives `resumable` from the rows themselves, so such a run is
        // reachable again — and the chip has to say so, or it reads "Completed"
        // beside a Resume button and a row count that plainly isn't finished.
        const status = run.resumable && run.status === 'COMPLETED' ? 'READY_FOR_REVIEW' : run.status;
        return (
          <GlassCard key={run.id} sx={{ p: 1.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography sx={{ fontWeight: 700 }} noWrap>
                    {run.migrationCode}
                  </Typography>
                  <ToneChip tone={STATUS_TONE[status]} label={STATUS_LABEL[status]} />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                  {run.fileName} · {formatDateTime(run.createdAt)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {run.decidedRows} of {run.totalRows} rows reviewed ({progress}%)
                  {run.openRows > 0 && ` · ${run.openRows} left`}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                {/* A completed or cancelled run is history: it can be deleted but
                    not reopened, because its decisions have already been applied. */}
                {run.resumable && (
                  <WtButton size="small" onClick={() => onResume(run)}>
                    Resume
                  </WtButton>
                )}
                <WtIconButton
                  title={`Delete ${run.migrationCode}`}
                  color="#dc2626"
                  disabled={deletingId === run.id || run.status === 'EXECUTING'}
                  onClick={() => handleDelete(run)}
                >
                  <AppIcon name="bi-trash" />
                </WtIconButton>
              </Stack>
            </Stack>
          </GlassCard>
        );
      })}
    </Stack>
  );
}

import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, WtButton, tonePair } from '@app/modules/common/components/ui';
import type { ResubmissionPreview } from '@services/reimbursementVersions';
import { ChangeSummaryTable } from './VersionHistoryDialog';

/**
 * The confirmation the spec requires before an edit to a submitted claim is committed.
 *
 * Two things have to be on this screen: WHAT is changing, field by field, and WHAT IT COSTS —
 * that approval restarts from level 1, discarding levels already cleared. An employee who edits a
 * claim their manager has already approved is undoing that approval, and the product should say
 * so before they do it, not after.
 *
 * The diff is computed server-side (`resubmission-preview`), so what is shown here is exactly what
 * the write will do — not a client-side guess that could disagree with it.
 */

export interface ResubmitConfirmDialogProps {
    open: boolean;
    preview: ResubmissionPreview | null;
    loading?: boolean;
    submitting?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function ResubmitConfirmDialog({
    open, preview, loading = false, submitting = false, onCancel, onConfirm,
}: ResubmitConfirmDialogProps) {
    const changes = preview?.changes ?? [];
    const willRestart = !!preview?.willRestart;
    const discarded = preview?.levelsAlreadyApproved ?? 0;

    return (
        <GlassDialog
            open={open}
            onClose={onCancel}
            maxWidth="sm"
            fullWidth
            header={
                <GlassHeader
                    title={willRestart ? 'Resubmit for approval' : 'Save changes'}
                    subtitle={willRestart ? 'Review what is changing before this goes back for approval' : undefined}
                    icon={<KTIcon iconName="arrows-circle" className="fs-1" />}
                    onClose={onCancel}
                />
            }
        >
            <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                {loading ? (
                    <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={26} /></Stack>
                ) : !willRestart ? (
                    // Nothing material moved. Saying so plainly matters: this is the spec's CASE 1,
                    // and the employee should know their answer did NOT cost them their approvals.
                    <Stack gap={1}>
                        <Stack direction="row" gap={1} alignItems="flex-start"
                            sx={{ p: 1.25, borderRadius: '8px', bgcolor: tonePair('success').soft }}>
                            <KTIcon iconName="check-circle" className="fs-5" />
                            <Typography sx={{ fontSize: 13, lineHeight: 1.5 }}>
                                Nothing about the claim has changed, so approval will continue exactly where it is.
                                Nothing restarts.
                            </Typography>
                        </Stack>
                    </Stack>
                ) : (
                    <>
                        <Box>
                            <Typography sx={{
                                fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                                letterSpacing: '0.05em', color: 'text.secondary', mb: 0.75,
                            }}>
                                What is changing
                            </Typography>
                            <ChangeSummaryTable changes={changes} />
                        </Box>

                        <Stack direction="row" gap={1} alignItems="flex-start"
                            sx={{ p: 1.25, borderRadius: '8px', bgcolor: tonePair('warning').soft }}>
                            <KTIcon iconName="information" className="fs-5" />
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                                    Because reimbursement details were changed, approval will restart from Level 1.
                                </Typography>
                                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5, mt: 0.4 }}>
                                    {discarded > 0
                                        ? `${discarded} approval${discarded === 1 ? '' : 's'} already given on the current version will no longer apply — the approvers signed off different details. Their decisions stay in this expense's history.`
                                        : 'Your approvers will review the updated details from the start of the chain.'}
                                    {preview?.currentLevel && preview?.totalLevels
                                        ? ` This claim is currently at level ${preview.currentLevel} of ${preview.totalLevels}.`
                                        : ''}
                                </Typography>
                            </Box>
                        </Stack>

                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            If you only meant to answer a question, close this and reply in the conversation
                            instead — that keeps your approvals.
                        </Typography>
                    </>
                )}

                <Stack direction="row" gap={1} justifyContent="flex-end" sx={{ pt: 0.5 }}>
                    <WtButton ghost onClick={onCancel} disabled={submitting}>Cancel</WtButton>
                    <WtButton onClick={onConfirm} disabled={submitting || loading}>
                        {submitting ? 'Saving…' : willRestart ? 'Resubmit for approval' : 'Save'}
                    </WtButton>
                </Stack>
            </Box>
        </GlassDialog>
    );
}

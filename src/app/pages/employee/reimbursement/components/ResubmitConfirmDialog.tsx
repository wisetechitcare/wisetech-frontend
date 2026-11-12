import { Alert, AlertDescription } from '@/ds/ui/alert';
import { Button } from '@/ds/ui/button';
import { Spinner } from '@/ds/ui/spinner';
import { FormDialog } from '@/ds/patterns/form-dialog';
import type { ResubmissionPreview } from '@services/reimbursementVersions';
import { ChangeSummaryTable, Eyebrow } from './VersionHistoryDialog';
import { RefreshCw, CircleCheck, Info } from 'lucide-react';

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
 *
 * Built on FormDialog rather than the kit's ConfirmDialog: that one closes itself after `onConfirm`
 * and is a title + sentence, whereas this stays open while the parent saves (`submitting`), shows a
 * loading state and a diff table, and the parent alone decides when it goes away.
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
        <FormDialog
            open={open}
            onOpenChange={(next) => { if (!next) onCancel(); }}
            title={willRestart ? 'Resubmit for approval' : 'Save changes'}
            description={willRestart ? 'Review what is changing before this goes back for approval' : undefined}
            icon={<RefreshCw />}
            footer={() => (
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
                    <Button onClick={onConfirm} disabled={submitting || loading}>
                        {submitting ? 'Saving…' : willRestart ? 'Resubmit for approval' : 'Save'}
                    </Button>
                </div>
            )}
        >
            <div className="flex min-w-0 flex-col gap-3">
                {loading ? (
                    <div className="flex justify-center py-10"><Spinner className="size-[26px] text-primary" /></div>
                ) : !willRestart ? (
                    // Nothing material moved. Saying so plainly matters: this is the spec's CASE 1,
                    // and the employee should know their answer did NOT cost them their approvals.
                    <Alert variant="success">
                        <CircleCheck aria-hidden />
                        <AlertDescription className="text-[13px] leading-normal">
                            Nothing about the claim has changed, so approval will continue exactly where it is.
                            Nothing restarts.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <div>
                            <Eyebrow className="mb-1.5">What is changing</Eyebrow>
                            <ChangeSummaryTable changes={changes} />
                        </div>

                        <Alert variant="warning">
                            <Info aria-hidden />
                            <AlertDescription className="min-w-0">
                                <span className="block text-[13px] font-bold leading-normal text-foreground">
                                    Because reimbursement details were changed, approval will restart from Level 1.
                                </span>
                                <span className="mt-1 block text-[12.5px] leading-normal text-muted-foreground">
                                    {discarded > 0
                                        ? `${discarded} approval${discarded === 1 ? '' : 's'} already given on the current version will no longer apply — the approvers signed off different details. Their decisions stay in this expense's history.`
                                        : 'Your approvers will review the updated details from the start of the chain.'}
                                    {preview?.currentLevel && preview?.totalLevels
                                        ? ` This claim is currently at level ${preview.currentLevel} of ${preview.totalLevels}.`
                                        : ''}
                                </span>
                            </AlertDescription>
                        </Alert>

                        <p data-slot="resubmit-hint" className="m-0 text-xs text-muted-foreground">
                            If you only meant to answer a question, close this and reply in the conversation
                            instead — that keeps your approvals.
                        </p>
                    </>
                )}
            </div>
        </FormDialog>
    );
}

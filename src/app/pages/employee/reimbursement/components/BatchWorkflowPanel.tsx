import { Box, Chip, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { ToneChip, WtButton, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';
import { fmtDate, fmtAmount, STATUS, type StatusNum } from '../utils/reimbursementFormat';

/**
 * The batch, described as a workflow rather than as a table of rows.
 *
 * The old batch view listed the lines and their status numbers and stopped there. It could not
 * say which LEVEL a request had reached, that a question was open on it, that it had been edited
 * and resubmitted, or how the batch as a whole was progressing — because none of that reached the
 * client. Two separate screens then re-derived a batch's mixed state from the status column alone,
 * which is the most any of them could do.
 *
 * All of it is now computed server-side (`getBatchWorkflowView`) and rendered here.
 */

// ─── Types (the shape the batch endpoint now returns) ────────────────────────

export interface ApprovalStepView {
    id: string;
    level: number;
    approverId: string;
    approverName: string | null;
    status: string;
    actedAt: string | null;
    comments: string | null;
}

export interface RequestApprovalView {
    instanceId: string;
    currentLevel: number;
    totalLevels: number;
    status: string;
    steps: ApprovalStepView[];
}

export interface QueryView {
    id: string;
    scope: 'REQUEST' | 'BATCH';
    status: 'OPEN' | 'ANSWERED' | 'RESOLVED' | 'REOPENED';
    category: string;
    level: number | null;
    messageCount: number;
    lastMessage: string | null;
    lastMessageRole: 'APPROVER' | 'EMPLOYEE' | null;
    lastMessageAt: string | null;
    awaitingRole: 'APPROVER' | 'EMPLOYEE' | null;
}

export interface LevelProgressView {
    level: number;
    approverId: string | null;
    approverName: string | null;
    approved: number;
    rejected: number;
    queried: number;
    pending: number;
    notStarted: number;
}

export interface BatchSummaryView {
    totalRequests: number;
    totalAmount: number;
    approved: number;
    approvedAmount: number;
    rejected: number;
    rejectedAmount: number;
    queried: number;
    queriedAmount: number;
    pending: number;
    pendingAmount: number;
    resubmitted: number;
    inProgress: number;
    inProgressAmount: number;
    openQueries: number;
    paidAmount: number;
}

// ─── Status presentation ─────────────────────────────────────────────────────

const STATUS_TONE: Record<number, { tone: SemanticTone; label: string }> = {
    [STATUS.PENDING]: { tone: 'warning', label: 'Pending' },
    [STATUS.APPROVED]: { tone: 'success', label: 'Approved' },
    [STATUS.REJECTED]: { tone: 'danger', label: 'Rejected' },
    [STATUS.NEEDS_INFO]: { tone: 'cyan', label: 'Query' },
};

const BATCH_STATUS_TONE: Record<string, { tone: SemanticTone; label: string }> = {
    PENDING: { tone: 'warning', label: 'Pending' },
    PARTIALLY_PROCESSED: { tone: 'indigo', label: 'Partially processed' },
    APPROVED: { tone: 'success', label: 'Approved' },
    REJECTED: { tone: 'danger', label: 'Rejected' },
};

const inr = (v: unknown) => `₹${fmtAmount(v as number)}`;

/**
 * Where one request has got to, in words.
 *
 * Whose desk it is on, not which ordinal it has reached — a request that has cleared level 1 used
 * to look identical to one nobody had opened, and "Level 2 of 3" only stopped being a riddle once
 * the reader worked out who level 2 is. The level survives in the step chips' tooltips.
 */
function levelCaption(status: number, approval: RequestApprovalView | null): string {
    if (!approval) return status === STATUS.APPROVED ? 'Fully approved' : '';
    if (status === STATUS.APPROVED) return `Approved through all ${approval.totalLevels} level${approval.totalLevels === 1 ? '' : 's'}`;
    if (status === STATUS.REJECTED) {
        const at = approval.steps.find((s) => s.status === 'rejected');
        if (!at) return 'Rejected';
        return at.approverName ? `Rejected by ${at.approverName}` : `Rejected at level ${at.level}`;
    }
    const cleared = approval.steps.filter((s) => s.status === 'approved').length;
    const current = approval.steps.find((s) => s.level === approval.currentLevel);
    const at = current?.approverName
        ? `With ${current.approverName}`
        : `Level ${approval.currentLevel} of ${approval.totalLevels}`;
    return cleared > 0 ? `${at} · ${cleared} cleared` : at;
}

// The per-level "Approval progress" ladder used to sit here. It restated what the status bar and
// the request rows already say — the level, its approver, its counts — and `LevelProgressView` is
// still built because the status bar reads it to work out whose turn it is.

// ─── Batch summary ───────────────────────────────────────────────────────────

export function BatchSummaryStrip({ summary, processingStatus }: {
    summary: BatchSummaryView;
    processingStatus: string;
}) {
    const status = BATCH_STATUS_TONE[processingStatus] ?? BATCH_STATUS_TONE.PENDING;
    const pills: Array<{ label: string; tone: SemanticTone }> = [];
    if (summary.approved) pills.push({ label: `${summary.approved} approved`, tone: 'success' });
    if (summary.queried) pills.push({ label: `${summary.queried} query`, tone: 'cyan' });
    if (summary.rejected) pills.push({ label: `${summary.rejected} rejected`, tone: 'danger' });
    // `pending` counts every undecided line, `inProgress` the ones already past a level. Shown as
    // one number they contradicted the rows underneath: five "pending" over four rows reading
    // "L1 approved · L2 now".
    const awaitingLevel = Math.max(0, summary.pending - summary.inProgress);
    if (awaitingLevel) pills.push({ label: `${awaitingLevel} pending`, tone: 'warning' });
    if (summary.inProgress) pills.push({ label: `${summary.inProgress} with next approver`, tone: 'neutral' });
    if (summary.resubmitted) pills.push({ label: `${summary.resubmitted} resubmitted`, tone: 'indigo' });

    return (
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ minWidth: 0 }}>
            <ToneChip tone={status.tone} label={status.label} solid size="small" />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {summary.totalRequests} request{summary.totalRequests === 1 ? '' : 's'} · {inr(summary.totalAmount)}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" gap={0.5} flexWrap="wrap">
                {pills.map((p) => <ToneChip key={p.label} tone={p.tone} label={p.label} size="small" />)}
            </Stack>
        </Stack>
    );
}

// ─── One request ─────────────────────────────────────────────────────────────

export interface RequestRowData {
    id: string;
    description?: string | null;
    amount?: number | string | null;
    expenseDate?: string | null;
    status: number;
    paymentStatus?: string | null;
    rejectReason?: string | null;
    isExceedingLimit?: boolean | null;
    currentVersion?: number;
    resubmitCount?: number;
    reimbursementType?: { type?: string | null } | null;
    approval?: RequestApprovalView | null;
    queries?: QueryView[];
    openQueryCount?: number;
    document?: string | null;
    fromLocation?: string | null;
    toLocation?: string | null;
    clientCompany?: { id: string; companyName: string | null } | null;
    lead?: { id: string; title: string | null } | null;
}

export interface RequestRowProps {
    request: RequestRowData;
    /** The viewer may decide THIS request right now. */
    canDecide: boolean;
    busy: boolean;
    onApprove: () => void;
    onReject: () => void;
    onQuery: () => void;
    onOpenConversation: (queryId: string) => void;
    onViewDocument?: (url: string) => void;
    /** Opens the version timeline. Absent on screens that do not offer it. */
    onOpenVersionHistory?: () => void;
    /**
     * Which side of the conversation this reader is on. Drives whether the question offers them
     * anything: the thread knows which ROLE owes the next message, not which person is looking.
     */
    viewerRole?: 'EMPLOYEE' | 'APPROVER' | null;
    /** Closes the thread outright. Approver-only, and absent on screens that do not offer it. */
    onResolveQuery?: (queryId: string) => void;
}

export function RequestWorkflowRow({
    request, canDecide, busy, onApprove, onReject, onQuery, onOpenConversation, onViewDocument,
    onOpenVersionHistory, viewerRole, onResolveQuery,
}: RequestRowProps) {
    const theme = useTheme();
    const status = STATUS_TONE[request.status] ?? STATUS_TONE[STATUS.PENDING];
    const pair = tonePair(status.tone);
    const approval = request.approval ?? null;
    const liveQuery = (request.queries ?? []).find((q) => q.status !== 'RESOLVED')
        ?? (request.queries ?? [])[0];
    const caption = levelCaption(request.status, approval);
    const resubmitted = (request.resubmitCount ?? 0) > 0;

    return (
        <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 1,
            p: { xs: 1.5, sm: 1.75 }, borderRadius: '12px', minWidth: 0,
            border: `1px solid ${theme.palette.divider}`,
            borderLeft: `4px solid ${pair.fg}`,
            bgcolor: request.isExceedingLimit ? tonePair('danger').soft : 'background.paper',
        }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'flex-start' }} sx={{ minWidth: 0 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                        <ToneChip tone={status.tone} label={status.label} size="small" />
                        {resubmitted && (
                            <Tooltip title={`Edited and resubmitted — now version ${request.currentVersion}`}>
                                <span>
                                    <ToneChip tone="indigo" label={`Resubmitted · v${request.currentVersion}`} size="small" />
                                </span>
                            </Tooltip>
                        )}
                        {request.isExceedingLimit && <ToneChip tone="danger" label="Over limit" size="small" />}
                        {request.paymentStatus === 'PAID' && <ToneChip tone="success" label="Paid" size="small" />}
                    </Stack>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mt: 0.75 }}>
                        {request.description || 'Expense'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                        {[
                            fmtDate(request.expenseDate),
                            request.reimbursementType?.type,
                            caption,
                        ].filter(Boolean).join(' · ')}
                    </Typography>
                    {(request.fromLocation || request.toLocation) && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <KTIcon iconName="geolocation" className="fs-7 text-muted" />
                            <span>
                                <b>Route:</b> {request.fromLocation || '—'} → {request.toLocation || '—'}
                            </span>
                        </Typography>
                    )}
                    {(request.clientCompany?.companyName || request.lead?.title) && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <KTIcon iconName="briefcase" className="fs-7 text-muted" />
                            <span>
                                {request.clientCompany?.companyName && (
                                    <><b>Client:</b> {request.clientCompany.companyName}</>
                                )}
                                {request.clientCompany?.companyName && request.lead?.title && ' · '}
                                {request.lead?.title && (
                                    <><b>Project:</b> {request.lead.title}</>
                                )}
                            </span>
                        </Typography>
                    )}
                </Box>
                <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary' }}>
                        {inr(request.amount)}
                    </Typography>
                    {onOpenVersionHistory && (
                        <Typography
                            component="button"
                            onClick={onOpenVersionHistory}
                            sx={{
                                mt: 0.25, fontSize: 11.5, fontWeight: 600, color: 'text.secondary',
                                background: 'none', border: 'none', p: 0, cursor: 'pointer',
                            }}
                        >
                            History{(request.currentVersion ?? 1) > 1 ? ` (v${request.currentVersion})` : ''}
                        </Typography>
                    )}
                    {request.document && onViewDocument && (
                        <Typography
                            component="button"
                            onClick={() => onViewDocument(request.document!)}
                            sx={{
                                mt: 0.25, fontSize: 11.5, fontWeight: 600, color: 'primary.main',
                                background: 'none', border: 'none', p: 0, cursor: 'pointer',
                            }}
                        >
                            View receipt
                        </Typography>
                    )}
                </Stack>
            </Stack>

            {/* The approver's note — a rejection reason, or the open question. Labelled, because
                the two used to share one column and were told apart only by a status number. */}
            {liveQuery && (() => {
                const isWaitingOnEmployee = liveQuery.awaitingRole === 'EMPLOYEE';
                const toneKey = isWaitingOnEmployee ? 'warning' : 'cyan';
                const pair = tonePair(toneKey);
                /** The thread is waiting on the role this reader holds — theirs to answer. */
                const myTurn = !!viewerRole && liveQuery.awaitingRole === viewerRole;
                return (
                    <Box sx={{
                        borderRadius: '8px', p: 1.25, minWidth: 0,
                        bgcolor: pair.soft,
                        border: `1px solid ${pair.soft}`,
                        borderLeft: `3px solid ${pair.fg}`,
                    }}>
                        <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                            <Box component="span" sx={{ color: pair.fg, display: 'inline-flex' }}>
                                <KTIcon iconName="message-text-2" className="fs-6" />
                            </Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: pair.fg }}>
                                {liveQuery.scope === 'BATCH' ? 'Batch query' : 'Query'}
                                {liveQuery.level ? ` · level ${liveQuery.level}` : ''}
                            </Typography>
                            <Chip size="small" variant="outlined"
                                sx={{
                                    height: 18, fontSize: 10,
                                    color: pair.fg, borderColor: pair.fg,
                                    bgcolor: 'background.paper', fontWeight: 600,
                                }}
                                label={
                                    liveQuery.awaitingRole === 'EMPLOYEE' ? 'Awaiting employee response'
                                        : liveQuery.awaitingRole === 'APPROVER' ? 'Employee responded'
                                            : 'Resolved'
                                } />
                            <Box sx={{ flex: 1 }} />
                            <Typography
                                component="button"
                                onClick={() => onOpenConversation(liveQuery.id)}
                                sx={{
                                    fontSize: 11.5, fontWeight: 700, color: 'primary.main',
                                    background: 'none', border: 'none', p: 0, cursor: 'pointer', flexShrink: 0,
                                }}
                            >
                                Open conversation ({liveQuery.messageCount})
                            </Typography>
                        </Stack>
                        {liveQuery.lastMessage && (
                            <Typography sx={{ fontSize: 12.5, color: 'text.primary', mt: 0.5, lineHeight: 1.45 }}>
                                <b>{liveQuery.lastMessageRole === 'EMPLOYEE' ? 'Employee' : 'Approver'}:</b>{' '}
                                {liveQuery.lastMessage}
                            </Typography>
                        )}

                        {/* The two moves a question actually has, on the question itself. Reaching
                            them used to mean leaving for the queue and finding the expense again.
                            Resolve is the approver's alone — it is what closes the thread. */}
                        {liveQuery.status !== 'RESOLVED' && (viewerRole === 'APPROVER' || myTurn) && (
                            <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="flex-end" sx={{ mt: 1 }}>
                                {myTurn && (
                                    <WtButton size="small" disabled={busy} onClick={() => onOpenConversation(liveQuery.id)}>
                                        Respond
                                    </WtButton>
                                )}
                                {viewerRole === 'APPROVER' && onResolveQuery && (
                                    <WtButton size="small" ghost disabled={busy} onClick={() => onResolveQuery(liveQuery.id)}>
                                        Resolve
                                    </WtButton>
                                )}
                            </Stack>
                        )}
                    </Box>
                );
            })()}

            {/* Why this request is back at level 1. Without it, an approver seeing a request they
                already approved reappear at the start of the chain has no explanation for it. */}
            {resubmitted && (request.approval?.currentLevel ?? 1) === 1 && request.status !== STATUS.APPROVED && (
                <Stack direction="row" gap={0.75} alignItems="flex-start"
                    sx={{ p: 1, borderRadius: '8px', bgcolor: tonePair('indigo').soft, minWidth: 0 }}>
                    <KTIcon iconName="information" className="fs-6" />
                    <Typography sx={{ fontSize: 12, lineHeight: 1.45, minWidth: 0 }}>
                        Approval restarted from Level 1 because reimbursement details were modified.
                        {onOpenVersionHistory && (
                            <>
                                {' '}
                                <Typography
                                    component="button"
                                    onClick={onOpenVersionHistory}
                                    sx={{
                                        fontSize: 12, fontWeight: 700, color: 'primary.main',
                                        background: 'none', border: 'none', p: 0, cursor: 'pointer',
                                    }}
                                >
                                    See what changed
                                </Typography>
                            </>
                        )}
                    </Typography>
                </Stack>
            )}

            {request.status === STATUS.REJECTED && request.rejectReason && (
                <Box sx={{ borderRadius: '8px', p: 1.25, bgcolor: tonePair('danger').soft, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: tonePair('danger').fg }}>
                        Rejection reason
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.primary', mt: 0.25, lineHeight: 1.45 }}>
                        {request.rejectReason}
                    </Typography>
                </Box>
            )}

            {/* Per-level history — who decided what, and what they said. */}
            {approval && approval.steps.some((s) => s.status !== 'pending') && (
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                    {approval.steps.map((step) => {
                        // A rejection ends the request there — the levels above it are never asked.
                        // Their steps stay 'pending' in the table, and rendering that verbatim put
                        // an "L2 pending" chip on a rejected line, which reads as still travelling.
                        const settled = request.status === STATUS.REJECTED
                            || request.status === STATUS.APPROVED
                            || (approval.status !== 'pending' && approval.status !== undefined);
                        const untouched = step.status === 'pending';
                        const tone: SemanticTone = step.status === 'approved' ? 'success'
                            : step.status === 'rejected' ? 'danger'
                                : settled ? 'neutral'
                                    : step.level === approval.currentLevel ? 'warning' : 'neutral';
                        // The person, not the level number. "L2 now" makes the reader map a number
                        // onto a colleague before it means anything; the name IS the information,
                        // and the tooltip still carries the level for anyone who wants it.
                        const who = step.approverName || `L${step.level}`;
                        const label = untouched
                            ? (settled ? `${who} · not needed`
                                : step.level === approval.currentLevel ? `${who} · now` : `${who} · pending`)
                            : `${who} · ${step.status}`;
                        return (
                            <Tooltip
                                key={step.id}
                                title={[
                                    `Level ${step.level}${step.approverName ? ` · ${step.approverName}` : ''}`,
                                    step.status,
                                    step.comments || null,
                                ].filter(Boolean).join(' — ')}
                            >
                                <span>
                                    <ToneChip tone={tone} size="small" dense label={label} />
                                </span>
                            </Tooltip>
                        );
                    })}
                </Stack>
            )}

            {canDecide && (
                <Stack direction="row" gap={0.75} sx={{ pt: 0.25 }}>
                    <Chip
                        label="Approve" size="small" disabled={busy} onClick={onApprove} clickable
                        sx={{ fontWeight: 700, bgcolor: tonePair('success').soft, color: tonePair('success').fg }}
                    />
                    <Chip
                        label="Reject" size="small" disabled={busy} onClick={onReject} clickable
                        sx={{ fontWeight: 700, bgcolor: tonePair('danger').soft, color: tonePair('danger').fg }}
                    />
                    <Chip
                        label="Ask a question" size="small" disabled={busy} onClick={onQuery} clickable
                        sx={{ fontWeight: 700, bgcolor: tonePair('cyan').soft, color: tonePair('cyan').fg }}
                    />
                </Stack>
            )}
        </Box>
    );
}

export { STATUS_TONE, BATCH_STATUS_TONE, levelCaption };
export type { StatusNum };

export default RequestWorkflowRow;

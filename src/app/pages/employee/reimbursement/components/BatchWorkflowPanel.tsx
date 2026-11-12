import type { CSSProperties } from 'react';
import { Briefcase, History, Info, MapPin, MessageSquareText, Paperclip, TriangleAlert } from 'lucide-react';
import { cn } from '@/ds/lib/utils';
import { toneStyle, type Tone } from '@/ds/lib/tone';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/ds/ui/alert';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { fmtDate, formatMoney, STATUS, type StatusNum } from '../utils/reimbursementFormat';
import { canResolveQuery } from '@services/reimbursementQueries';

/**
 * The batch, described as a workflow rather than as a table of rows.
 *
 * The old batch view listed the lines and their status numbers and stopped there. It could not
 * say which LEVEL a request had reached, that a question was open on it, that it had been edited
 * and resubmitted, or how the batch as a whole was progressing — because none of that reached the
 * client. Two separate screens then re-derived a batch's mixed state from the status column alone,
 * which is the most any of them could do.
 *
 * All of it is now computed server-side (`getBatchWorkflowView`) and rendered here — in the design
 * system (Badge, Alert, Button, Tooltip); no MUI.
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

/** Kit tones (Badge variants / toneStyle). A query is the cyan hue: a conversation, not a verdict. */
const STATUS_TONE: Record<number, { tone: Tone; label: string }> = {
    [STATUS.PENDING]: { tone: 'warning', label: 'Pending' },
    [STATUS.APPROVED]: { tone: 'success', label: 'Approved' },
    [STATUS.REJECTED]: { tone: 'danger', label: 'Rejected' },
    [STATUS.NEEDS_INFO]: { tone: 'cyan', label: 'Query' },
};

const BATCH_STATUS_TONE: Record<string, { tone: Tone; label: string }> = {
    PENDING: { tone: 'warning', label: 'Pending' },
    PARTIALLY_PROCESSED: { tone: 'purple', label: 'Partially Processed' },
    APPROVED: { tone: 'success', label: 'Approved' },
    REJECTED: { tone: 'danger', label: 'Rejected' },
};

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

/** Batch status, its size and worth, and a count per state — one line above the requests. */
export function BatchSummaryStrip({ summary, processingStatus }: {
    summary: BatchSummaryView;
    processingStatus: string;
}) {
    const status = BATCH_STATUS_TONE[processingStatus] ?? BATCH_STATUS_TONE.PENDING;
    const pills: Array<{ label: string; tone: Tone }> = [];
    if (summary.approved) pills.push({ label: `${summary.approved} approved`, tone: 'success' });
    if (summary.queried) pills.push({ label: `${summary.queried} query`, tone: 'cyan' });
    if (summary.rejected) pills.push({ label: `${summary.rejected} rejected`, tone: 'danger' });
    // `pending` counts every undecided line, `inProgress` the ones already past a level. Shown as
    // one number they contradicted the rows underneath: five "pending" over four rows reading
    // "L1 approved · L2 now".
    const awaitingLevel = Math.max(0, summary.pending - summary.inProgress);
    if (awaitingLevel) pills.push({ label: `${awaitingLevel} pending`, tone: 'warning' });
    if (summary.inProgress) pills.push({ label: `${summary.inProgress} with next approver`, tone: 'neutral' });
    if (summary.resubmitted) pills.push({ label: `${summary.resubmitted} resubmitted`, tone: 'purple' });

    return (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant={status.tone} dot>{status.label}</Badge>
            <span className="tabular text-sm text-muted-foreground">
                {summary.totalRequests} request{summary.totalRequests === 1 ? '' : 's'} · {formatMoney(summary.totalAmount)}
            </span>
            {pills.length > 0 && (
                <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    {pills.map((p) => <Badge key={p.label} variant={p.tone}>{p.label}</Badge>)}
                </span>
            )}
        </div>
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
    viewerCanDecide?: boolean;
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

/** A tint for a row action (Button story "Tinted": the label in the tone, a pastel of it behind). */
const tint = (color: string) => ({ '--tint': color }) as CSSProperties;

/** A line of facts with a leading icon (route, client · project). */
function FactLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <p className="m-0 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-3.5 [&>svg]:shrink-0">
            {icon}
            <span className="min-w-0 break-words">{children}</span>
        </p>
    );
}

/**
 * One expense in a batch: its status and badges, what it was, where it is in the chain, the money,
 * any open question or rejection reason, who decided what at each level, and — when it is yours —
 * Approve / Reject / Ask a Question.
 *
 * A card with a 4px edge in its status tone (the DataTable's toned-row recipe), so a batch of mixed
 * outcomes reads at a glance down the left edge.
 */
export function RequestWorkflowRow({
    request, canDecide, busy, onApprove, onReject, onQuery, onOpenConversation, onViewDocument,
    onOpenVersionHistory, viewerRole, onResolveQuery,
}: RequestRowProps) {
    const status = STATUS_TONE[request.status] ?? STATUS_TONE[STATUS.PENDING];
    const approval = request.approval ?? null;
    const liveQuery = (request.queries ?? []).find((q) => q.status !== 'RESOLVED')
        ?? (request.queries ?? [])[0];
    const caption = levelCaption(request.status, approval);
    const resubmitted = (request.resubmitCount ?? 0) > 0;
    const label = request.description || 'Expense';

    return (
        <article
            data-slot="request-workflow-row"
            aria-label={`${label}, ${status.label}`}
            style={toneStyle(status.tone)}
            className={cn(
                'flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-4 shadow-[inset_4px_0_0_var(--tone)]',
                // Over the claim limit: the whole card carries the danger tint, as the old row did.
                request.isExceedingLimit ? 'bg-destructive-soft/40' : 'bg-card',
            )}
        >
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={status.tone} dot>{status.label}</Badge>
                        {resubmitted && (
                            <Tooltip>
                                <TooltipTrigger render={<Badge variant="purple" tabIndex={0} />}>
                                    Resubmitted · v{request.currentVersion}
                                </TooltipTrigger>
                                <TooltipContent>Edited and resubmitted — now version {request.currentVersion}</TooltipContent>
                            </Tooltip>
                        )}
                        {request.isExceedingLimit && <Badge variant="danger"><TriangleAlert aria-hidden /> Over Limit</Badge>}
                        {request.paymentStatus === 'PAID' && <Badge variant="success">Paid</Badge>}
                    </div>
                    <h4 className="m-0 pt-1 text-sm font-semibold text-foreground">{label}</h4>
                    <p className="m-0 text-xs text-muted-foreground">
                        {[fmtDate(request.expenseDate), request.reimbursementType?.type, caption].filter(Boolean).join(' · ')}
                    </p>
                    {(request.fromLocation || request.toLocation) && (
                        <FactLine icon={<MapPin aria-hidden />}>
                            <b className="font-semibold text-foreground">Route:</b> {request.fromLocation || '—'} → {request.toLocation || '—'}
                        </FactLine>
                    )}
                    {(request.clientCompany?.companyName || request.lead?.title) && (
                        <FactLine icon={<Briefcase aria-hidden />}>
                            {request.clientCompany?.companyName && (
                                <><b className="font-semibold text-foreground">Client:</b> {request.clientCompany.companyName}</>
                            )}
                            {request.clientCompany?.companyName && request.lead?.title && ' · '}
                            {request.lead?.title && (
                                <><b className="font-semibold text-foreground">Project:</b> {request.lead.title}</>
                            )}
                        </FactLine>
                    )}
                </div>
                <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                    <span className="tabular text-base font-bold text-foreground">{formatMoney(request.amount)}</span>
                    <span className="flex flex-wrap items-center gap-1">
                        {request.document && onViewDocument && (
                            <Button variant="ghost" size="xs" onClick={() => onViewDocument(request.document!)}>
                                <Paperclip data-icon="inline-start" aria-hidden /> View Receipt
                            </Button>
                        )}
                        {onOpenVersionHistory && (
                            <Button variant="ghost" size="xs" onClick={onOpenVersionHistory}>
                                <History data-icon="inline-start" aria-hidden />
                                History{(request.currentVersion ?? 1) > 1 ? ` (v${request.currentVersion})` : ''}
                            </Button>
                        )}
                    </span>
                </div>
            </div>

            {/* The approver's note — the open question. Labelled, because a question and a rejection
                used to share one column and were told apart only by a status number. `role="note"`:
                it is part of the record, not an interruption to announce. */}
            {liveQuery && (() => {
                const waitingOnEmployee = liveQuery.awaitingRole === 'EMPLOYEE';
                /** The thread is waiting on the role this reader holds — theirs to answer. */
                const myTurn = !!viewerRole && liveQuery.awaitingRole === viewerRole;
                const canResolve = viewerRole === 'APPROVER' && !!onResolveQuery && canResolveQuery(liveQuery.status);
                return (
                    <Alert variant={waitingOnEmployee ? 'warning' : 'info'} role="note">
                        <MessageSquareText aria-hidden />
                        <AlertTitle className="flex flex-wrap items-center gap-1.5">
                            {liveQuery.scope === 'BATCH' ? 'Batch Query' : 'Query'}
                            {liveQuery.level ? ` · Level ${liveQuery.level}` : ''}
                            <Badge variant="neutral" className="bg-background/70">
                                {liveQuery.awaitingRole === 'EMPLOYEE' ? 'Awaiting Employee Response'
                                    : liveQuery.awaitingRole === 'APPROVER' ? 'Employee Responded'
                                        : 'Resolved'}
                            </Badge>
                        </AlertTitle>
                        {liveQuery.lastMessage && (
                            <AlertDescription className="text-foreground">
                                <b>{liveQuery.lastMessageRole === 'EMPLOYEE' ? 'Employee' : 'Approver'}:</b> {liveQuery.lastMessage}
                            </AlertDescription>
                        )}
                        {/* The moves a question actually has, on the question itself. Respond when it is this
                            reader's turn; Resolve only once the employee has answered (the server refuses
                            anything else) — and the row renders only when it holds something. */}
                        <AlertDescription className="col-start-2 mt-2 flex flex-wrap items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => onOpenConversation(liveQuery.id)}>
                                Open Conversation ({liveQuery.messageCount})
                            </Button>
                            {liveQuery.status !== 'RESOLVED' && myTurn && (
                                <Button size="sm" disabled={busy} onClick={() => onOpenConversation(liveQuery.id)}>Respond</Button>
                            )}
                            {liveQuery.status !== 'RESOLVED' && canResolve && (
                                <Button variant="outline" size="sm" disabled={busy} onClick={() => onResolveQuery!(liveQuery.id)}>Resolve</Button>
                            )}
                        </AlertDescription>
                    </Alert>
                );
            })()}

            {/* Why this request is back at level 1. Without it, an approver seeing a request they
                already approved reappear at the start of the chain has no explanation for it. */}
            {resubmitted && (request.approval?.currentLevel ?? 1) === 1 && request.status !== STATUS.APPROVED && (
                <Alert variant="info" role="note">
                    <Info aria-hidden />
                    <AlertDescription className="text-foreground">
                        Approval restarted from Level 1 because reimbursement details were modified.
                    </AlertDescription>
                    {onOpenVersionHistory && (
                        <AlertAction>
                            <Button variant="link" size="xs" onClick={onOpenVersionHistory}>See What Changed</Button>
                        </AlertAction>
                    )}
                </Alert>
            )}

            {request.status === STATUS.REJECTED && request.rejectReason && (
                <Alert variant="danger" role="note">
                    <TriangleAlert aria-hidden />
                    <AlertTitle>Rejection Reason</AlertTitle>
                    <AlertDescription className="text-foreground">{request.rejectReason}</AlertDescription>
                </Alert>
            )}

            {/* Per-level history — who decided what, and what they said. */}
            {approval && approval.steps.some((s) => s.status !== 'pending') && (
                <ul aria-label="Approval steps" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {approval.steps.map((step) => {
                        // A rejection ends the request there — the levels above it are never asked.
                        // Their steps stay 'pending' in the table, and rendering that verbatim put
                        // an "L2 pending" chip on a rejected line, which reads as still travelling.
                        const settled = request.status === STATUS.REJECTED
                            || request.status === STATUS.APPROVED
                            || (approval.status !== 'pending' && approval.status !== undefined);
                        const untouched = step.status === 'pending';
                        const tone: Tone = step.status === 'approved' ? 'success'
                            : step.status === 'rejected' ? 'danger'
                                : settled ? 'neutral'
                                    : step.level === approval.currentLevel ? 'warning' : 'neutral';
                        // The person, not the level number. "L2 now" makes the reader map a number
                        // onto a colleague before it means anything; the name IS the information,
                        // and the tooltip still carries the level for anyone who wants it.
                        const who = step.approverName || `L${step.level}`;
                        const text = untouched
                            ? (settled ? `${who} · not needed`
                                : step.level === approval.currentLevel ? `${who} · now` : `${who} · pending`)
                            : `${who} · ${step.status}`;
                        const detail = [
                            `Level ${step.level}${step.approverName ? ` · ${step.approverName}` : ''}`,
                            step.status,
                            step.comments || null,
                        ].filter(Boolean).join(' — ');
                        return (
                            <li key={step.id}>
                                <Tooltip>
                                    <TooltipTrigger render={<Badge variant={tone} tabIndex={0} />}>{text}</TooltipTrigger>
                                    <TooltipContent>{detail}</TooltipContent>
                                </Tooltip>
                            </li>
                        );
                    })}
                </ul>
            )}

            {canDecide && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Button variant="tinted" size="sm" style={tint('var(--cta-success)')} disabled={busy} onClick={onApprove}>Approve</Button>
                    <Button variant="tinted" size="sm" style={tint('var(--cta-danger)')} disabled={busy} onClick={onReject}>Reject</Button>
                    <Button variant="tinted" size="sm" disabled={busy} onClick={onQuery}>Ask a Question</Button>
                </div>
            )}
        </article>
    );
}

export { STATUS_TONE, BATCH_STATUS_TONE, levelCaption };
export type { StatusNum };

export default RequestWorkflowRow;

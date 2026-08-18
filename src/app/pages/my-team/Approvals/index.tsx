import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Stack, Typography, useTheme } from '@mui/material';
import { PageTitle } from '@metronic/layout/core';
import { KTIcon } from '@metronic/helpers';
import { getSocket } from '@utils/socketClient';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { usePermission } from '@hooks/usePermission';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import {
    fetchPendingApprovals, fetchAllApprovalInstances, processApprovalAction,
} from '@services/employee';
import { fetchInboxTasks, acknowledgeInboxTask, type InboxTask } from '@services/inbox';
import { ToneChip, WtButton, tonePair } from '@app/modules/common/components/ui';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import type { SemanticTone } from '@app/theme/tokens';
import { RejectReasonModal } from '@pages/employee/reimbursement/shared/ReimbursementBatchShared';
import { BatchDetailModal } from '@pages/employee/reimbursement/shared/ReimbursementBatchShared';
import QueryConversationDialog from '@pages/employee/reimbursement/components/QueryConversation';
import ReimbursementEditModal from '@pages/employee/reimbursement/components/ReimbursementEditModal';
import { fetchReimbursementById } from '@services/reimbursementVersions';
import type { IReimbursementsUpdate } from '@models/employee';
import { getApprovalDomain, APPROVAL_DOMAIN_KEYS } from './domains/registry';
import GenericDetail from './domains/GenericDetail';
import type { ApprovalStep } from './domains/types';
import InboxItemCard, { ageOf } from './InboxItem';

/**
 * The Inbox.
 *
 * WHAT THIS REPLACES
 * ------------------
 * A dashboard pretending to be a worklist. Five KPI cards across the top — Pending, Approved
 * Today, Rejected Today, SLA Breaches, Delegated — which for most people on most days read
 * 0 0 0 0 0 and cost the entire first screen. Below them, a fixed row of domain tabs, every one
 * of which opened a full table shell with column headers, filter controls, an export menu and
 * "No records found" in the middle. The page was almost entirely chrome describing an absence.
 *
 * THE RULE HERE
 * -------------
 * Nothing renders unless it has something to say. No counters for zero. No tab for a domain with
 * no work in it. No table furniture around an empty list. If you are clear, you get one calm
 * sentence saying so — not an interface for work that does not exist.
 *
 * WHAT IT SHOWS
 * -------------
 * Every domain, together, in one list: leave, attendance, reimbursement, tasks, requisitions,
 * offers — plus your OWN items, the questions an approver asked you and the expenses that came
 * back rejected, which the old page had no place for at all. Sorted by how long each has waited,
 * because in an approval queue that is the thing that matters and nothing said it before.
 */

type Segment = 'mine' | 'awaiting' | 'done';

/**
 * Named for what is in them, not for how they read as a set.
 *
 * "Needs you / With others / Done" was shorter and meant nothing on first sight — a label has to
 * survive being read by someone who has never seen this screen. `hint` says the rest out loud
 * under the active tab rather than leaving it to be inferred.
 */
const SEGMENTS: Array<{ key: Segment; label: string; hint: string; blank: string }> = [
    {
        key: 'mine',
        label: 'Needs my action',
        hint: 'Waiting on you — approvals to decide, and questions on your own expenses.',
        blank: 'Nothing is waiting on you.',
    },
    {
        key: 'awaiting',
        label: 'Waiting on others',
        hint: 'Sitting with someone else — requests you submitted, and approvals you have passed on.',
        blank: 'Nothing is sitting with anyone else.',
    },
    {
        key: 'done',
        label: 'Resolved',
        hint: 'Already dealt with — decided approvals, and questions you have answered.',
        blank: 'Nothing has been resolved yet.',
    },
];

/** When a step reached the inbox. ISO strings, so a string compare is a date compare. */
const submittedKey = (s: ApprovalStep) =>
    String((s.requestDetails as any)?.submittedAt ?? s.instance.createdAt ?? '');

/** Employee-facing and approver-actionable inbox tasks. */
const MY_TASK_TYPES = new Set(['QUERY_RECEIVED', 'REJECTION_RECEIVED', 'ACTION_REQUIRED', 'QUERY_RESPONSE_RECEIVED']);

/** Tasks where you are waiting on someone else. */
const AWAITING_TASK_TYPES = new Set<string>([]);

const TASK_STYLE: Record<string, { tone: SemanticTone; icon: string; cta: string; label: string; doneLabel: string }> = {
    QUERY_RECEIVED: { tone: 'warning', icon: 'message-text-2', cta: 'Respond', label: 'Query received', doneLabel: 'Query answered' },
    REJECTION_RECEIVED: { tone: 'danger', icon: 'cross-circle', cta: 'Mark as seen', label: 'Expense rejected', doneLabel: 'Seen' },
    ACTION_REQUIRED: { tone: 'warning', icon: 'information', cta: 'Open', label: 'Action required', doneLabel: 'Action completed' },
    QUERY_RESPONSE_RECEIVED: { tone: 'cyan', icon: 'message-text-2', cta: 'Review', label: 'Response received', doneLabel: 'Response reviewed' },
};

export default function Approvals() {
    const theme = useTheme();
    const canApprove = usePermission('approvals.approve.team');

    const [segment, setSegment] = useState<Segment>('mine');
    const [steps, setSteps] = useState<ApprovalStep[]>([]);
    const [tasks, setTasks] = useState<InboxTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [domainFilter, setDomainFilter] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [detail, setDetail] = useState<ApprovalStep | null>(null);
    const [batchDetail, setBatchDetail] = useState<{ batchId: string; instanceId: string } | null>(null);
    const [conversation, setConversation] = useState<{ reimbursementId?: string; batchId?: string; queryId: string; label: string; level?: number } | null>(null);
    // Same inline-edit affordance as the employee's own reimbursement screen (NeedsYourAttention):
    // "Edit the Expense Instead" from inside a query conversation opens the form right here rather
    // than a page of its own. This screen also lists the employee's OWN query tasks, so it needs
    // the identical flow, not a second one.
    const [editTarget, setEditTarget] = useState<{
        reimbursement: IReimbursementsUpdate;
        context: { type: 'query'; queryText?: string; level?: number };
    } | null>(null);
    const [rejectTarget, setRejectTarget] = useState<ApprovalStep | null>(null);
    const [rejecting, setRejecting] = useState(false);

    const load = useCallback(async (seg: Segment = segment) => {
        setLoading(true);
        try {
            const [approvals, myTasks] = await Promise.all([
                seg === 'mine' ? fetchPendingApprovals() : fetchAllApprovalInstances(seg === 'done' ? 'completed' : 'awaiting'),
                // Your own items appear in two of the three tabs: open ones under "Pending my
                // action", and closed ones under "Completed" — a question you answered IS
                // something you completed, and Completed listing only approval instances meant
                // your own half of the workflow vanished the moment you dealt with it.
                // Awaiting tasks (e.g., query responses) appear in the "Awaiting others" segment.
                seg === 'mine' ? fetchInboxTasks(false).catch(() => [] as InboxTask[])
                    : seg === 'awaiting' ? fetchInboxTasks(false).catch(() => [] as InboxTask[])
                    : seg === 'done' ? fetchInboxTasks(true).catch(() => [] as InboxTask[])
                    : Promise.resolve([] as InboxTask[]),
            ]);
            const raw = (approvals as any)?.data ?? approvals ?? [];
            setSteps(Array.isArray(raw) ? raw : []);
            setTasks((myTasks as InboxTask[]).filter((t) => {
                const isMyType = MY_TASK_TYPES.has(t.type);
                const isAwaitingType = AWAITING_TASK_TYPES.has(t.type);
                if (seg === 'mine' && !isMyType) return false;
                if (seg === 'awaiting' && !isAwaitingType) return false;
                if (seg === 'done' && !(isMyType || isAwaitingType)) return false;
                const open = t.status === 'OPEN' || t.status === 'IN_PROGRESS';
                return seg === 'done' ? !open : open;
            }));
        } catch {
            setSteps([]);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [segment]);

    useEffect(() => { load(segment); }, [segment]);
    useEventBus(EVENT_KEYS.reimbursementChanged, () => { load(); });

    useEffect(() => {
        const socket = getSocket();
        const handler = () => load();
        socket.on('approval:pending', handler);
        socket.on('approval:updated', handler);
        socket.on('approval:cancelled', handler);
        return () => {
            socket.off('approval:pending', handler);
            socket.off('approval:updated', handler);
            socket.off('approval:cancelled', handler);
        };
    }, [load]);

    /** Newest first — the most recently submitted request is the one the approver is looking
        for, and burying it under a month of older items is what made this list feel stale.
        (It used to be oldest-first, on the theory that whatever has waited longest needs
        deciding; the "waiting N days" line below still surfaces that, without ordering the
        whole list around it.)

        In "Pending my action", resubmitted items still float above the rest: the employee has
        already answered a query and is blocked on a re-review, which is more urgent than a
        first look. Within each of those two groups the order is newest first. */
    const sorted = useMemo(() => {
        const filtered = [...steps];
        // Descending: b vs a.
        const byNewest = (a: ApprovalStep, b: ApprovalStep) =>
            submittedKey(b).localeCompare(submittedKey(a));

        if (segment === 'mine') {
            filtered.sort((a, b) => {
                const aResubmitted = (a.requestDetails as any)?.resubmittedCount > 0 ? 1 : 0;
                const bResubmitted = (b.requestDetails as any)?.resubmittedCount > 0 ? 1 : 0;
                if (aResubmitted !== bResubmitted) return bResubmitted - aResubmitted;
                return byNewest(a, b);
            });
        } else {
            filtered.sort(byNewest);
        }

        return filtered;
    }, [steps, segment]);

    /** Tasks are their own list rendered above the steps, so they need the same ordering —
        otherwise "newest first" would hold for half the inbox and not the other half. */
    const sortedTasks = useMemo(
        () => [...tasks].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))),
        [tasks],
    );

    /** Only domains that actually have something. A tab for an empty domain is furniture. */
    const domainCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const s of sorted) {
            const type = (s.instance.workflowType || '').toLowerCase();
            const key = APPROVAL_DOMAIN_KEYS.includes(type) ? type : 'other';
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return counts;
    }, [sorted]);

    const visible = useMemo(
        () => (domainFilter
            ? sorted.filter((s) => (s.instance.workflowType || '').toLowerCase() === domainFilter)
            : sorted),
        [sorted, domainFilter],
    );

    // A filter that no longer matches anything would strand the reader on an empty list.
    useEffect(() => {
        if (domainFilter && !domainCounts.has(domainFilter)) setDomainFilter(null);
    }, [domainCounts, domainFilter]);

    const total = visible.length + (segment === 'mine' ? tasks.length : 0);
    // The list is newest-first, so the item that has waited longest is the LAST one, not the
    // first. Reading sorted[0] here after the flip would have reported the newest item's age
    // as the backlog.
    const oldestStep = sorted.length ? sorted[sorted.length - 1] : null;
    const oldest = oldestStep
        ? ageOf((oldestStep.requestDetails as any)?.submittedAt ?? oldestStep.instance.createdAt)
        : null;

    // ── Actions ──────────────────────────────────────────────────────────────

    const decide = async (step: ApprovalStep, action: 'approve' | 'reject', comments?: string) => {
        setBusyId(step.id);
        try {
            const res: any = await processApprovalAction(step.instance.id, action, comments);
            successConfirmation(res?.message ?? `Request ${action}d`);
            load();
        } catch (err: any) {
            errorConfirmation(err?.response?.data?.message || `Could not ${action} this request`);
        } finally {
            setBusyId(null);
        }
    };

    const openStep = (step: ApprovalStep) => {
        if ((step.instance.workflowType || '').toLowerCase() === 'reimbursement') {
            setBatchDetail({ batchId: step.instance.requestId, instanceId: step.instance.id });
            return;
        }
        setDetail(step);
    };

    const openTask = (task: InboxTask) => {
        const payload = (task.payload ?? {}) as Record<string, unknown>;

        // A rejection is final — there is nothing left to do about it. "Open" here just means
        // "I've seen this", so it moves out of Pending and into Completed rather than opening
        // anything to act on.
        if (task.type === 'REJECTION_RECEIVED') {
            acknowledgeInboxTask(task.id).then(() => load()).catch(() => {
                errorConfirmation('Could not mark this as seen');
            });
            return;
        }

        if (task.type === 'QUERY_RECEIVED' && typeof payload.queryId === 'string') {
            setConversation({
                reimbursementId: typeof payload.reimbursementId === 'string' ? payload.reimbursementId : undefined,
                batchId: typeof payload.reimbursementId === 'string' ? undefined : (task.batchId ?? undefined),
                queryId: payload.queryId,
                label: typeof payload.submissionId === 'string' ? `Submission ${payload.submissionId}` : task.title,
                level: typeof payload.level === 'number' ? payload.level : undefined,
            });
            return;
        }
        if (task.type === 'QUERY_RESPONSE_RECEIVED' && typeof payload.queryId === 'string') {
            setConversation({
                reimbursementId: typeof payload.reimbursementId === 'string' ? payload.reimbursementId : undefined,
                batchId: typeof payload.reimbursementId === 'string' ? undefined : (task.batchId ?? undefined),
                queryId: payload.queryId,
                label: typeof payload.submissionId === 'string' ? `Submission ${payload.submissionId}` : task.title,
            });
            return;
        }
        if (task.batchId) setBatchDetail({ batchId: task.batchId, instanceId: '' });
    };

    const openEdit = async (reimbursementId: string, context: { type: 'query'; queryText?: string; level?: number }) => {
        try {
            setEditTarget({ reimbursement: await fetchReimbursementById(reimbursementId), context });
        } catch {
            errorConfirmation('Could not load this reimbursement');
        }
    };

    // Every row opens something. A domain with no canonical view falls back to the generic one —
    // without it, `Detail` was undefined and the click rendered nothing at all.
    const DetailComponent = detail
        ? (getApprovalDomain(detail.instance.workflowType)?.Detail ?? GenericDetail)
        : undefined;

    const renderTabContent = () => (
        <Box sx={{ maxWidth: 1100, mx: 'auto', width: '100%', pb: 6, pt: 2 }}>
            {/* Domain filters, for the domains that actually have work. Shown from ONE domain
                upwards: with a single domain the chips filter nothing, but they do say what
                is in the list and where the control lives, which is what people came looking
                for when everything in their inbox happened to be reimbursements. */}
            {domainCounts.size >= 1 && (
                <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mb: 2 }}>
                    <ToneChip
                        tone="neutral" label={`All ${sorted.length}`} size="small"
                        solid={!domainFilter} onClick={() => setDomainFilter(null)}
                        sx={{ cursor: 'pointer' }}
                    />
                    {[...domainCounts.entries()].map(([key, count]) => {
                        const domain = getApprovalDomain(key);
                        return (
                            <ToneChip
                                key={key}
                                tone={domain?.tone ?? 'neutral'}
                                label={`${domain?.label ?? 'Other'} ${count}`}
                                size="small"
                                solid={domainFilter === key}
                                onClick={() => setDomainFilter(domainFilter === key ? null : key)}
                                sx={{ cursor: 'pointer' }}
                            />
                        );
                    })}
                </Stack>
            )}

            {loading ? (
                <Stack alignItems="center" sx={{ py: 10 }}><CircularProgress size={26} /></Stack>
            ) : total === 0 ? (
                <Stack alignItems="center" gap={1.25} sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{
                        width: 56, height: 56, borderRadius: '16px', display: 'grid', placeItems: 'center',
                        bgcolor: tonePair('success').soft, color: tonePair('success').fg,
                    }}>
                        <KTIcon iconName="check-circle" className="fs-2hx" />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                        {SEGMENTS.find((s) => s.key === segment)?.blank}
                    </Typography>
                </Stack>
            ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                    {sortedTasks.map((task) => {
                        const style = TASK_STYLE[task.type] ?? TASK_STYLE.ACTION_REQUIRED;
                        const pair = tonePair(style.tone);
                        return (
                            <Box
                                key={task.id}
                                tabIndex={0}
                                onClick={() => openTask(task)}
                                onKeyDown={(e) => { if (e.key === 'Enter') openTask(task); }}
                                sx={{
                                    position: 'relative', cursor: 'pointer', minWidth: 0,
                                    borderRadius: '12px', overflow: 'hidden',
                                    border: `1px solid ${theme.palette.divider}`,
                                    bgcolor: 'background.paper',
                                    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex', flexDirection: 'column',
                                    height: '100%',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        borderColor: pair.fg,
                                        boxShadow: `0 8px 24px -8px ${pair.fg}25, 0 4px 12px rgba(0,0,0,0.03)`
                                    },
                                    '&:focus-visible': { outline: `2px solid ${pair.fg}`, outlineOffset: 2 },
                                }}
                            >
                                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: pair.fg }} />
                                <Stack gap={1.2} sx={{ p: { xs: 1.75, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* Status badge */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{
                                            width: 24, height: 24, borderRadius: '8px', flexShrink: 0,
                                            display: 'grid', placeItems: 'center',
                                            bgcolor: pair.soft, color: pair.fg,
                                        }}>
                                            <KTIcon iconName={style.icon} className="fs-6" />
                                        </Box>
                                        <Typography sx={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: pair.fg, lineHeight: 1 }}>
                                            {segment === 'done' ? style.doneLabel : style.label}
                                        </Typography>
                                    </Box>

                                    {/* Title */}
                                    <Typography sx={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.4, color: 'text.primary' }}>
                                        {task.title}
                                    </Typography>

                                    {/* Message preview */}
                                    {task.message && (
                                        <Box sx={{
                                            p: 1.25,
                                            borderRadius: '8px',
                                            bgcolor: 'rgba(0, 0, 0, 0.02)',
                                            borderLeft: `3px solid ${theme.palette.divider}`,
                                            mt: 0.25
                                        }}>
                                            <Typography sx={{
                                                fontSize: '11px',
                                                color: 'text.secondary',
                                                lineHeight: 1.45,
                                                fontStyle: 'italic',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}>
                                                "{task.message}"
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Action button - premium outline styled */}
                                    <Box sx={{ mt: 'auto', pt: 1 }}>
                                        <WtButton size="small"
                                            onClick={(e) => { e.stopPropagation(); openTask(task); }}
                                            sx={{
                                                width: '100%',
                                                fontSize: '11px',
                                                fontWeight: 650,
                                                py: 0.5,
                                                px: 1,
                                                borderRadius: '8px',
                                                border: `1px solid ${pair.fg}`,
                                                color: pair.fg,
                                                background: 'transparent !important',
                                                boxShadow: 'none',
                                                transition: 'all 160ms cubic-bezier(.22,.61,.36,1)',
                                                '&:hover': {
                                                    background: `${pair.fg}15 !important`,
                                                    borderColor: pair.fg,
                                                    color: pair.fg,
                                                    boxShadow: `0 2px 8px ${pair.fg}24`,
                                                },
                                            }}>
                                            {segment === 'done' ? 'View' : style.cta}
                                        </WtButton>
                                    </Box>
                                </Stack>
                            </Box>
                        );
                    })}

                    {visible.map((step) => (
                        <Box key={step.id} sx={{ gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 1' }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <InboxItemCard
                                step={step}
                                canDecide={segment === 'mine' && canApprove}
                                busy={busyId === step.id}
                                onOpen={() => openStep(step)}
                                onApprove={() => decide(step, 'approve')}
                                onReject={() => setRejectTarget(step)}
                                onAsk={((step.instance.workflowType || '').toLowerCase() === 'reimbursement') ? () => setBatchDetail({ batchId: step.instance.requestId, instanceId: step.instance.id }) : undefined}
                                compact
                                variant={segment}
                            />
                        </Box>
                    ))}
                </Box>
                )}
        </Box>
    );

    const tabItems: TabItem[] = SEGMENTS.map((s) => ({
        title: s.label,
        icon: s.key === 'mine' ? 'bi-inbox' : s.key === 'awaiting' ? 'bi-hourglass-split' : 'bi-check2-circle',
        component: renderTabContent(),
        badge: s.key === segment ? total : undefined,
    }));

    return (
        <>
            <PageTitle breadcrumbs={[]}>My Inbox</PageTitle>

            <MaterialHeaderTab
                tabItems={tabItems}
                activeTab={SEGMENTS.findIndex((s) => s.key === segment)}
                onTabChange={(index) => setSegment(SEGMENTS[index].key)}
                hideScrollButtons
            />

            {/* Domain detail — the registry decides which component, so each domain opens in the
                view it already has rather than a viewer built for this screen. */}
            {detail && DetailComponent && (
                <DetailComponent
                    step={{ ...detail, _uid: detail.id }}
                    onClose={() => setDetail(null)}
                    onDone={() => { setDetail(null); load(); }}
                    canEdit={canApprove}
                    canDecide={segment === 'mine' && canApprove}
                    onApprove={() => { decide(detail, 'approve'); setDetail(null); }}
                    onReject={() => { setRejectTarget(detail); setDetail(null); }}
                />
            )}

            {batchDetail && (
                <BatchDetailModal
                    batchId={batchDetail.batchId}
                    approvalInstanceId={batchDetail.instanceId || null}
                    onClose={() => setBatchDetail(null)}
                    onBatchActionDone={() => load()}
                    // Opened from a queue card, the modal shows that card's slice of the batch —
                    // the expenses you have already passed on do not belong in the list you are
                    // being asked to decide.
                    slice={segment === 'awaiting' ? 'in-flight' : segment === 'mine' ? 'mine' : undefined}
                />
            )}

            {conversation && (
                <QueryConversationDialog
                    reimbursementId={conversation.reimbursementId}
                    batchId={conversation.batchId}
                    focusQueryId={conversation.queryId}
                    requestLabel={conversation.label}
                    onClose={() => setConversation(null)}
                    onChanged={() => load()}
                    onEditRequest={
                        conversation.reimbursementId
                            ? () => {
                                openEdit(conversation.reimbursementId!, {
                                    type: 'query',
                                    queryText: conversation.label,
                                    level: conversation.level,
                                });
                                setConversation(null);
                              }
                            : undefined
                    }
                />
            )}

            <ReimbursementEditModal
                show={!!editTarget}
                onHide={() => setEditTarget(null)}
                reimbursement={editTarget?.reimbursement ?? null}
                editContext={editTarget?.context}
                onSaved={() => { setEditTarget(null); load(); }}
            />

            <RejectReasonModal
                show={!!rejectTarget}
                submitting={rejecting}
                onClose={() => setRejectTarget(null)}
                onConfirm={async (reason) => {
                    if (!rejectTarget) return;
                    setRejecting(true);
                    try {
                        await decide(rejectTarget, 'reject', reason);
                        setRejectTarget(null);
                    } finally { setRejecting(false); }
                }}
            />
        </>
    );
}

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
        label: 'Pending my action',
        hint: 'Waiting on you — approvals to decide, and questions on your own expenses.',
        blank: 'Nothing is waiting on you.',
    },
    {
        key: 'awaiting',
        label: 'Awaiting others',
        hint: 'You have done your part. These are sitting at someone else’s approval level.',
        blank: 'Nothing is sitting with anyone else.',
    },
    {
        key: 'done',
        label: 'Completed',
        hint: 'Already dealt with — decided approvals, and questions you have answered.',
        blank: 'Nothing has been completed yet.',
    },
];

/** Employee-facing and approver-actionable inbox tasks. */
const MY_TASK_TYPES = new Set(['QUERY_RECEIVED', 'REJECTION_RECEIVED', 'ACTION_REQUIRED', 'QUERY_RESPONSE_RECEIVED']);

/** Tasks where you are waiting on someone else. */
const AWAITING_TASK_TYPES = new Set<string>([]);

const TASK_STYLE: Record<string, { tone: SemanticTone; icon: string; cta: string; label: string; doneLabel: string }> = {
    QUERY_RECEIVED: { tone: 'warning', icon: 'question', cta: 'Respond', label: 'Query received', doneLabel: 'Query answered' },
    REJECTION_RECEIVED: { tone: 'danger', icon: 'cross-circle', cta: 'Mark as seen', label: 'Expense rejected', doneLabel: 'Seen' },
    ACTION_REQUIRED: { tone: 'warning', icon: 'information', cta: 'Open', label: 'Action required', doneLabel: 'Action completed' },
    QUERY_RESPONSE_RECEIVED: { tone: 'cyan', icon: 'chat', cta: 'Review', label: 'Response received', doneLabel: 'Response reviewed' },
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

    /** Oldest first. The item that has waited longest is the one that needs deciding.
        For reimbursements in 'mine' tab: prioritize resubmitted items (employee answered) first,
        then regular pending items. This ensures the approver sees what needs immediate re-review. */
    const sorted = useMemo(() => {
        let filtered = [...steps];

        // Resubmitted items jump to front of "Pending my action" — they need immediate review
        if (segment === 'mine') {
            filtered.sort((a, b) => {
                const aResubmitted = (a.requestDetails as any)?.resubmittedCount > 0 ? 1 : 0;
                const bResubmitted = (b.requestDetails as any)?.resubmittedCount > 0 ? 1 : 0;
                if (aResubmitted !== bResubmitted) return bResubmitted - aResubmitted;
                // Then sort by age (oldest first)
                const keyA = (a.requestDetails as any)?.submittedAt ?? a.instance.createdAt ?? '';
                const keyB = (b.requestDetails as any)?.submittedAt ?? b.instance.createdAt ?? '';
                return String(keyA).localeCompare(String(keyB));
            });
        } else {
            // Other tabs: just sort by age
            const key = (s: ApprovalStep) => (s.requestDetails as any)?.submittedAt ?? s.instance.createdAt ?? '';
            filtered.sort((a, b) => String(key(a)).localeCompare(String(key(b))));
        }

        return filtered;
    }, [steps, segment]);

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
    const oldest = sorted.length ? ageOf((sorted[0].requestDetails as any)?.submittedAt ?? sorted[0].instance.createdAt) : null;

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

    const DetailComponent = detail ? getApprovalDomain(detail.instance.workflowType)?.Detail : undefined;

    const renderTabContent = () => (
        <Box sx={{ maxWidth: 1100, mx: 'auto', width: '100%', pb: 6, pt: 4 }}>
            {/* Domain filters exist only for domains that have work. Two or more, or none —
                a single filter chip filters nothing. */}
            {domainCounts.size > 1 && (
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
                <Stack gap={1.5}>
                    {tasks.map((task) => {
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
                                    borderRadius: '14px', overflow: 'hidden',
                                    border: `1px solid ${pair.fg}33`, bgcolor: pair.soft,
                                    transition: 'transform 160ms ease',
                                    '&:hover': { transform: 'translateY(-1px)' },
                                    '&:focus-visible': { outline: `2px solid ${pair.fg}`, outlineOffset: 2 },
                                }}
                            >
                                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: pair.fg }} />
                                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}
                                    sx={{ pl: { xs: 2, sm: 2.5 }, pr: 2, py: 1.75 }}>
                                    <Box sx={{
                                        width: 24, height: 24, borderRadius: '7px', flexShrink: 0,
                                        display: 'grid', placeItems: 'center',
                                        bgcolor: theme.palette.background.paper, color: pair.fg,
                                    }}>
                                        <KTIcon iconName={style.icon} className="fs-7" />
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: pair.fg }}>
                                            {segment === 'done' ? style.doneLabel : style.label}
                                         </Typography>
                                        <Typography sx={{ fontSize: 14.5, fontWeight: 700, mt: 0.25 }}>{task.title}</Typography>
                                        {task.message && (
                                            <Typography sx={{
                                                fontSize: 12.5, color: 'text.secondary', mt: 0.35, lineHeight: 1.5,
                                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}>
                                                {task.message}
                                            </Typography>
                                        )}
                                    </Box>
                                    <WtButton size="small" ghost={segment === 'done'}
                                        onClick={(e) => { e.stopPropagation(); openTask(task); }}>
                                        {segment === 'done' ? 'View' : style.cta}
                                    </WtButton>
                                </Stack>
                            </Box>
                        );
                    })}

                    {visible.map((step) => (
                        <InboxItemCard
                            key={step.id}
                            step={step}
                            canDecide={segment === 'mine' && canApprove}
                            busy={busyId === step.id}
                            onOpen={() => openStep(step)}
                            onApprove={() => decide(step, 'approve')}
                            onReject={() => setRejectTarget(step)}
                            onAsk={((step.instance.workflowType || '').toLowerCase() === 'reimbursement') ? () => setBatchDetail({ batchId: step.instance.requestId, instanceId: step.instance.id }) : undefined}
                        />
                    ))}
                    </Stack>
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
            <PageTitle breadcrumbs={[]}>My Team - Approvals</PageTitle>

            <MaterialHeaderTab
                tabItems={tabItems}
                activeTab={SEGMENTS.findIndex((s) => s.key === segment)}
                onTabChange={(index) => setSegment(SEGMENTS[index].key)}
                hideScrollButtons
                aboveContent={
                    <Stack direction="row" alignItems="center" gap={1} sx={{ px: 0.5, pb: 1 }}>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                            {SEGMENTS.find((s) => s.key === segment)?.hint}
                        </Typography>
                        {oldest && segment === 'mine' && (
                            <ToneChip tone="warning" size="small" label={`Oldest ${oldest}`} />
                        )}
                    </Stack>
                }
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

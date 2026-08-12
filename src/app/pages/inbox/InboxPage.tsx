import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography, useTheme } from '@mui/material';
import { PageTitle } from '@metronic/layout/core';
import { KTIcon } from '@metronic/helpers';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { fetchInboxTasks, markInboxTaskInProgress, type InboxTask, type InboxTaskType } from '@services/inbox';
import { BatchDetailModal } from '@pages/employee/reimbursement/shared/ReimbursementBatchShared';
import QueryConversationDialog from '@pages/employee/reimbursement/components/QueryConversation';
import { formatDateTime } from '@utils/dateFormats';
import { WtButton, ToneChip, AutoGrid, ListHeader, GlassCard, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';

/**
 * The Inbox: "what do I need to do right now?"
 *
 * EVERY employee has one. It used to be the approval queue behind an `approvals.approve.team`
 * check, which meant the half of the workflow that belongs to the employee — a question they owe
 * an answer to, an expense that came back rejected — had nowhere the product told them to look.
 *
 * A task is not a status. The same reimbursement can be QUERIED as a record while the employee's
 * task is done and the approver's is open; the two are answers to different questions.
 */

type Filter = 'all' | 'mine' | 'approvals';

interface TypeStyle {
    label: string;
    tone: SemanticTone;
    icon: string;
    /** Approver-facing tasks are work on someone else's money; the rest are the viewer's own. */
    side: 'approver' | 'employee';
}

const TYPE_STYLES: Record<InboxTaskType, TypeStyle> = {
    APPROVAL_REQUIRED: { label: 'Approval required', tone: 'brand', icon: 'check-circle', side: 'approver' },
    QUERY_RESPONSE_RECEIVED: { label: 'Response received', tone: 'cyan', icon: 'message-text-2', side: 'approver' },
    RESUBMISSION_RECEIVED: { label: 'Resubmitted', tone: 'indigo', icon: 'arrows-circle', side: 'approver' },
    QUERY_RECEIVED: { label: 'Question for you', tone: 'warning', icon: 'question', side: 'employee' },
    REJECTION_RECEIVED: { label: 'Rejected', tone: 'danger', icon: 'cross-circle', side: 'employee' },
    ACTION_REQUIRED: { label: 'Action required', tone: 'warning', icon: 'information', side: 'employee' },
};

const FALLBACK_STYLE: TypeStyle = { label: 'Task', tone: 'brand', icon: 'information', side: 'employee' };

const styleFor = (type: InboxTaskType): TypeStyle => TYPE_STYLES[type] ?? FALLBACK_STYLE;

const inr = (value: unknown): string =>
    `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The counts an approval card carries. Rendered as pills rather than prose so a batch's mixed
 * state — the normal state, not an edge case — reads at a glance.
 */
function BatchSummaryPills({ payload }: { payload: Record<string, unknown> | null }) {
    if (!payload) return null;
    const pills: Array<{ label: string; tone: SemanticTone }> = [];
    const awaiting = Number(payload.awaitingCount ?? 0);
    if (awaiting > 0) pills.push({ label: `${awaiting} awaiting you`, tone: 'warning' });
    if (Number(payload.approvedCount ?? 0) > 0) pills.push({ label: `${payload.approvedCount} approved`, tone: 'success' });
    if (Number(payload.queriedCount ?? 0) > 0) pills.push({ label: `${payload.queriedCount} queried`, tone: 'cyan' });
    if (Number(payload.rejectedCount ?? 0) > 0) pills.push({ label: `${payload.rejectedCount} rejected`, tone: 'danger' });
    if (Number(payload.resubmittedCount ?? 0) > 0) pills.push({ label: `${payload.resubmittedCount} resubmitted`, tone: 'indigo' });
    if (!pills.length) return null;

    return (
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.25 }}>
            {pills.map((p) => <ToneChip key={p.label} tone={p.tone} label={p.label} size="small" />)}
        </Stack>
    );
}

function TaskCard({ task, onOpen }: { task: InboxTask; onOpen: (task: InboxTask) => void }) {
    const style = styleFor(task.type);
    const pair = tonePair(style.tone);
    const payload = task.payload ?? null;
    const amount = payload?.awaitingAmount ?? payload?.amount;

    return (
        <GlassCard
            sx={{
                display: 'flex', flexDirection: 'column', height: '100%',
                p: { xs: 1.75, sm: 2 }, gap: 1, minWidth: 0,
                borderLeft: `4px solid ${pair.fg}`,
                transition: 'transform 180ms ease, box-shadow 180ms ease',
                '&:hover': { transform: 'translateY(-2px)' },
            }}
        >
            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
                <Box sx={{
                    width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    bgcolor: pair.soft, color: pair.fg,
                }}>
                    <KTIcon iconName={style.icon} className="fs-3" />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                        <ToneChip tone={style.tone} label={style.label} size="small" />
                        {task.status === 'IN_PROGRESS' && (
                            <Chip size="small" label="In progress" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                        )}
                    </Stack>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, mt: 0.75, color: 'text.primary' }}>
                        {task.title}
                    </Typography>
                </Box>
                {amount != null && (
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.primary', whiteSpace: 'nowrap' }}>
                        {inr(amount)}
                    </Typography>
                )}
            </Stack>

            {task.message && (
                <Typography sx={{
                    fontSize: 13, color: 'text.secondary', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                    {task.message}
                </Typography>
            )}

            <BatchSummaryPills payload={payload} />

            {/* Bottom-pinned, so cards in a row stay the same height however long the message is. */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto', pt: 1.25 }}>
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                    {formatDateTime(task.createdAt)}
                </Typography>
                <WtButton size="small" onClick={() => onOpen(task)}>
                    {style.side === 'approver' ? 'Review' : 'Open'}
                </WtButton>
            </Stack>
        </GlassCard>
    );
}

export default function InboxPage() {
    const theme = useTheme();
    const [tasks, setTasks] = useState<InboxTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [openBatchId, setOpenBatchId] = useState<string | null>(null);
    // A query task opens the conversation directly rather than the batch. The task IS the
    // conversation — routing through the batch would make the reader hunt for the row that the
    // card already named.
    const [conversation, setConversation] = useState<
        { reimbursementId?: string; batchId?: string; queryId: string; label: string } | null>(null);

    const load = useCallback(async () => {
        try {
            setTasks(await fetchInboxTasks());
        } catch {
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    // Any reimbursement mutation anywhere re-derives the inbox server-side, so refetch on the same
    // signal rather than inventing a second one.
    useEventBus(EVENT_KEYS.reimbursementChanged, () => { load(); });

    const counts = useMemo(() => {
        let mine = 0;
        let approvals = 0;
        for (const t of tasks) {
            if (styleFor(t.type).side === 'approver') approvals += 1;
            else mine += 1;
        }
        return { all: tasks.length, mine, approvals };
    }, [tasks]);

    const visible = useMemo(() => {
        if (filter === 'all') return tasks;
        const want = filter === 'approvals' ? 'approver' : 'employee';
        return tasks.filter((t) => styleFor(t.type).side === want);
    }, [tasks, filter]);

    const handleOpen = useCallback(async (task: InboxTask) => {
        // Best-effort: marking it read must never stop it opening.
        if (task.status === 'OPEN') {
            markInboxTaskInProgress(task.id).then(load).catch(() => {});
        }
        // A query task goes straight to the thread — it is the work. Everything else opens the
        // batch, which is where every request-level action already lives; reusing it keeps the
        // Inbox a task layer rather than a second approval screen.
        const payload = (task.payload ?? {}) as Record<string, unknown>;
        if (task.entityType === 'ReimbursementQuery' && typeof payload.queryId === 'string') {
            setConversation({
                reimbursementId: typeof payload.reimbursementId === 'string' ? payload.reimbursementId : undefined,
                batchId: typeof payload.reimbursementId === 'string' ? undefined : (task.batchId ?? undefined),
                queryId: payload.queryId,
                label: typeof payload.submissionId === 'string' ? `Submission ${payload.submissionId}` : task.title,
            });
            return;
        }
        if (task.batchId) {
            setOpenBatchId(task.batchId);
            return;
        }
        if (task.path) window.location.assign(task.path);
    }, [load]);

    const filters: Array<{ key: Filter; label: string; count: number }> = [
        { key: 'all', label: 'Everything', count: counts.all },
        { key: 'mine', label: 'My requests', count: counts.mine },
        { key: 'approvals', label: 'To approve', count: counts.approvals },
    ];

    return (
        <>
            <PageTitle breadcrumbs={[]}>Inbox</PageTitle>
            <Box sx={{ maxWidth: 1600, mx: 'auto', width: '100%' }}>
                <ListHeader
                    title="Inbox"
                    subtitle={
                        counts.all === 0
                            ? 'Nothing needs your attention.'
                            : `${counts.all} thing${counts.all === 1 ? '' : 's'} need your attention.`
                    }
                    actions={
                        <Stack direction="row" gap={0.75} flexWrap="wrap">
                            {filters.map((f) => (
                                <Chip
                                    key={f.key}
                                    label={`${f.label}${f.count ? ` · ${f.count}` : ''}`}
                                    onClick={() => setFilter(f.key)}
                                    variant={filter === f.key ? 'filled' : 'outlined'}
                                    color={filter === f.key ? 'primary' : 'default'}
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                />
                            ))}
                        </Stack>
                    }
                />

                {loading ? (
                    <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={28} /></Stack>
                ) : visible.length === 0 ? (
                    <Stack alignItems="center" gap={1.5} sx={{ py: 10, textAlign: 'center' }}>
                        <Box sx={{
                            width: 64, height: 64, borderRadius: '18px', display: 'grid', placeItems: 'center',
                            bgcolor: theme.palette.action.hover, color: 'text.disabled',
                        }}>
                            <KTIcon iconName="check-circle" className="fs-2hx" />
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {filter === 'all' ? 'You are all caught up' : 'Nothing here'}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 420 }}>
                            {filter === 'approvals'
                                ? 'No requests are waiting on your approval.'
                                : filter === 'mine'
                                    ? 'None of your own requests need anything from you.'
                                    : 'When something needs your attention — an approval, a question, a rejected expense — it will appear here.'}
                        </Typography>
                    </Stack>
                ) : (
                    <AutoGrid min={330} gap={16}>
                        {visible.map((task) => (
                            <TaskCard key={task.id} task={task} onOpen={handleOpen} />
                        ))}
                    </AutoGrid>
                )}
            </Box>

            {openBatchId && (
                <BatchDetailModal
                    batchId={openBatchId}
                    onClose={() => setOpenBatchId(null)}
                    onBatchActionDone={load}
                />
            )}

            {conversation && (
                <QueryConversationDialog
                    reimbursementId={conversation.reimbursementId}
                    batchId={conversation.batchId}
                    focusQueryId={conversation.queryId}
                    requestLabel={conversation.label}
                    onClose={() => setConversation(null)}
                    onChanged={load}
                />
            )}
        </>
    );
}

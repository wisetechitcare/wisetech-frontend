import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { fetchInboxTasks, type InboxTask } from '@services/inbox';
import { WtButton, ToneChip, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';
import { formatDateTime } from '@utils/dateFormats';
import QueryConversationDialog from './QueryConversation';
import VersionHistoryDialog from './VersionHistoryDialog';
import { BatchDetailModal } from '../shared/ReimbursementBatchShared';

/**
 * "What do I need to do about my expenses?" — answered on the employee's own screen.
 *
 * The records table below this can say what every claim's STATUS is. It cannot say which of them
 * is waiting on the person reading it, what they were asked, or who asked — so an employee whose
 * expense was queried had to notice a badge, open a batch, and find the row. The work was
 * discoverable rather than presented.
 *
 * Reads the same `inbox_task` rows the Inbox does, narrowed to this module: one source of truth
 * for "needs action", not a second definition that can disagree with the first.
 */

const EMPLOYEE_TASK_TYPES = new Set(['QUERY_RECEIVED', 'REJECTION_RECEIVED', 'ACTION_REQUIRED']);

const STYLE: Record<string, { tone: SemanticTone; icon: string; cta: string }> = {
    QUERY_RECEIVED: { tone: 'warning', icon: 'question', cta: 'Respond' },
    REJECTION_RECEIVED: { tone: 'danger', icon: 'cross-circle', cta: 'View & edit' },
    ACTION_REQUIRED: { tone: 'warning', icon: 'information', cta: 'Open' },
};

export interface NeedsYourAttentionProps {
    /** Whose screen this is. Undefined renders nothing — the panel is personal by definition. */
    employeeId?: string;
    /** True when the viewer is looking at their OWN screen. An admin browsing someone else's
     *  reimbursements is not the person who has to answer, so the panel stays hidden. */
    isSelf: boolean;
}

export default function NeedsYourAttention({ employeeId, isSelf }: NeedsYourAttentionProps) {
    const theme = useTheme();
    const [tasks, setTasks] = useState<InboxTask[]>([]);
    const [conversation, setConversation] = useState<{ reimbursementId?: string; batchId?: string; queryId: string; label: string } | null>(null);
    const [versionsFor, setVersionsFor] = useState<{ id: string; label: string } | null>(null);
    const [openBatchId, setOpenBatchId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!isSelf) return;
        try {
            const all = await fetchInboxTasks();
            setTasks(all.filter((t) => EMPLOYEE_TASK_TYPES.has(t.type)));
        } catch {
            setTasks([]);
        }
    }, [isSelf]);

    useEffect(() => { load(); }, [load]);
    useEventBus(EVENT_KEYS.reimbursementChanged, () => { load(); });

    const open = useMemo(() => tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'), [tasks]);

    if (!isSelf || !employeeId || open.length === 0) return null;

    const handle = (task: InboxTask) => {
        const payload = (task.payload ?? {}) as Record<string, unknown>;
        if (task.type === 'QUERY_RECEIVED' && typeof payload.queryId === 'string') {
            setConversation({
                reimbursementId: typeof payload.reimbursementId === 'string' ? payload.reimbursementId : undefined,
                batchId: typeof payload.reimbursementId === 'string' ? undefined : (task.batchId ?? undefined),
                queryId: payload.queryId,
                label: typeof payload.submissionId === 'string' ? `Submission ${payload.submissionId}` : task.title,
            });
            return;
        }
        if (task.batchId) setOpenBatchId(task.batchId);
    };

    return (
        <>
            <Box sx={{
                borderRadius: '14px', p: { xs: 1.5, sm: 2 }, mb: 2, minWidth: 0,
                border: `1px solid ${tonePair('warning').fg}33`,
                bgcolor: tonePair('warning').soft,
            }}>
                <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
                    <KTIcon iconName="information" className="fs-3" />
                    <Typography sx={{ fontSize: 14, fontWeight: 800 }}>
                        Needs your attention
                    </Typography>
                    <ToneChip tone="warning" label={`${open.length}`} size="small" solid />
                </Stack>

                <Stack gap={1}>
                    {open.map((task) => {
                        const style = STYLE[task.type] ?? STYLE.ACTION_REQUIRED;
                        const payload = (task.payload ?? {}) as Record<string, unknown>;
                        return (
                            <Stack
                                key={task.id}
                                direction={{ xs: 'column', sm: 'row' }}
                                gap={1}
                                alignItems={{ sm: 'center' }}
                                sx={{
                                    p: 1.25, borderRadius: '10px', minWidth: 0,
                                    bgcolor: theme.palette.background.paper,
                                    borderLeft: `3px solid ${tonePair(style.tone).fg}`,
                                }}
                            >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                                        <ToneChip tone={style.tone} label={task.title} size="small" />
                                        {typeof payload.level === 'number' && (
                                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                                asked at level {payload.level}
                                            </Typography>
                                        )}
                                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                                            {formatDateTime(task.createdAt)}
                                        </Typography>
                                    </Stack>
                                    {task.message && (
                                        <Typography sx={{ fontSize: 12.5, color: 'text.primary', mt: 0.4, lineHeight: 1.45 }}>
                                            {task.message}
                                        </Typography>
                                    )}
                                </Box>
                                <Stack direction="row" gap={0.75} sx={{ flexShrink: 0 }}>
                                    {typeof payload.reimbursementId === 'string' && (
                                        <WtButton size="small" ghost
                                            onClick={() => setVersionsFor({
                                                id: payload.reimbursementId as string,
                                                label: task.title,
                                            })}>
                                            History
                                        </WtButton>
                                    )}
                                    <WtButton size="small" onClick={() => handle(task)}>{style.cta}</WtButton>
                                </Stack>
                            </Stack>
                        );
                    })}
                </Stack>

                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1.25 }}>
                    Answering a question keeps your approvals. Changing the expense restarts approval from level 1.
                </Typography>
            </Box>

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

            {versionsFor && (
                <VersionHistoryDialog
                    reimbursementId={versionsFor.id}
                    requestLabel={versionsFor.label}
                    onClose={() => setVersionsFor(null)}
                />
            )}

            {openBatchId && (
                <BatchDetailModal
                    batchId={openBatchId}
                    onClose={() => setOpenBatchId(null)}
                    onBatchActionDone={load}
                />
            )}
        </>
    );
}

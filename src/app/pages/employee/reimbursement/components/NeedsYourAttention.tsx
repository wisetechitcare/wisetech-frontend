import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { fetchInboxTasks, type InboxTask } from '@services/inbox';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { formatDateTime } from '@utils/dateFormats';
import QueryConversationDialog from './QueryConversation';
import VersionHistoryDialog from './VersionHistoryDialog';
import { BatchDetailModal } from '../shared/ReimbursementBatchShared';
import ReimbursementEditModal from './ReimbursementEditModal';
import { fetchReimbursementById } from '@services/reimbursementVersions';
import type { IReimbursementsUpdate } from '@models/employee';
import type { EditContext } from './EditBanner';
import { Info } from 'lucide-react';

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

// Rejection is final — not editable, not an action item. It shows up in the Inbox as a plain
// "rejected" notice (no button), never here. This panel is only for things that need YOUR action.
//
// Do NOT include every ACTION_REQUIRED inbox row — that type is shared with System PIN MFA /
// support notices, which belong in My Inbox / Approvals, not on the reimbursement page.
const EMPLOYEE_TASK_TYPES = new Set(['QUERY_RECEIVED', 'ACTION_REQUIRED']);
const REIMBURSEMENT_ENTITY = /^(Reimbursement|ReimbursementBatch|ReimbursementQuery)$/;

const STYLE: Record<string, { icon: string; cta: string }> = {
    QUERY_RECEIVED: { icon: 'question', cta: 'Respond' },
    ACTION_REQUIRED: { icon: 'information', cta: 'Open' },
};

export interface NeedsYourAttentionProps {
    /** Whose screen this is. Undefined renders nothing — the panel is personal by definition. */
    employeeId?: string;
    /** True when the viewer is looking at their OWN screen. An admin browsing someone else's
     *  reimbursements is not the person who has to answer, so the panel stays hidden. */
    isSelf: boolean;
}

export default function NeedsYourAttention({ employeeId, isSelf }: NeedsYourAttentionProps) {
    const [tasks, setTasks] = useState<InboxTask[]>([]);
    // A query response is edited inline, right here, rather than on a page of its own — the
    // employee stays where the list is.
    const [editTarget, setEditTarget] = useState<{
        reimbursement: IReimbursementsUpdate;
        context: { type: EditContext; queryText?: string; level?: number };
    } | null>(null);
    const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
    const [conversation, setConversation] = useState<{ reimbursementId?: string; batchId?: string; queryId: string; label: string; level?: number } | null>(null);
    const [versionsFor, setVersionsFor] = useState<{ id: string; label: string } | null>(null);
    const [openBatchId, setOpenBatchId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!isSelf) return;
        try {
            const all = await fetchInboxTasks();
            setTasks(all.filter(
                (t) => EMPLOYEE_TASK_TYPES.has(t.type) && REIMBURSEMENT_ENTITY.test(t.entityType),
            ));
        } catch {
            setTasks([]);
        }
    }, [isSelf]);

    useEffect(() => { load(); }, [load]);
    useEventBus(EVENT_KEYS.reimbursementChanged, () => { load(); });

    const open = useMemo(() => tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'), [tasks]);

    if (!isSelf || !employeeId || open.length === 0) return null;

    const openEdit = async (
        reimbursementId: string,
        context: { type: EditContext; queryText?: string; level?: number },
    ) => {
        setEditLoadingId(reimbursementId);
        try {
            setEditTarget({ reimbursement: await fetchReimbursementById(reimbursementId), context });
        } catch {
            // surfaced by the axios interceptor
        } finally {
            setEditLoadingId(null);
        }
    };

    const handle = (task: InboxTask) => {
        const payload = (task.payload ?? {}) as Record<string, unknown>;

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

        if (task.batchId) setOpenBatchId(task.batchId);
    };

    return (
        <>
            <div className="mb-3 min-w-0 rounded-xl border border-warning/20 bg-warning-soft p-2.5">
                <div className="mb-2 flex items-center gap-2">
                    <Info className="size-[21px]" />
                    <h4 className="m-0 text-[13.5px] font-extrabold">Needs your attention</h4>
                    <Badge variant="warning">{open.length}</Badge>
                </div>

                <div className="flex flex-col gap-1.5">
                    {open.map((task) => {
                        const style = STYLE[task.type] ?? STYLE.ACTION_REQUIRED;
                        const payload = (task.payload ?? {}) as Record<string, unknown>;
                        return (
                            <div
                                key={task.id}
                                className="flex min-w-0 flex-col gap-1.5 rounded-lg border-l-[3px] border-l-warning bg-card p-2 sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge variant="warning" className="h-auto max-w-full whitespace-normal">{task.title}</Badge>
                                        {typeof payload.level === 'number' && (
                                            <span className="text-[11px] text-muted-foreground">
                                                asked at level {payload.level}
                                            </span>
                                        )}
                                        <span className="text-[11px] text-muted-foreground/70">
                                            {formatDateTime(task.createdAt)}
                                        </span>
                                    </div>
                                    {task.message && (
                                        <p className="m-0 mt-1 break-words text-[12.5px] leading-[1.45] text-foreground">
                                            {task.message}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-2 flex shrink-0 flex-wrap gap-2 sm:mt-0">
                                    {typeof payload.reimbursementId === 'string' && (
                                        <Button size="sm" variant="outline"
                                            onClick={() => setVersionsFor({
                                                id: payload.reimbursementId as string,
                                                label: task.title,
                                            })}>
                                            History
                                        </Button>
                                    )}
                                    <Button size="sm"
                                        disabled={editLoadingId !== null && editLoadingId === payload.reimbursementId}
                                        onClick={() => handle(task)}>
                                        {style.cta}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="m-0 mt-2 text-[11.5px] text-muted-foreground">
                    Answering a question keeps your approvals. Changing the expense restarts approval from level 1.
                </p>
            </div>

            {conversation && (
                <QueryConversationDialog
                    reimbursementId={conversation.reimbursementId}
                    batchId={conversation.batchId}
                    focusQueryId={conversation.queryId}
                    requestLabel={conversation.label}
                    onClose={() => setConversation(null)}
                    onChanged={load}
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

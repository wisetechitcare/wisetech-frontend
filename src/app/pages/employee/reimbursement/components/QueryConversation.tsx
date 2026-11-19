import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { uploadUserAsset } from '@services/uploader';
import { errorConfirmation } from '@utils/modal';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { Separator } from '@/ds/ui/separator';
import { Spinner } from '@/ds/ui/spinner';
import { Textarea } from '@/ds/ui/textarea';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { cn } from '@/ds/lib/utils';
import { formatDateTime } from '@utils/dateFormats';
import {
    fetchRequestQueries, fetchBatchQueries, fetchParticipantRole, fetchBatchParticipantRole,
    postQueryMessage, resolveQuery, reopenQuery, queryCategoryLabel,
    type QueryThread, type QueryRole, type QueryStatus,
} from '@services/reimbursementQueries';
import DocumentPreviewModal from './DocumentPreviewModal';
import { Paperclip, MessageSquareText, X } from 'lucide-react';

/**
 * The conversation.
 *
 * A query used to be a single overwritable sentence on the expense row with no way to reply. This
 * is the thread it became: who asked, at which level, what was said, in order, permanently — and
 * the controls each side actually has.
 *
 * Which controls those are is decided by the SERVER, twice over: `participantRole` says which side
 * the viewer is on, and the thread's own status says whose turn it is. Nothing here infers
 * permission from what the screen happens to be; every action that would be refused is simply not
 * offered, and the server refuses it anyway if it is.
 */

const STATUS_TONE: Record<QueryStatus, { tone: 'warning' | 'cyan' | 'success'; label: string }> = {
    OPEN: { tone: 'warning', label: 'Awaiting employee' },
    ANSWERED: { tone: 'cyan', label: 'Awaiting approver' },
    RESOLVED: { tone: 'success', label: 'Resolved' },
    REOPENED: { tone: 'warning', label: 'Reopened — awaiting employee' },
};

// ─── One message ─────────────────────────────────────────────────────────────

function MessageBubble({
    message, isMine, onPreview,
}: {
    message: QueryThread['messages'][number];
    isMine: boolean;
    onPreview: (url: string) => void;
}) {
    const approver = message.authorRole === 'APPROVER';
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];

    return (
        <div className={cn('flex min-w-0', isMine ? 'justify-end' : 'justify-start')}>
            <div className="min-w-0 max-w-[92%] sm:max-w-[78%]">
                <div className={cn('mb-1 flex flex-wrap items-baseline gap-1.5', isMine ? 'justify-end' : 'justify-start')}>
                    <span className={cn(
                        'text-[10.5px] font-extrabold uppercase tracking-[0.05em]',
                        approver ? 'text-accent-foreground' : 'text-success-foreground',
                    )}>
                        {approver ? 'Approver' : 'Employee'}{isMine ? ' · you' : ''}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70">
                        {formatDateTime(message.createdAt)}
                    </span>
                </div>
                <div className={cn(
                    'min-w-0 rounded-xl border border-border p-2.5',
                    isMine ? 'rounded-tr-[3px]' : 'rounded-tl-[3px]',
                    isMine ? (approver ? 'bg-accent' : 'bg-success-soft') : 'bg-muted/50',
                )}>
                    <p data-slot="query-message-body"
                        className="m-0 whitespace-pre-wrap text-[13px] leading-[1.55] text-foreground [overflow-wrap:anywhere]">
                        {message.body}
                    </p>
                    {attachments.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                            {attachments.map((url, i) => (
                                <Button
                                    key={url}
                                    variant="outline"
                                    size="xs"
                                    onClick={() => onPreview(url)}
                                >
                                    <Paperclip aria-hidden />
                                    {`Attachment ${i + 1}`}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── The thread ──────────────────────────────────────────────────────────────

function Thread({
    thread, myEmployeeId, role, onChanged, onEditRequest,
}: {
    thread: QueryThread;
    myEmployeeId: string | null;
    role: QueryRole | null;
    onChanged: () => void;
    onEditRequest?: () => void;
}) {
    const [draft, setDraft] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const endRef = useRef<HTMLDivElement | null>(null);

    const status = STATUS_TONE[thread.status];
    const resolved = thread.status === 'RESOLVED';
    const isApprover = role === 'APPROVER';
    /** The asker's own turn is over until the employee answers — see `reimbursementQueryState`. */
    const awaitingEmployee = thread.status === 'OPEN' || thread.status === 'REOPENED';

    // Newest message in view when the thread opens or grows.
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [thread.messages.length]);

    const handleAttach = async (files: FileList | null) => {
        if (!files?.length || !myEmployeeId) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of Array.from(files)) {
                const form = new FormData();
                form.append('file', file);
                const { data } = await uploadUserAsset(form, myEmployeeId, undefined, 'reimbursement-docs');
                if (data?.path) uploaded.push(data.path);
            }
            setAttachments((prev) => [...prev, ...uploaded]);
        } catch {
            errorConfirmation('Could not upload the attachment');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const send = async () => {
        const body = draft.trim();
        if (!body) return;
        setSending(true);
        try {
            await postQueryMessage(thread.id, body, attachments.length ? attachments : undefined);
            setDraft('');
            setAttachments([]);
            onChanged();
        } catch (err: any) {
            errorConfirmation(err?.response?.data?.message || 'Could not send the reply');
        } finally {
            setSending(false);
        }
    };

    const close = async () => {
        setSending(true);
        try {
            await resolveQuery(thread.id, draft.trim() || undefined);
            setDraft('');
            onChanged();
        } catch (err: any) {
            errorConfirmation(err?.response?.data?.message || 'Could not resolve the query');
        } finally { setSending(false); }
    };

    const reopen = async () => {
        const body = draft.trim();
        if (!body) {
            errorConfirmation('Type the new question before reopening.');
            return;
        }
        setSending(true);
        try {
            await reopenQuery(thread.id, body);
            setDraft('');
            onChanged();
        } catch (err: any) {
            errorConfirmation(err?.response?.data?.message || 'Could not reopen the query');
        } finally { setSending(false); }
    };

    return (
        <div className="min-w-0 overflow-hidden rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-2 bg-muted/50 p-2.5">
                <Badge variant={status.tone}>{status.label}</Badge>
                <span className="text-[12.5px] font-bold">
                    {queryCategoryLabel(thread.category)}
                </span>
                {thread.level != null && (
                    <span className="text-[11.5px] text-muted-foreground">· raised at level {thread.level}</span>
                )}
                {thread.scope === 'BATCH' && <Badge variant="indigo">Batch query</Badge>}
                <span className="flex-1" />
                <span className="text-[11px] text-muted-foreground/70">
                    {thread.messages.length} message{thread.messages.length === 1 ? '' : 's'}
                </span>
            </div>

            <div className="flex max-h-[340px] min-w-0 flex-col gap-3 overflow-y-auto p-3">
                {thread.messages.map((m) => (
                    <MessageBubble
                        key={m.id}
                        message={m}
                        isMine={!!myEmployeeId && m.authorId === myEmployeeId}
                        onPreview={setPreviewUrl}
                    />
                ))}
                <div ref={endRef} />
            </div>

            <Separator />

            {/* The composer, offered only to whoever the thread is waiting on. A resolved thread
                keeps its history readable but takes no new messages — reopening is an explicit
                act, and only an approver's to make. Waiting is a read-only state on both sides:
                the asker gets no Send and no Resolve until the answer arrives. */}
            <div className="min-w-0 p-3">
                {resolved && !isApprover ? (
                    <p data-slot="query-state-note" className="m-0 text-[12.5px] text-muted-foreground">
                        This query is resolved. Ask your approver to reopen it if something is still outstanding.
                    </p>
                ) : !isApprover && thread.status === 'ANSWERED' ? (
                    <p data-slot="query-state-note" className="m-0 py-2 text-[12.5px] text-muted-foreground">
                        Awaiting your approver's response.
                    </p>
                ) : isApprover && awaitingEmployee ? (
                    <p data-slot="query-state-note" className="m-0 py-2 text-[12.5px] text-muted-foreground">
                        Awaiting the employee's response. You can reply or resolve this once they answer.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        <Textarea
                            autoFocus
                            rows={2}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            disabled={sending}
                            aria-label={resolved ? 'New question' : 'Message'}
                            placeholder={
                                resolved ? 'Type the new question to reopen this thread…'
                                    : isApprover ? 'Reply, or ask for something more…'
                                        : 'Answer your approver…'
                            }
                        />

                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {attachments.map((url, i) => (
                                    <Badge key={url} variant="neutral" className="h-6 gap-1 pr-1">
                                        {`Attachment ${i + 1}`}
                                        {/* The chip's own dismiss affordance, not a standalone action:
                                            16px inside a 24px Badge. The kit Button cannot serve here —
                                            its smallest icon size is `size-6`, the badge's full height.
                                            Dismissal belongs in the kit Badge eventually (logged in
                                            docs/FUTURE_ENHANCEMENTS.md); until then this is the
                                            documented `chip` control, as ExplorerToolbar does it. */}
                                        <button
                                            type="button"
                                            data-wt-control="chip"
                                            data-slot="attachment-remove"
                                            aria-label={`Remove attachment ${i + 1}`}
                                            className="inline-grid size-4 place-items-center rounded-full border-0 bg-transparent p-0 text-current hover:bg-foreground/10"
                                            onClick={() => setAttachments((a) => a.filter((x) => x !== url))}
                                        >
                                            <X className="size-3" aria-hidden />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Attachments are evidence, and evidence is the employee's to supply.
                                An approver asks the question; they have nothing to file against it. */}
                            {!resolved && !isApprover && (
                                <>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        multiple
                                        hidden
                                        onChange={(e) => handleAttach(e.target.files)}
                                    />
                                    <Button size="sm" variant="outline" disabled={uploading || sending}
                                        onClick={() => fileRef.current?.click()}>
                                        {uploading ? 'Uploading…' : 'Attach'}
                                    </Button>
                                </>
                            )}

                            {/* The employee's other route: change the expense itself. Spelled out,
                                because it is the one action that restarts approval. */}
                            {!isApprover && !resolved && onEditRequest && (
                                <Button size="sm" variant="outline" disabled={sending} onClick={onEditRequest}>
                                    Edit the expense instead
                                </Button>
                            )}

                            <span className="flex-1" />

                            {resolved ? (
                                <Button size="sm" disabled={sending} onClick={reopen}>Reopen with this question</Button>
                            ) : (
                                <>
                                    {isApprover && (
                                        <Button size="sm" variant="inverted" disabled={sending} onClick={close}>
                                            Resolve
                                        </Button>
                                    )}
                                    <Button size="sm" disabled={sending || !draft.trim()} onClick={send}>
                                        {sending ? 'Sending…' : 'Send'}
                                    </Button>
                                </>
                            )}
                        </div>

                        {!isApprover && !resolved && (
                            <p data-slot="query-composer-hint" className="m-0 text-[11px] text-muted-foreground">
                                Replying does not restart approval — it goes back to the approver who asked.
                                Changing the expense does restart it, from level 1.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {previewUrl && <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
        </div>
    );
}

// ─── The dialog ──────────────────────────────────────────────────────────────

export interface QueryConversationDialogProps {
    /** The request whose threads to show. Mutually exclusive with `batchId`. */
    reimbursementId?: string | null;
    /** A BATCH-scope conversation — a question about the submission, not about one expense. */
    batchId?: string | null;
    /** Scroll to / expand this thread first when several exist. */
    focusQueryId?: string | null;
    requestLabel?: string | null;
    onClose: () => void;
    /** Refresh whatever opened this — a reply changes the batch, the inbox and the row. */
    onChanged?: () => void;
    /** Offered to the employee as the alternative that DOES restart approval. */
    onEditRequest?: () => void;
}

/**
 * Every thread on one request, newest last, with the composer for whichever side the viewer is on.
 *
 * Mounted from the batch row, the Inbox and the request detail — one component, so the
 * conversation cannot drift between the three places the spec requires it to appear.
 */
export default function QueryConversationDialog({
    reimbursementId, batchId, focusQueryId, requestLabel, onClose, onChanged, onEditRequest,
}: QueryConversationDialogProps) {
    const [threads, setThreads] = useState<QueryThread[]>([]);
    const [role, setRole] = useState<QueryRole | null>(null);
    const [loading, setLoading] = useState(true);

    const myEmployeeId = useSelector(
        (state: RootState) => (state as any)?.auth?.user?.employeeId
            ?? (state as any)?.auth?.currentUser?.employeeId
            ?? null,
    ) as string | null;

    const load = useCallback(async () => {
        if (!reimbursementId && !batchId) return;
        setLoading(true);
        try {
            if (reimbursementId) {
                const [list, viewerRole] = await Promise.all([
                    fetchRequestQueries(reimbursementId),
                    fetchParticipantRole(reimbursementId),
                ]);
                setThreads(list);
                setRole(viewerRole);
            } else {
                // Batch scope: only the threads about the submission itself. The per-request ones
                // belong to their own rows, and mixing them here would say a question about one
                // expense was a question about all five.
                const [list, viewerRole] = await Promise.all([
                    fetchBatchQueries(batchId!),
                    fetchBatchParticipantRole(batchId!),
                ]);
                setThreads(list.filter((t) => t.scope === 'BATCH'));
                setRole(viewerRole);
            }
        } catch {
            setThreads([]);
        } finally {
            setLoading(false);
        }
    }, [reimbursementId, batchId]);

    useEffect(() => { load(); }, [load]);

    /**
     * A reply changes what four other screens say — the records table's "Respond" link, the
     * employee's attention panel, the approver's queue, the nav badge — and the caller that
     * opened this dialog knows about none of them.
     *
     * Broadcasting instead of only calling back means every screen listening for a reimbursement
     * change refetches, so "Responded" appears everywhere at once rather than only where the
     * reply happened to be typed.
     */
    const handleChanged = useCallback(() => {
        load();
        onChanged?.();
        eventBus.emit(EVENT_KEYS.reimbursementChanged, { action: 'query_replied' });
    }, [load, onChanged]);

    // The focused thread first, then the rest oldest-first — so a deep link lands on the thread it
    // named without hiding the request's earlier history.
    const ordered = useMemo(() => {
        if (!focusQueryId) return threads;
        const focused = threads.find((t) => t.id === focusQueryId);
        if (!focused) return threads;
        return [focused, ...threads.filter((t) => t.id !== focusQueryId)];
    }, [threads, focusQueryId]);

    return (
        <FormDialog
            open={!!(reimbursementId || batchId)}
            onOpenChange={(next) => { if (!next) onClose(); }}
            title="Conversation"
            description={requestLabel ?? undefined}
            icon={<MessageSquareText />}
        >
            <div className="flex min-w-0 flex-col gap-3">
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner className="size-[26px] text-primary" /></div>
                ) : ordered.length === 0 ? (
                    <p data-slot="query-empty" className="m-0 py-10 text-center text-[13px] text-muted-foreground">
                        No questions have been asked{batchId ? ' about this submission' : ' about this expense'}.
                    </p>
                ) : (
                    ordered.map((thread) => (
                        <Thread
                            key={thread.id}
                            thread={thread}
                            myEmployeeId={myEmployeeId}
                            role={role}
                            onChanged={handleChanged}
                            onEditRequest={onEditRequest}
                        />
                    ))
                )}
            </div>
        </FormDialog>
    );
}

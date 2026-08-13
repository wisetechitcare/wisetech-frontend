import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Chip, CircularProgress, Divider, Stack, TextField, Typography, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { uploadUserAsset } from '@services/uploader';
import { errorConfirmation } from '@utils/modal';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { GlassDialog, GlassHeader, WtButton, ToneChip, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';
import { formatDateTime } from '@utils/dateFormats';
import {
    fetchRequestQueries, fetchBatchQueries, fetchParticipantRole, fetchBatchParticipantRole,
    postQueryMessage, resolveQuery, reopenQuery, queryCategoryLabel, QUERY_CATEGORIES,
    type QueryThread, type QueryRole, type QueryStatus,
} from '@services/reimbursementQueries';
import DocumentPreviewModal from './DocumentPreviewModal';

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

const STATUS_TONE: Record<QueryStatus, { tone: SemanticTone; label: string }> = {
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
    const theme = useTheme();
    const approver = message.authorRole === 'APPROVER';
    const pair = tonePair(approver ? 'brand' : 'success');
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];

    return (
        <Stack
            direction="row"
            justifyContent={isMine ? 'flex-end' : 'flex-start'}
            sx={{ minWidth: 0 }}
        >
            <Box sx={{ maxWidth: { xs: '92%', sm: '78%' }, minWidth: 0 }}>
                <Stack
                    direction="row" gap={0.75} alignItems="baseline"
                    justifyContent={isMine ? 'flex-end' : 'flex-start'}
                    sx={{ mb: 0.4, flexWrap: 'wrap' }}
                >
                    <Typography sx={{
                        fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em',
                        textTransform: 'uppercase', color: pair.fg,
                    }}>
                        {approver ? 'Approver' : 'Employee'}{isMine ? ' · you' : ''}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
                        {formatDateTime(message.createdAt)}
                    </Typography>
                </Stack>
                <Box sx={{
                    p: 1.25, borderRadius: '12px', minWidth: 0,
                    borderTopLeftRadius: isMine ? 12 : 3,
                    borderTopRightRadius: isMine ? 3 : 12,
                    bgcolor: isMine ? pair.soft : theme.palette.action.hover,
                    border: `1px solid ${theme.palette.divider}`,
                }}>
                    <Typography sx={{
                        fontSize: 13, lineHeight: 1.55, color: 'text.primary', whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                    }}>
                        {message.body}
                    </Typography>
                    {attachments.length > 0 && (
                        <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.75 }}>
                            {attachments.map((url, i) => (
                                <Chip
                                    key={url}
                                    size="small"
                                    clickable
                                    onClick={() => onPreview(url)}
                                    icon={<KTIcon iconName="paper-clip" className="fs-7" />}
                                    label={`Attachment ${i + 1}`}
                                    sx={{ height: 24, fontSize: 11 }}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>
            </Box>
        </Stack>
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
    const theme = useTheme();
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
        <Box sx={{
            borderRadius: '12px', border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden', minWidth: 0,
        }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap"
                sx={{ p: 1.25, bgcolor: 'action.hover' }}>
                <ToneChip tone={status.tone} label={status.label} size="small" />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                    {queryCategoryLabel(thread.category)}
                </Typography>
                {thread.level != null && (
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>· raised at level {thread.level}</Typography>
                )}
                {thread.scope === 'BATCH' && <ToneChip tone="indigo" label="Batch query" size="small" />}
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                    {thread.messages.length} message{thread.messages.length === 1 ? '' : 's'}
                </Typography>
            </Stack>

            <Stack gap={1.5} sx={{ p: 1.5, maxHeight: 340, overflowY: 'auto', minWidth: 0 }}>
                {thread.messages.map((m) => (
                    <MessageBubble
                        key={m.id}
                        message={m}
                        isMine={!!myEmployeeId && m.authorId === myEmployeeId}
                        onPreview={setPreviewUrl}
                    />
                ))}
                <div ref={endRef} />
            </Stack>

            <Divider />

            {/* The composer. A resolved thread keeps its history readable but takes no new
                messages — reopening is an explicit act, and only an approver's to make. */}
            <Box sx={{ p: 1.5, minWidth: 0 }}>
                {resolved && !isApprover ? (
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        This query is resolved. Ask your approver to reopen it if something is still outstanding.
                    </Typography>
                ) : !isApprover && thread.status === 'ANSWERED' ? (
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', py: 1 }}>
                        Awaiting your approver's response.
                    </Typography>
                ) : (
                    <Stack gap={1}>
                        <TextField
                            autoFocus
                            multiline
                            minRows={2}
                            size="small"
                            fullWidth
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            disabled={sending}
                            placeholder={
                                resolved ? 'Type the new question to reopen this thread…'
                                    : isApprover ? 'Reply, or ask for something more…'
                                        : 'Answer your approver…'
                            }
                        />

                        {attachments.length > 0 && (
                            <Stack direction="row" gap={0.5} flexWrap="wrap">
                                {attachments.map((url, i) => (
                                    <Chip key={url} size="small" label={`Attachment ${i + 1}`}
                                        onDelete={() => setAttachments((a) => a.filter((x) => x !== url))} />
                                ))}
                            </Stack>
                        )}

                        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                            {!resolved && (
                                <>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        multiple
                                        hidden
                                        onChange={(e) => handleAttach(e.target.files)}
                                    />
                                    <WtButton size="small" ghost disabled={uploading || sending}
                                        onClick={() => fileRef.current?.click()}>
                                        {uploading ? 'Uploading…' : 'Attach'}
                                    </WtButton>
                                </>
                            )}

                            {/* The employee's other route: change the expense itself. Spelled out,
                                because it is the one action that restarts approval. */}
                            {!isApprover && !resolved && onEditRequest && (
                                <WtButton size="small" ghost disabled={sending} onClick={onEditRequest}>
                                    Edit the expense instead
                                </WtButton>
                            )}

                            <Box sx={{ flex: 1 }} />

                            {resolved ? (
                                <WtButton size="small" disabled={sending} onClick={reopen}>Reopen with this question</WtButton>
                            ) : (
                                <>
                                    {isApprover && (
                                        <WtButton size="small" inverted disabled={sending} onClick={close}>
                                            Resolve
                                        </WtButton>
                                    )}
                                    <WtButton size="small" disabled={sending || !draft.trim()} onClick={send}>
                                        {sending ? 'Sending…' : 'Send'}
                                    </WtButton>
                                </>
                            )}
                        </Stack>

                        {!isApprover && !resolved && (
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                Replying does not restart approval — it goes back to the approver who asked.
                                Changing the expense does restart it, from level 1.
                            </Typography>
                        )}
                    </Stack>
                )}
            </Box>

            {previewUrl && <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
        </Box>
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
        <GlassDialog
            open={!!(reimbursementId || batchId)}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            header={
                <GlassHeader
                    title="Conversation"
                    subtitle={requestLabel ?? undefined}
                    icon={<KTIcon iconName="message-text-2" className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                {loading ? (
                    <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={26} /></Stack>
                ) : ordered.length === 0 ? (
                    <Typography sx={{ py: 5, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>
                        No questions have been asked{batchId ? ' about this submission' : ' about this expense'}.
                    </Typography>
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
            </Box>
        </GlassDialog>
    );
}

export { QUERY_CATEGORIES };

/**
 * One time log, in full — as a dialog, not a page.
 *
 * It was a route (`/tasks/timesheet/:id/...`), which meant leaving the timesheet you were reading
 * to look at one row of it and then navigating back. A log is a detail OF a list; a dialog is
 * what a detail of a list is.
 *
 * It also showed only what the old page happened to select — task, project, billable, times,
 * cost. Everything the person actually typed was missing: the description, and the files they
 * attached to prove the work. Those are the two fields the entry exists for, so they lead here.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Chip, CircularProgress, Divider, Stack, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, WtButton, confirmDialog, toast } from '@app/modules/common/components/ui';
import { formatDate, formatDateTime } from '@utils/dateFormats';
import dayjs from 'dayjs';
import { AssigneeAvatar } from '@app/pages/employee/tasks/components/primitives';
import { canSection } from '@utils/can';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { formatFileSize } from '@utils/fileValidation';
import { deleteTimeSheetById, getTimesheetById } from '@services/tasks';
import DocumentPreviewModal from '@pages/employee/reimbursement/components/DocumentPreviewModal';
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';
import {
    entrySeconds, durationConflict, formatSpan, formatSpanExact, logSubject,
} from '../timesheetDuration';
import NewTimeLogForm from '../employeetimesheet/component/NewTimeLogForm';

/** `2h 20m 0s` from the three stored columns — the same shape the rest of the module shows. */
/** The shared rule — see timesheetDuration.ts. This dialog used to read the raw fields. */
const durationOf = (log: any) => formatSpanExact(entrySeconds(log));


/** One fact in its own rounded cell — the same shape the task page uses for its details. */
const Fact = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
    <Box
        sx={{
            px: 1.75, py: 1.4, borderRadius: 3, minWidth: 0,
            bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.05 : 0.028),
        }}
    >
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary' }}>
            <KTIcon iconName={icon} className="fs-5" />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{label}</Typography>
        </Stack>
        <Box sx={{ mt: 0.6, minWidth: 0 }}>{children}</Box>
    </Box>
);

const Value = ({ children }: { children: React.ReactNode }) => (
    <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: 'text.primary', wordBreak: 'break-word' }}>{children}</Typography>
);

const SectionTitle = ({ icon, children, count }: { icon: string; children: React.ReactNode; count?: number }) => (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
        <Box sx={{
            width: 30, height: 30, borderRadius: 2.25, display: 'grid', placeItems: 'center', color: 'primary.main',
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.18 : 0.08),
        }}>
            <KTIcon iconName={icon} className="fs-5" />
        </Box>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', flex: 1 }}>{children}</Typography>
        {count !== undefined && (
            <Box sx={{
                px: 1, borderRadius: 999, fontSize: 12, fontWeight: 700, lineHeight: '22px', color: 'text.secondary',
                bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.08 : 0.05),
            }}>
                {count}
            </Box>
        )}
    </Stack>
);

const clockTime = (v?: string | null) => (v ? dayjs(v).format('h:mm A') : '—');

export const TimeLogDetailDialog = ({
    open,
    timesheetId,
    onClose,
    onChanged,
}: {
    open: boolean;
    timesheetId: string | null;
    onClose: () => void;
    /** Fires after an edit or a delete, so the list behind can refresh itself. */
    onChanged?: () => void;
}) => {
    const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);
    const theme = useTheme();
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['timesheet', timesheetId],
        queryFn: () => getTimesheetById(timesheetId as string),
        enabled: open && !!timesheetId,
    });

    const log = data?.timeSheet ?? data?.data?.timeSheet ?? null;
    // Own log needs only Read on My Timesheet; someone else's needs Write on Employees Timesheet.
    const currentEmployeeId = useSelector((s: RootState) => s.employee?.currentEmployee?.id);
    const ownerId = log?.employeeId ?? log?.employee?.id;
    const canWrite = !!ownerId && ownerId === currentEmployeeId
        ? canSection('timesheets.my', 'read')
        : canSection('timesheets.employees', 'write');
    const attachments = (log?.attachments ?? []) as Array<{
        url: string; fileName: string; contentType?: string | null; sizeBytes?: number | null;
    }>;

    const remove = async () => {
        if (!timesheetId) return;
        const ok = await confirmDialog({
            icon: 'warning',
            title: 'Delete this time log?',
            text: 'The hours and anything attached to them go with it. This cannot be undone.',
        });
        if (!ok) return;
        setDeleting(true);
        try {
            await deleteTimeSheetById(timesheetId);
            void toast({ icon: 'success', title: 'Time log deleted' });
            onChanged?.();
            onClose();
        } catch (err) {
            void toast({ icon: 'error', title: 'Could not delete', text: apiErrorMessage(err), timer: 4200 });
        } finally {
            setDeleting(false);
        }
    };

    const subject = log ? logSubject(log) : null;
    const running = !!log && !log.endTime;
    const conflict = log ? durationConflict(log) : null;
    const isImage = (f: { contentType?: string | null; url: string }) =>
        (f.contentType || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.url.split('?')[0]);

    return (
        <>
            <GlassDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <GlassHeader
                    icon={<KTIcon iconName="timer" className="fs-1" />}
                    title="Log Sheet"
                    subtitle={[subject?.name, log?.serialNo ? `Log #${log.serialNo}` : null].filter(Boolean).join(' · ')}
                    onClose={onClose}
                />

                <Box sx={{ px: 3, py: 2.5 }}>
                    {isLoading && (
                        <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={24} /></Stack>
                    )}

                    {isError && !isLoading && (
                        <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
                            <Typography variant="body2" sx={{ color: 'error.main' }}>
                                {apiErrorMessage(error, 'This time log could not be loaded.')}
                            </Typography>
                            <WtButton size="small" onClick={() => void refetch()}>Try again</WtButton>
                        </Stack>
                    )}

                    {!isLoading && !isError && log && (
                        <Stack spacing={2.25}>
                            {/* The headline: how long, and when — the two things a log is opened for. */}
                            <Box
                                sx={{
                                    px: 1.75, py: 1.25, borderRadius: 3,
                                    border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.16),
                                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.04),
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box sx={{
                                        width: 40, height: 40, borderRadius: 2.5, flexShrink: 0, display: 'grid', placeItems: 'center',
                                        color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.1),
                                    }}>
                                        <KTIcon iconName="timer" className="fs-3" />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                                            {durationOf(log)}
                                        </Typography>
                                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25, color: 'text.secondary', flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                                                {log.startTime ? formatDate(log.startTime) : '—'}
                                            </Typography>
                                            <Box component="span" sx={{ color: 'text.disabled' }}>·</Box>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                                                {clockTime(log.startTime)} → {running ? 'now' : clockTime(log.endTime)}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <Chip
                                            size="small"
                                            label={log.billable ? 'Billable' : 'Non-billable'}
                                            sx={{
                                                height: 26, fontSize: 12, fontWeight: 700, borderRadius: 999,
                                                bgcolor: alpha(log.billable ? theme.palette.success.main : theme.palette.text.primary, 0.12),
                                                color: log.billable ? theme.palette.success.main : 'text.secondary',
                                            }}
                                        />
                                        {running && (
                                            <Chip size="small" label="● Running" sx={{
                                                height: 26, fontSize: 12, fontWeight: 700, borderRadius: 999,
                                                bgcolor: alpha(theme.palette.warning.main, 0.14), color: theme.palette.warning.dark,
                                            }} />
                                        )}
                                    </Stack>
                                </Stack>
                                {/* When the entry and the clock disagree, say so here rather than leave
                                    the reader to decide which figure is the mistake. */}
                                {conflict && (
                                    <Typography sx={{ fontSize: 12.5, color: 'warning.dark', mt: 1 }}>
                                        The start and end span {formatSpan(conflict.window)}; this entry is charged at {formatSpan(conflict.logged)}.
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                                <Fact icon={subject?.kind === 'meeting' ? 'people' : 'check-square'} label={subject?.kind === 'meeting' ? 'Meeting' : 'Task'}>
                                    <Value>{subject?.name}</Value>
                                </Fact>
                                <Fact icon="folder" label="Project">
                                    <Value>{log.lead?.title || 'General task'}</Value>
                                </Fact>
                                <Fact icon="profile-circle" label="Logged by">
                                    <Box sx={{ '& .MuiTypography-root': { fontSize: 14.5, fontWeight: 600, color: 'text.primary' } }}>
                                        <AssigneeAvatar employee={log.employee} size={28} showName />
                                    </Box>
                                </Fact>
                                <Fact icon="time" label="Recorded">
                                    <Value>{log.createdAt ? formatDateTime(log.createdAt) : '—'}</Value>
                                    {log.updatedAt && log.updatedAt !== log.createdAt && (
                                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                                            Edited {formatDateTime(log.updatedAt)}
                                        </Typography>
                                    )}
                                </Fact>
                            </Box>

                            <Box>
                                <SectionTitle icon="notepad">Description</SectionTitle>
                                {log.description ? (
                                    <Typography
                                        sx={{
                                            fontSize: 14, whiteSpace: 'pre-wrap', color: 'text.primary', lineHeight: 1.6,
                                            p: 1.75, borderRadius: 3,
                                            bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.05 : 0.028),
                                        }}
                                    >
                                        {log.description}
                                    </Typography>
                                ) : (
                                    <Typography sx={{ fontSize: 13.5, color: 'text.disabled' }}>
                                        No description for this entry.
                                    </Typography>
                                )}
                            </Box>

                            {attachments.length > 0 && (
                                <Box>
                                    <SectionTitle icon="paper-clip" count={attachments.length}>Attachments</SectionTitle>
                                    {/* Tiles, so an image is recognised before it is opened; every one
                                        opens in the page, never a new tab. */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.25 }}>
                                        {attachments.map((file) => (
                                            <Box
                                                key={file.url}
                                                component="button"
                                                type="button"
                                                onClick={() => setPreview(file)}
                                                title={`Preview ${file.fileName}`}
                                                sx={{
                                                    p: 0, textAlign: 'left', font: 'inherit', cursor: 'pointer', overflow: 'hidden',
                                                    display: 'flex', flexDirection: 'column', minWidth: 0,
                                                    borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                                                    transition: 'border-color .15s, box-shadow .15s',
                                                    '&:hover': { borderColor: 'primary.main', boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.15)}` },
                                                    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                                                }}
                                            >
                                                <Box sx={{
                                                    height: 92, flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center', color: 'text.secondary',
                                                    bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.035),
                                                }}>
                                                    {isImage(file) ? (
                                                        <Box component="img" src={file.url} alt="" loading="lazy" sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <KTIcon iconName="document" className="fs-2x" />
                                                    )}
                                                </Box>
                                                <Box sx={{ px: 1.25, py: 1, minWidth: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                                                    <Typography noWrap title={file.fileName} sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
                                                        {file.fileName}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{formatFileSize(Number(file.sizeBytes))}</Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Stack>
                    )}
                </Box>

                <Divider />
                <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2 }}>
                    {/* Destructive on its own side, away from the button people reach for. */}
                    {canWrite && (
                        <WtButton
                            ghost
                            tone="danger"
                            disabled={!log || deleting}
                            onClick={() => void remove()}
                            startIcon={<KTIcon iconName="trash" className="fs-5" />}
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </WtButton>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <WtButton ghost onClick={onClose}>Close</WtButton>
                    {canWrite && (
                        <WtButton
                            tone="primary"
                            disabled={!log}
                            onClick={() => setEditing(true)}
                            startIcon={<KTIcon iconName="pencil" className="fs-5" />}
                        >
                            Edit Log
                        </WtButton>
                    )}
                </Stack>
            </GlassDialog>

            {/* The SAME edit form the task panel and My Timesheet use — an entry edited from here
                and the same entry edited from there must not be two forms with two rules. */}
            {editing && timesheetId && (
                <NewTimeLogForm
                    show
                    timeSheetId={timesheetId}
                    onClose={() => {
                        setEditing(false);
                        void refetch();
                        onChanged?.();
                    }}
                />
            )}

            {preview && (
                <DocumentPreviewModal url={preview.url} title={preview.fileName} inPageOnly onClose={() => setPreview(null)} />
            )}
        </>
    );
};

export default TimeLogDetailDialog;

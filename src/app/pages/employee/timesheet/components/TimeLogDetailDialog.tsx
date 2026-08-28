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
import { formatDateTime } from '@utils/dateFormats';
import { formatFileSize } from '@utils/fileValidation';
import { deleteTimeSheetById, getTimesheetById } from '@services/tasks';
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';
import NewTimeLogForm from '../employeetimesheet/component/NewTimeLogForm';

/** `2h 20m 0s` from the three stored columns — the same shape the rest of the module shows. */
const duration = (h?: number, m?: number, s?: number) =>
    `${h ?? 0}h ${m ?? 0}m ${s ?? 0}s`;

const personName = (employee?: { users?: { firstName?: string | null; lastName?: string | null } | null } | null) =>
    `${employee?.users?.firstName ?? ''} ${employee?.users?.lastName ?? ''}`.trim() || '—';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Stack direction="row" spacing={2} alignItems="baseline" sx={{ py: 0.6, minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 104, flexShrink: 0 }}>
            {label}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>{children}</Box>
    </Stack>
);

const Plain = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{children}</Typography>
);

const SectionTitle = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ color: 'primary.main', lineHeight: 0 }}><KTIcon iconName={icon} className="fs-6" /></Box>
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
            {children}
        </Typography>
    </Stack>
);

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
    const theme = useTheme();
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['timesheet', timesheetId],
        queryFn: () => getTimesheetById(timesheetId as string),
        enabled: open && !!timesheetId,
    });

    const log = data?.timeSheet ?? data?.data?.timeSheet ?? null;
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

    return (
        <>
            <GlassDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <GlassHeader
                    icon={<KTIcon iconName="timer" className="fs-1" />}
                    title={log?.task?.taskName || 'Time log'}
                    subtitle={timesheetId ? `Time Log #${timesheetId.slice(0, 4)}` : ''}
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
                        <Stack spacing={2}>
                            {/* The headline figure, because "how long" is the question a time log
                                is opened to answer. */}
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={2}
                                sx={{
                                    p: 1.5, borderRadius: 2,
                                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.06),
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Duration</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>
                                        {duration(log.logTimeHours, log.logTimeMinutes, log.logTimeSeconds)}
                                    </Typography>
                                </Box>
                                <Chip
                                    size="small"
                                    label={log.billable ? 'Billable' : 'Non-billable'}
                                    sx={{
                                        height: 22, fontSize: 10.5, fontWeight: 700,
                                        bgcolor: alpha(log.billable ? theme.palette.success.main : theme.palette.text.primary, 0.14),
                                        color: log.billable ? theme.palette.success.main : 'text.secondary',
                                    }}
                                />
                            </Stack>

                            <Box>
                                <SectionTitle icon="briefcase">The work</SectionTitle>
                                <Row label="Task"><Plain>{log.task?.taskName || '—'}</Plain></Row>
                                <Row label="Project"><Plain>{log.lead?.title || 'General task'}</Plain></Row>
                                <Row label="Logged by"><Plain>{personName(log.employee)}</Plain></Row>
                            </Box>

                            <Divider />

                            <Box>
                                <SectionTitle icon="time">When</SectionTitle>
                                <Row label="Start"><Plain>{log.startTime ? formatDateTime(log.startTime) : '—'}</Plain></Row>
                                <Row label="End"><Plain>{log.endTime ? formatDateTime(log.endTime) : 'Still running'}</Plain></Row>
                                <Row label="Recorded"><Plain>{log.createdAt ? formatDateTime(log.createdAt) : '—'}</Plain></Row>
                                {log.updatedAt && log.updatedAt !== log.createdAt && (
                                    <Row label="Last edited"><Plain>{formatDateTime(log.updatedAt)}</Plain></Row>
                                )}
                            </Box>

                            {/* What the person wrote. The reason this dialog exists — the old page
                                collected a description and then never showed it anywhere. */}
                            <Divider />
                            <Box>
                                <SectionTitle icon="notepad">What was done</SectionTitle>
                                {log.description ? (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            whiteSpace: 'pre-wrap', color: 'text.primary',
                                            p: 1.5, borderRadius: 1.5,
                                            bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.03),
                                        }}
                                    >
                                        {log.description}
                                    </Typography>
                                ) : (
                                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                        Nothing was written for this entry.
                                    </Typography>
                                )}
                            </Box>

                            {attachments.length > 0 && (
                                <>
                                    <Divider />
                                    <Box>
                                        <SectionTitle icon="paper-clip">
                                            {`Attachments (${attachments.length})`}
                                        </SectionTitle>
                                        <Stack spacing={0.75}>
                                            {attachments.map((file) => (
                                                <Stack
                                                    key={file.url}
                                                    component="a"
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    direction="row"
                                                    spacing={1}
                                                    alignItems="center"
                                                    sx={{
                                                        p: 1, borderRadius: 1.25, textDecoration: 'none',
                                                        border: '1px solid', borderColor: 'divider',
                                                        color: 'text.primary',
                                                        '&:hover': { borderColor: 'primary.main' },
                                                    }}
                                                >
                                                    <Box sx={{ color: 'text.secondary', lineHeight: 0 }}>
                                                        <KTIcon
                                                            iconName={(file.contentType || '').startsWith('image/') ? 'picture' : 'document'}
                                                            className="fs-5"
                                                        />
                                                    </Box>
                                                    <Typography variant="caption" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
                                                        {file.fileName}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
                                                        {formatFileSize(Number(file.sizeBytes))}
                                                    </Typography>
                                                </Stack>
                                            ))}
                                        </Stack>
                                    </Box>
                                </>
                            )}
                        </Stack>
                    )}
                </Box>

                <Stack
                    direction={{ xs: 'column-reverse', sm: 'row' }}
                    spacing={1}
                    justifyContent="flex-end"
                    sx={{ px: 3, pb: 3, pt: 0.5 }}
                >
                    <WtButton ghost onClick={onClose}>Close</WtButton>
                    <WtButton
                        tone="danger"
                        disabled={!log || deleting}
                        onClick={() => void remove()}
                        startIcon={<KTIcon iconName="trash" className="fs-5" />}
                    >
                        {deleting ? 'Deleting…' : 'Delete'}
                    </WtButton>
                    <WtButton
                        disabled={!log}
                        onClick={() => setEditing(true)}
                        startIcon={<KTIcon iconName="pencil" className="fs-5" />}
                    >
                        Edit log
                    </WtButton>
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
        </>
    );
};

export default TimeLogDetailDialog;

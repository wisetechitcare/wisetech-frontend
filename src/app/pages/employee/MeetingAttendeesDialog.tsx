import React, { useCallback, useEffect, useState } from 'react';
import {
    Avatar, Box, CircularProgress, Dialog, DialogContent, Stack, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import Swal from 'sweetalert2';
import { KTIcon } from '@metronic/helpers';
import { PlainDialogHeader, WtButton } from '@app/modules/common/components/ui';
import { getMeetingAttendance, setMeetingAttendance } from '@services/employee';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';

export interface Attendee {
    employeeId: string;
    name: string | null;
    avatar: string | null;
    isOrganizer: boolean;
    /** `true` / `false` said by someone; `null` means nobody has said. */
    attended: boolean | null;
    logged: boolean;
    loggedMinutes?: number;
}

export interface MeetingAttendeesDialogProps {
    open: boolean;
    onClose: () => void;
    /** Called after any change, so the board can repaint its avatars. */
    onChanged?: () => void;
    employeeId: string;
    meeting: { id: string; title: string } | null;
}

/**
 * Initials, for the people with no photo. Two letters, never one.
 */
export const initialsOf = (name?: string | null) =>
    (name || '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('') || '?';

/**
 * The three states an attendee's avatar can be in, and the ring that says which.
 *
 * ─── THE RING IS ABOUT THE TIMESHEET ─────────────────────────────────────────
 * Green means their time is logged, red means it is not — which is the question a project
 * manager is actually asking when they look at a finished meeting, because the meeting's cost
 * is the sum of what its attendees logged and a missing entry is a missing number.
 *
 * "Did not attend" is a different axis, and it wins: somebody who says they were not there is
 * not chased for a timesheet, so they leave the row entirely rather than sitting in it as a
 * permanent red mark for work they never did.
 */
export const ringFor = (a: Attendee) => (a.logged
    ? { color: '#16A34A', label: 'Timesheet submitted' }
    : { color: '#DC2626', label: 'Timesheet outstanding' });

/**
 * Meeting attendance.
 *
 * ─── ATTENDANCE IS ANSWERED, NOT ASSUMED ─────────────────────────────────────
 * An invite list is a plan. Who turned up is a different fact, and the only people who know it
 * are the ones who were or were not in the room — so each person answers for themselves. The
 * organiser and the project's managers, primary or not, may answer for anyone: chasing five
 * people for a click is how a record stops being kept, and they are the people already
 * trusted to change the meeting itself. `markedById` records which of the two it was.
 *
 * Saying "I was not there" does NOT delete anybody from the meeting. The invite stays exactly
 * as it was written; what changes is that the person stops being counted among the attendees,
 * stops being asked for a timesheet, and stops seeing the meeting in their own timesheet
 * picker. Destroying the invite to record the absence would lose a fact nothing can rebuild —
 * and would quietly rewrite a meeting whose cost has already been reported.
 */
const MeetingAttendeesDialog: React.FC<MeetingAttendeesDialogProps> = ({
    open, onClose, onChanged, employeeId, meeting,
}) => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const [rows, setRows] = useState<Attendee[]>([]);
    /**
      * Whether I may record attendance for OTHER people — the organiser, the project's primary
      * manager, or any of its managers. The server answers it with the same guard it enforces
      * on the write, so this screen cannot disagree with what the API will actually allow.
      */
    const [canManageAll, setCanManageAll] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!meeting) return;
        setLoading(true);
        try {
            const res = await getMeetingAttendance(meeting.id, employeeId);
            setRows((res?.data?.attendees ?? []) as Attendee[]);
            setCanManageAll(!!res?.data?.canManageAll);
        } catch (error) {
            errorConfirmation(apiErrorMessage(error, 'Could not load the attendance for this meeting.'));
        } finally {
            setLoading(false);
        }
    }, [meeting?.id, employeeId]);

    useEffect(() => { if (open) void load(); }, [open, load]);

    /** You always answer for yourself; the organiser and the project's managers, for anybody. */
    const mayAnswerFor = (a: Attendee) => a.employeeId === employeeId || canManageAll;

    const mark = async (a: Attendee, attended: boolean) => {
        if (!meeting) return;
        if (!attended) {
            // Confirmed, because it is the answer with consequences: they leave the attendee
            // list and the meeting leaves their timesheet. Naming both is what makes it a
            // decision rather than a click.
            const self = a.employeeId === employeeId;
            const result = await Swal.fire({
                title: self ? 'Mark yourself as absent?' : `Mark ${a.name} as absent?`,
                html: `${self ? 'You are' : 'They are'} removed from the attendee list, and this meeting `
                    + `no longer appears in ${self ? 'your' : 'their'} timesheet.`
                    + '<br/><br/>The invitation is retained, and this can be reversed.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#B45309',
                cancelButtonColor: '#64748B',
                confirmButtonText: 'Mark absent',
                cancelButtonText: 'Cancel',
            });
            if (!result.isConfirmed) return;
        }
        setSaving(a.employeeId);
        try {
            const res = await setMeetingAttendance(meeting.id, a.employeeId, attended, employeeId);
            setRows((res?.data?.attendees ?? []) as Attendee[]);
            setCanManageAll(!!res?.data?.canManageAll);
            successConfirmation(attended ? 'Marked present' : 'Marked absent');
            onChanged?.();
        } catch (error) {
            errorConfirmation(apiErrorMessage(error, 'Could not record the attendance.'));
        } finally {
            setSaving(null);
        }
    };

    const present = rows.filter((r) => r.attended !== false);
    const absent = rows.filter((r) => r.attended === false);
    const awaiting = present.filter((r) => !r.logged).length;

    const Row = ({ a, muted }: { a: Attendee; muted?: boolean }) => {
        const ring = ringFor(a);
        const busy = saving === a.employeeId;
        return (
            <Stack
                direction="row" spacing={1.5} alignItems="center"
                sx={{
                    py: 1, px: 1.25, borderRadius: 2, minWidth: 0,
                    bgcolor: muted ? 'transparent' : alpha(theme.palette.text.primary, dark ? 0.05 : 0.025),
                    opacity: muted ? 0.62 : 1,
                }}
            >
                <Avatar
                    src={a.avatar || undefined}
                    sx={{
                        width: 34, height: 34, fontSize: 12, fontWeight: 700, flexShrink: 0,
                        ...(muted ? {} : { boxShadow: `0 0 0 2px ${ring.color}` }),
                        filter: muted ? 'grayscale(1)' : undefined,
                    }}
                >
                    {initialsOf(a.name)}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {a.name || 'Unknown'}
                        </Typography>
                        {a.isOrganizer && (
                            <Typography variant="caption" sx={{
                                px: 0.75, borderRadius: 5, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
                                bgcolor: alpha('#1E3A8A', dark ? 0.35 : 0.12), color: dark ? '#BFD2F5' : '#1E3A8A',
                            }}>
                                ORGANIZER
                            </Typography>
                        )}
                    </Stack>
                    <Typography variant="caption" sx={{ color: muted ? 'text.disabled' : ring.color, fontWeight: 600 }}>
                        {muted
                            ? 'Marked absent'
                            : a.logged
                                ? `${a.loggedMinutes ? `${Math.floor(a.loggedMinutes / 60)}h ${a.loggedMinutes % 60}m` : 'Time'} logged`
                                : 'Timesheet outstanding'}
                    </Typography>
                </Box>

                {mayAnswerFor(a) && (
                    busy
                        ? <CircularProgress size={16} />
                        : muted
                            ? (
                                <Tooltip title="Add them back to the attendee list">
                                    <span>
                                        <WtButton size="small" ghost onClick={() => void mark(a, true)}>
                                            Mark present
                                        </WtButton>
                                    </span>
                                </Tooltip>
                            )
                            : (
                                <Tooltip title="Remove them from the attendee list">
                                    <span>
                                        <WtButton size="small" ghost onClick={() => void mark(a, false)}>
                                            Mark absent
                                        </WtButton>
                                    </span>
                                </Tooltip>
                            )
                )}
            </Stack>
        );
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <PlainDialogHeader
                icon={<KTIcon iconName="people" className="fs-2" />}
                title="Attendance"
                subtitle={meeting?.title}
                onClose={saving ? undefined : onClose}
                closeIcon={<KTIcon iconName="cross" className="fs-3" />}
            />

            <DialogContent sx={{ p: 2 }}>
                {loading ? (
                    <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={24} /></Stack>
                ) : (
                    <Stack spacing={0.5}>
                        {/* The count that matters: a meeting's cost is the sum of what its
                            attendees logged, so an unlogged attendee is a missing number. */}
                        <Typography variant="caption" sx={{ color: 'text.secondary', px: 1.25, pb: 0.5 }}>
                            {present.length} {present.length === 1 ? 'attendee' : 'attendees'}
                            {awaiting > 0 && ` · ${awaiting} ${awaiting === 1 ? 'timesheet' : 'timesheets'} outstanding`}
                        </Typography>

                        {present.map((a) => <Row key={a.employeeId} a={a} />)}

                        {absent.length > 0 && (
                            <>
                                <Typography variant="caption" sx={{ color: 'text.secondary', px: 1.25, pt: 1.5, pb: 0.5 }}>
                                    Marked absent — invitation retained, excluded from the cost
                                </Typography>
                                {absent.map((a) => <Row key={a.employeeId} a={a} muted />)}
                            </>
                        )}

                        {!rows.length && (
                            <Typography variant="body2" sx={{ color: 'text.secondary', px: 1.25, py: 3, textAlign: 'center' }}>
                                No one has been invited to this meeting yet.
                            </Typography>
                        )}
                    </Stack>
                )}

                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                    <WtButton onClick={onClose} disabled={!!saving}>Close</WtButton>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default MeetingAttendeesDialog;

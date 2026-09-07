import React, { useState } from 'react';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import MeetingsList, { toEditableMeeting } from '@app/modules/common/components/MeetingsList';
import MeetingDialog from '@app/pages/employee/MeetingDialog';
// The SAME form the timesheet uses. There were two, writing the same Timesheet row
// through different endpoints, so what logging an hour asked you depended on which
// screen you started from.
import NewTimeLogForm from '@app/pages/employee/timesheet/employeetimesheet/component/NewTimeLogForm';
import MeetingRemindersDialog from '@app/pages/employee/MeetingRemindersDialog';
import { setMeetingCancelled, updateMeeting } from '@services/employee';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';

/**
 * A project's Meetings tab.
 *
 * The list is the same `MeetingsList` the calendar renders; this supplies the ACTIONS, which
 * the project tab previously had none of. Editing, cancelling and dragging worked on the
 * calendar's copy and silently did nothing here, so what a meeting could do depended on which
 * screen you happened to be looking at it from.
 *
 * The API decides who may actually change a meeting — organizer, or a manager of its project —
 * so offering the actions here is not a widening of permission, only of reach. A refusal comes
 * back in the server's own words.
 */
const ProjectMeetings: React.FC<{ leadId: string }> = ({ leadId }) => {
    const currentEmployeeId = useSelector((s: RootState) => s.employee.currentEmployee.id);
    const [reloadToken, setReloadToken] = useState(0);
    const [editing, setEditing] = useState<ReturnType<typeof toEditableMeeting> | null>(null);
    const [open, setOpen] = useState(false);
    const [logging, setLogging] = useState<any>(null);
    const [reminding, setReminding] = useState<any>(null);

    const reload = () => setReloadToken((n) => n + 1);

    const handleCancel = async ({ id, cancelled }: { id: string; cancelled: boolean }) => {
        if (!cancelled) {
            await setMeetingCancelled(id, currentEmployeeId, false)
                .then(() => { successConfirmation('Meeting restored'); reload(); })
                .catch((error) => errorConfirmation(apiErrorMessage(error, 'Could not restore the meeting.')));
            return;
        }
        const result = await Swal.fire({
            title: 'Cancel this meeting?',
            text: 'It leaves the calendar, and stays on this project record as a cancelled meeting.',
            icon: 'question',
            input: 'text',
            inputPlaceholder: 'Reason (optional)',
            showCancelButton: true,
            confirmButtonColor: '#B45309',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Cancel meeting',
            cancelButtonText: 'Keep it',
        });
        if (!result.isConfirmed) return;
        try {
            await setMeetingCancelled(id, currentEmployeeId, true, result.value || undefined);
            successConfirmation('Meeting cancelled');
            reload();
        } catch (error) {
            errorConfirmation(apiErrorMessage(error, 'Could not cancel the meeting.'));
        }
    };

    /** The grid has already worked out the new start/end — day moved, clock untouched. */
    const handleReschedule = async (m: any, next: { startDate: string; endDate: string }) => {
        try {
            await updateMeeting(m.id, currentEmployeeId, {
                title: m.title,
                description: m.description || '',
                startDate: next.startDate,
                endDate: next.endDate,
                isOnline: m.isOnline,
                meetingLink: m.isOnline ? (m.meetingLink || undefined) : undefined,
                location: m.isOnline ? undefined : (m.location || undefined),
                participants: m.participants || undefined,
                externalParticipants: m.externalParticipants || undefined,
                projectId: m.projectId || undefined,
                // A drag is a quick correction; mailing everyone on every nudge is how people
                // learn to ignore meeting mail.
                notifyIds: [],
            });
            successConfirmation(`Moved to ${dayjs(next.startDate).format('DD MMM')}`);
            reload();
        } catch (error) {
            errorConfirmation(apiErrorMessage(error, 'Could not move the meeting.'));
        }
    };

    return (
        <>
            <MeetingsList
                mode="project"
                targetId={leadId}
                reloadToken={reloadToken}
                onEdit={(m) => { setEditing(toEditableMeeting(m)); setOpen(true); }}
                onCancel={handleCancel}
                onReschedule={handleReschedule}
                onLogTime={(m) => setLogging(m)}
                onRemind={(m) => setReminding(m)}
            />

            <NewTimeLogForm
                key={logging?.id ?? 'none'}
                show={!!logging}
                prefilledMeetingId={logging?.id}
                onClose={() => { setLogging(null); reload(); }}
            />

            <MeetingRemindersDialog
                open={!!reminding}
                meeting={reminding}
                employeeId={currentEmployeeId}
                onClose={() => setReminding(null)}
            />

            {/* Keyed on the meeting so opening a second one refills rather than showing the
                first one's values — the form prefills on mount. */}
            <MeetingDialog
                key={editing?.id ?? 'none'}
                open={open}
                editing={editing}
                onClose={() => setOpen(false)}
                onSaved={() => { setOpen(false); reload(); }}
            />
        </>
    );
};

export default ProjectMeetings;

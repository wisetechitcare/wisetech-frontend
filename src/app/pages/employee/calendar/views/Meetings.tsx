import React, { useState } from 'react';
import { deleteMeeting, setMeetingCancelled, updateMeeting } from '@services/employee';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import MeetingDialog from '../../MeetingDialog';
import LogMeetingTimeDialog from '../../LogMeetingTimeDialog';
import MeetingRemindersDialog from '../../MeetingRemindersDialog';
import MeetingsList, { toEditableMeeting } from '@app/modules/common/components/MeetingsList';
// The server states WHY it refused; repeating a guess here is how a validation failure ends up
// reported as a permission problem.
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';
import { errorConfirmation, successConfirmation } from '@utils/modal';

/**
 * The Calendar module's Meetings tab.
 *
 * The list itself is `MeetingsList` — the SAME component the project, contact and employee
 * pages render. This screen used to carry its own MaterialTable over the same rows, which
 * meant the month view had to be built here and again there, and the two would have drifted
 * the first time either was touched. What is left on this page is what is genuinely local to
 * it: who may create, who may delete, and the dialog.
 *
 * `mode="employee"` with the signed-in employee is what makes it personal — the API answers
 * with the meetings they organize OR are a participant on, and nothing else.
 */
const Meetings = () => {
  const currentEmployeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  // Bumped after a create or a delete: the list owns its own fetch, and this is how a parent
  // that changed the data tells it to read again.
  const [reloadToken, setReloadToken] = useState(0);
  // The meeting being edited. null → the dialog opens on a blank new meeting.
  const [editing, setEditing] = useState<ReturnType<typeof toEditableMeeting> | null>(null);
  // The meeting whose time is being logged. null → the dialog is closed.
  const [logging, setLogging] = useState<any>(null);
  // Not gated on canCreate: a reminder is the reader's own, like logging their own time.
  const [reminding, setReminding] = useState<any>(null);

  const canCreate = hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.create);
  const canDelete = hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.deleteOwn);

  const reload = () => setReloadToken((n) => n + 1);

  /**
   * Cancel is the normal thing; delete is the rare one.
   *
   * Cancelling keeps the row, so the project it was booked on still shows it was booked — the
   * reason is optional because making it mandatory just produces a field full of ".". Only the
   * organizer may do either, and the API refuses anyone else.
   */
  const handleCancel = async ({ id, cancelled }: { id: string; cancelled: boolean }) => {
    if (!cancelled) {
      await setMeetingCancelled(id, currentEmployeeId, false)
        .then(() => { successConfirmation('Meeting restored'); reload(); })
        .catch((error) => errorConfirmation(apiErrorMessage(error, 'Could not restore the meeting.')));
      return;
    }
    const result = await Swal.fire({
      title: 'Cancel this meeting?',
      text: 'It leaves your calendar, and stays on the project record as a cancelled meeting.',
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
      console.error('Error cancelling meeting', error);
      errorConfirmation(apiErrorMessage(error, 'Could not cancel the meeting.'));
    }
  };

  /**
   * Drag-to-reschedule. The grid has already worked out the new start/end — day shifted, clock
   * untouched — so this only has to persist it.
   *
   * `notifyIds: []` deliberately: a drag is a quick correction, and mailing everyone on every
   * nudge is how people learn to ignore meeting mail. Open the meeting and save if the change
   * is worth announcing.
   */
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
        notifyIds: [],
      });
      successConfirmation(`Moved to ${dayjs(next.startDate).format('DD MMM')}`);
      reload();
    } catch (error) {
      console.error('Error rescheduling meeting', error);
      errorConfirmation(apiErrorMessage(error, 'Could not move the meeting.'));
    }
  };

  const handleDelete = async (meetingId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this meeting!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await deleteMeeting(meetingId, currentEmployeeId);
        successConfirmation('Meeting deleted successfully');
        reload();
      } catch (error) {
        console.error('Error deleting meeting', error);
        errorConfirmation('Failed to delete meeting');
      }
    }
  };

  return (
    <div className="px-lg-0 px-2 pt-4">
      <MeetingsList
        mode="employee"
        targetId={currentEmployeeId}
        reloadToken={reloadToken}
        onCreate={canCreate ? () => { setEditing(null); setShowMeetingForm(true); } : undefined}
        onEdit={canCreate ? (m) => { setEditing(toEditableMeeting(m)); setShowMeetingForm(true); } : undefined}
        onReschedule={canCreate ? handleReschedule : undefined}
        onLogTime={(m) => setLogging(m)}
        onRemind={(m) => setReminding(m)}
        onCancel={canCreate ? handleCancel : undefined}
        onDelete={canDelete ? handleDelete : undefined}
      />

      {/* The same dialog the calendar and the task form open — the third and last copy of
          this modal. */}
      <LogMeetingTimeDialog
        open={!!logging}
        meeting={logging}
        employeeId={currentEmployeeId}
        onClose={() => setLogging(null)}
        onSaved={() => { setLogging(null); reload(); }}
      />

      <MeetingRemindersDialog
        open={!!reminding}
        meeting={reminding}
        employeeId={currentEmployeeId}
        onClose={() => setReminding(null)}
      />

      <MeetingDialog
        // Remounted per meeting: the form prefills from `editing` on mount, and reusing one
        // instance across two different meetings would show the first one's values.
        key={editing?.id ?? 'new'}
        open={showMeetingForm}
        editing={editing}
        onClose={() => setShowMeetingForm(false)}
        onSaved={reload}
        selectedDateTimeInfo={{ startStr: dayjs().toISOString() }}
      />
    </div>
  );
};

export default Meetings;

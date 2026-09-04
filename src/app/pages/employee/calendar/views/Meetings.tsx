import React, { useState } from 'react';
import { deleteMeeting } from '@services/employee';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import MeetingDialog from '../../MeetingDialog';
import MeetingsList from '@app/modules/common/components/MeetingsList';
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

  const canCreate = hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.create);
  const canDelete = hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.deleteOwn);

  const reload = () => setReloadToken((n) => n + 1);

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
        onCreate={canCreate ? () => setShowMeetingForm(true) : undefined}
        onDelete={canDelete ? handleDelete : undefined}
      />

      {/* The same dialog the calendar and the task form open — the third and last copy of
          this modal. */}
      <MeetingDialog
        open={showMeetingForm}
        onClose={() => setShowMeetingForm(false)}
        onSaved={reload}
        selectedDateTimeInfo={{ startStr: dayjs().toISOString() }}
      />
    </div>
  );
};

export default Meetings;

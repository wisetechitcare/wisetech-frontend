import { useMemo } from "react";
import { AttendanceCorrectionDialog } from "@app/modules/common/components/attendance/AttendanceCorrectionDialog";
import { toCalendarKey } from "@utils/calendarKey";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

interface EditAttendanceRequestProps {
  show: boolean;
  onHide: () => void;
  selectedAttendanceRequest: any;
}

/**
 * Admin edit of an existing attendance request, from the attendance overview.
 *
 * Now the shared `AttendanceCorrectionDialog` in edit mode, with the status an admin
 * may set. It used to be its own Formik form on the Tailwind-twin dialog, and that
 * copy had three faults the shared one does not:
 *
 *   · it was seeded with the table's 12-hour DISPLAY strings ("9:59 AM") and then
 *     validated them as 24-hour, so saving an untouched edit failed validation;
 *   · it had no kind at all — a check-out-only request could not be edited without
 *     inventing a check-in, because Check In was required;
 *   · it knew nothing about the day, so it could put a check-in after the recorded
 *     check-out.
 *
 * The props and the refresh event are unchanged, so the overview needs no edit.
 */
const EditAttendanceRequest = ({ show, onHide, selectedAttendanceRequest }: EditAttendanceRequestProps) => {
  // Older callers passed the request nested under `attendanceRequests`; both shapes still reach here.
  const row = selectedAttendanceRequest?.attendanceRequests || selectedAttendanceRequest || {};

  const date = useMemo(
    () =>
      toCalendarKey(row.formattedDate) ??
      toCalendarKey(row.date) ??
      toCalendarKey(row.requestCheckIn ?? row.requestCheckOut ?? null),
    [row.formattedDate, row.date, row.requestCheckIn, row.requestCheckOut],
  );

  const request = useMemo(
    () =>
      row.id
        ? {
            id: row.id as string,
            // The request's OWN halves. `rawCheckIn` may be the enriched device punch.
            checkIn: row.requestCheckIn ?? null,
            checkOut: row.requestCheckOut ?? null,
            workingMethodId: row.workingMethodId ?? null,
            remarks: row.remarks ?? null,
            // `status` may have been overwritten with "Holiday" by the marker.
            status: row.requestStatus ?? (typeof row.status === "number" ? row.status : 0),
          }
        : null,
    [row.id, row.requestCheckIn, row.requestCheckOut, row.workingMethodId, row.remarks, row.requestStatus, row.status],
  );

  // A row whose day cannot be read is not something to guess at.
  if (!date || !request) return null;

  return (
    <AttendanceCorrectionDialog
      open={show}
      onClose={onHide}
      date={date}
      employeeId={row.employeeId}
      request={request}
      asAdmin
      title="Edit Attendance Request"
      successMessage="Attendance Request saved successfully"
      onSaved={({ id }) => {
        eventBus.emit(EVENT_KEYS.attendanceRequestUpdated, { id });
      }}
    />
  );
};

export default EditAttendanceRequest;

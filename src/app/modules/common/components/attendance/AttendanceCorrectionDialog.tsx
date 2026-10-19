/**
 * AttendanceCorrectionDialog — the correction form in a dialog, for every screen
 * that is not the calendar.
 *
 * Replaces four separate modals: the report table's raise modal and the open-request
 * table's edit modal (both react-bootstrap + Formik, inside Graphs.tsx), the admin
 * overview's edit modal (Tailwind twin + Formik), and the admin raise-for-employee
 * modal (MUI). The calendar renders the same `AttendanceCorrectionForm` inline.
 *
 * The shell is the MUI kit's `GlassDialog` with `plain` on — frosted glass over a
 * column of inputs shows the page through the surface someone is trying to read —
 * which is the same shell the calendar's day panel uses, so a correction looks the
 * same wherever it is raised.
 */
import { useState } from 'react';
import dayjs from 'dayjs';
import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, PlainDialogHeader } from '@app/modules/common/components/ui/glass';
import { EmployeePickerField } from '@app/modules/common/components/EmployeePickerField';
import { AttendanceCorrectionForm } from './AttendanceCorrectionForm';
import { useAttendanceCorrection, type UseAttendanceCorrectionArgs } from './useAttendanceCorrection';

export interface AttendanceCorrectionDialogProps
  extends Omit<UseAttendanceCorrectionArgs, 'open' | 'employeeId'> {
  open: boolean;
  onClose: () => void;
  /** Whose day. Omit together with `pickEmployee` to let an admin choose. */
  employeeId?: string;
  /** Show an employee picker (admin raising on someone's behalf). */
  pickEmployee?: boolean;
  title?: string;
  subtitle?: string;
}

export function AttendanceCorrectionDialog({
  open,
  onClose,
  employeeId: fixedEmployeeId = '',
  pickEmployee = false,
  title,
  subtitle,
  onSaved,
  ...args
}: AttendanceCorrectionDialogProps) {
  const [picked, setPicked] = useState('');
  const employeeId = pickEmployee ? picked : fixedEmployeeId;

  const correction = useAttendanceCorrection({
    ...args,
    open,
    employeeId,
    onSaved: async (result) => {
      await onSaved?.(result);
      setPicked('');
      onClose();
    },
  });

  const close = () => {
    setPicked('');
    onClose();
  };

  return (
    <GlassDialog
      open={open}
      onClose={close}
      maxWidth="sm"
      plain
      /* The reason-picker is a react-select, whose menu renders in a portal OUTSIDE this dialog.
         MUI's focus trap — now the kit default — would pull focus back the moment the menu opened
         and the picker could not be used. Opted out here rather than app-wide, so every dialog
         without a portaled menu still keeps its focus. */
      disableEnforceFocus
      header={
        <PlainDialogHeader
          icon={<KTIcon iconName={correction.mode === 'edit' ? 'notepad-edit' : 'calendar-add'} className="fs-2" />}
          title={title ?? (correction.mode === 'edit' ? 'Edit Attendance Correction' : 'Raise Attendance Correction')}
          subtitle={subtitle ?? dayjs(args.date).format('dddd, D MMMM YYYY')}
          onClose={close}
        />
      }
    >
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <AttendanceCorrectionForm
          correction={correction}
          showStatus={Boolean(args.asAdmin)}
          onCancel={close}
          submitLabel={pickEmployee ? 'Raise Request' : undefined}
          employeeSlot={
            pickEmployee ? (
              <EmployeeSlot
                value={picked}
                onChange={setPicked}
                attempted={correction.attempted}
                disabled={correction.saving}
                nothingRecorded={
                  Boolean(picked) && !correction.loadingDay && !correction.day?.actual.checkIn && !correction.day?.actual.checkOut
                }
              />
            ) : undefined
          }
        />
      </Box>
    </GlassDialog>
  );
}

/**
 * Who the request is for — one person, so a searchable single select, never a
 * checkbox dialog (a grid of every employee asks yes/no once per person to collect
 * one answer). Uses the shared EmployeePickerField (floating Sandwich + directory cache).
 */
function EmployeeSlot({
  value,
  onChange,
  attempted,
  disabled,
  nothingRecorded,
}: {
  value: string;
  onChange: (id: string) => void;
  attempted: boolean;
  disabled: boolean;
  nothingRecorded: boolean;
}) {
  return (
    <EmployeePickerField
      label="Employee"
      required
      value={value || null}
      onChange={(ids) => onChange(ids[0] ?? '')}
      disabled={disabled}
      placeholder="Search by name or designation…"
      error={attempted && !value ? 'Select who this request is for' : undefined}
      helperText={nothingRecorded ? 'Nothing is recorded for this employee on this date.' : undefined}
    />
  );
}

export default AttendanceCorrectionDialog;

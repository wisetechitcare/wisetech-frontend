/**
 * AttendanceCorrectionForm — the ONE correction form, inline or in a dialog.
 *
 * Presentational only: every decision comes from `useAttendanceCorrection`. The
 * calendar day panel renders this inline under the day's record; every other
 * screen renders it inside `AttendanceCorrectionDialog`. Same notices, same fields,
 * same order, same hints, same buttons — which is the whole point. The five screens
 * that used to raise or edit a correction showed five different forms.
 *
 * What a screen may add is only what genuinely differs:
 *   `employeeSlot`  an admin choosing WHO the request is for
 *   `showStatus`    an admin choosing where it LANDS (pending / approved / rejected)
 *   `onBack`        the inline panel's way back to the record it was opened from
 *   `onCancel`      a dialog's way out
 */
import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { CircularProgress, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import { WtField } from '@app/modules/common/components/ui/WtField';
import { InlineHint, InlineNotice } from '@app/modules/common/components/ui/InlineNotice';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { AttendanceRequestFields } from './AttendanceRequestFields';
import type { AttendanceCorrection } from './useAttendanceCorrection';

const STATUS_OPTIONS = [
  { value: '0', label: 'Pending' },
  { value: '1', label: 'Approved' },
  { value: '2', label: 'Rejected' },
];

export interface AttendanceCorrectionFormProps {
  correction: AttendanceCorrection;
  /** Rendered first — an admin picking who the request is for. */
  employeeSlot?: ReactNode;
  /** An admin chooses the status the request lands in. Never shown to an employee. */
  showStatus?: boolean;
  /** Inline use: back to the record the form was opened from. */
  onBack?: () => void;
  /** Dialog use: close without saving. */
  onCancel?: () => void;
  submitLabel?: string;
}

export function AttendanceCorrectionForm({
  correction: c,
  employeeSlot,
  showStatus = false,
  onBack,
  onCancel,
  submitLabel,
}: AttendanceCorrectionFormProps) {
  const label = submitLabel ?? (c.mode === 'edit' ? 'Save Changes' : 'Submit Request');

  return (
    <Stack spacing={1.5}>
      {employeeSlot}

      {(c.loadingDay || c.gate.checking) && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={14} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {c.loadingDay ? 'Loading the day…' : 'Checking earlier days…'}
          </Typography>
        </Stack>
      )}

      {/* The server's verdict, worded. It enforces the same rule on the write, so
          this is the reason a click would have failed — said before the click. */}
      {c.refusal && (
        <InlineNotice icon="lock-2" role="alert">
          {c.refusal}
        </InlineNotice>
      )}

      {c.gate.blocked && !c.gate.checking && (
        <InlineNotice icon="calendar-slash" role="alert">
          No attendance or request found for {dayjs(c.gate.blockingDate).format('DD-MM-YYYY')}. Mark attendance or
          raise a request for that day first.
        </InlineNotice>
      )}

      {c.nothingLeft && (
        <InlineNotice trio={TRIO.blue} icon="time">
          Both times for this day are already awaiting approval.
        </InlineNotice>
      )}

      {!c.blocked && Boolean(c.employeeId) && (
        <>
          <AttendanceRequestFields
            value={c.draft}
            onChange={c.onDraftChange}
            methods={c.methods}
            kinds={c.kinds}
            kindDisabled={c.kindBlocked}
            showErrors={c.attempted}
            disabled={c.saving}
          />

          {/* One reason per closed option, from the predicate that closed it, so a
              greyed segment never sits there unexplained. `both` is left out: it only
              closes because a half is pending, which that half's line already says. */}
          {(['checkin', 'checkout'] as const)
            .map((k) => c.kindBlocked(k))
            .filter((r, i, all): r is string => Boolean(r) && all.indexOf(r) === i)
            .map((reason) => (
              <InlineHint key={reason}>{reason}</InlineHint>
            ))}

          {/* Says what will happen: "it merged into the one I already raised" is
              surprising if you were expecting a second request. */}
          {c.mode === 'raise' && c.context.pendingCheckIn && !c.context.pendingCheckOut && (
            <InlineHint>A check-out will be added to that same pending request.</InlineHint>
          )}

          {showStatus && (
            <WtField
              label="Status"
              required
              value={c.status}
              onChange={c.setStatus}
              options={STATUS_OPTIONS}
              disabled={c.saving}
            />
          )}
        </>
      )}

      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" gap={1}>
        {onBack ? (
          <WtButton inverted onClick={onBack} startIcon={<KTIcon iconName="arrow-left" className="fs-5" />}>
            Back
          </WtButton>
        ) : onCancel ? (
          <WtButton ghost onClick={onCancel} disabled={c.saving}>
            Cancel
          </WtButton>
        ) : (
          <span />
        )}
        {!c.blocked && (
          <WtButton onClick={c.submit} disabled={!c.canSubmit}>
            {c.saving ? 'Saving…' : label}
          </WtButton>
        )}
      </Stack>
    </Stack>
  );
}

export default AttendanceCorrectionForm;

import { memo, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { Box } from '@mui/material';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { WtTooltip } from '@app/modules/common/components/ui/WtTooltip';
import { getTimeTokens } from '@utils/timeFormat';
import AttendanceDurationCell from './AttendanceDurationCell';
import { REQUIRED_SHIFT_MINUTES } from './attendanceDurationUtils';

export interface AttendanceDayTimesProps {
  /** ISO instants. A missing check-out renders the check-in alone. */
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  /** The late verdict for this day (server `lateMark` first — see utils/attendanceVerdicts). */
  isLate: boolean;
  /** The early-check-out verdict (server `earlyCheckout` first). */
  isEarly?: boolean;
  /** Shown on hover over a red check-in, e.g. "Late by 25m". */
  lateDetail?: string;
  /** Shown on hover over a red check-out, e.g. "Early by 1h 10m". */
  earlyDetail?: string;
  /** Required shift length for the duration's red highlight. */
  requiredMinutes?: number;
  /** No short-shift highlight on a non-working day (there is no shift to complete). */
  skipDurationHighlight?: boolean;
  /** Anything rendered after the times (working-method chip, map link…). */
  trailing?: ReactNode;
}

/** "7h 5m" — the format AttendanceDurationCell parses. */
function workedLabel(checkIn: string | Date, checkOut: string | Date): string | null {
  const minutes = dayjs(checkOut).diff(dayjs(checkIn), 'minute');
  if (!(minutes > 0)) return null;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const TimeValue = ({ icon, time, danger, tooltip, label }: {
  icon: string; time: string; danger: boolean; tooltip: string; label: string;
}) => (
  <WtTooltip title={tooltip}>
    <Box
      component="span"
      aria-label={`${tooltip} at ${time}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        color: danger ? 'error.main' : 'success.main',
        fontWeight: 500,
      }}
    >
      {/* A warning glyph when red — the state must not be carried by colour alone. */}
      <AppIcon name={danger ? 'bi-exclamation-triangle-fill' : icon} className="fs-7" />
      <span data-label={label}>{time}</span>
    </Box>
  </WtTooltip>
);

/**
 * One day's check-in / check-out / duration, with the attendance colour rule in ONE place:
 *
 *   check-in   red ONLY for a late mark   (never because the day was short)
 *   check-out  red ONLY for an early check-out
 *   duration   red ONLY when the shift is shorter than required
 *
 * The employee lists in the dashboard and the admin Overview each hand-rolled this, and one
 * coloured an on-time check-in red whenever the day ran under 8 hours.
 */
function AttendanceDayTimes({
  checkIn,
  checkOut,
  isLate,
  isEarly = false,
  lateDetail,
  earlyDetail,
  requiredMinutes = REQUIRED_SHIFT_MINUTES,
  skipDurationHighlight = false,
  trailing,
}: AttendanceDayTimesProps) {
  const timeFormat = getTimeTokens().TIME;
  const duration = checkIn && checkOut ? workedLabel(checkIn, checkOut) : null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.5, mt: 0.5, fontSize: '0.8125rem' }}>
      {checkIn && (
        <TimeValue
          icon="bi-clock"
          label="check-in"
          time={dayjs(checkIn).format(timeFormat)}
          danger={isLate}
          tooltip={isLate ? (lateDetail ? `Late check-in · ${lateDetail}` : 'Late check-in') : 'On-time check-in'}
        />
      )}
      {checkOut && (
        <TimeValue
          icon="bi-clock-fill"
          label="check-out"
          time={dayjs(checkOut).format(timeFormat)}
          danger={isEarly}
          tooltip={isEarly ? (earlyDetail ? `Early check-out · ${earlyDetail}` : 'Early check-out') : 'On-time check-out'}
        />
      )}
      {duration && (
        <AttendanceDurationCell
          duration={duration}
          checkOut={typeof checkOut === 'string' ? checkOut : checkOut ? dayjs(checkOut).toISOString() : null}
          requiredMinutes={requiredMinutes}
          skipIncompleteHighlight={skipDurationHighlight}
        />
      )}
      {trailing}
    </Box>
  );
}

export default memo(AttendanceDayTimes);

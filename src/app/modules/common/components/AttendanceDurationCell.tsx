import React, { memo, useMemo } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ATTENDANCE_COLORS } from '@utils/attendanceColorUtils';
import {
  formatDurationShortfall,
  formatRequiredShiftLabel,
  isCheckOutMissing,
  isShiftIncomplete,
  parseDurationToMinutes,
  REQUIRED_SHIFT_MINUTES,
} from './attendanceDurationUtils';
import './AttendanceDurationCell.css';

export interface AttendanceDurationCellProps {
  duration?: string | null;
  checkOut?: string | null;
  requiredMinutes?: number;
  /** Skip incomplete styling on weekends/holidays */
  skipIncompleteHighlight?: boolean;
}

function AttendanceDurationCell({
  duration,
  checkOut,
  requiredMinutes = REQUIRED_SHIFT_MINUTES,
  skipIncompleteHighlight = false,
}: AttendanceDurationCellProps) {
  const missingCheckout = isCheckOutMissing(checkOut);
  const displayDuration =
    duration && !isCheckOutMissing(duration) ? duration : '—';

  const incomplete =
    !skipIncompleteHighlight &&
    !missingCheckout &&
    isShiftIncomplete(duration, requiredMinutes);

  const tooltipText = useMemo(() => {
    if (missingCheckout) {
      return 'Check-out not recorded';
    }
    if (!duration || displayDuration === '—') {
      return undefined;
    }
    const total = parseDurationToMinutes(duration);
    if (total === null) return undefined;
    const requiredLabel = formatRequiredShiftLabel(requiredMinutes);
    const worked =
      total >= 60
        ? `${Math.floor(total / 60)}h ${total % 60}m`
        : `${total}m`;
    if (incomplete) {
      const shortfall = formatDurationShortfall(duration, requiredMinutes);
      return `Shift incomplete: ${worked} / ${requiredLabel} required${shortfall ? ` (${shortfall})` : ''}`;
    }
    return undefined;
  }, [duration, displayDuration, incomplete, missingCheckout, requiredMinutes]);

  if (missingCheckout || displayDuration === '—') {
    const node = (
      <span className="attendance-duration-cell__muted">{displayDuration}</span>
    );
    if (!tooltipText) return node;
    return (
      <OverlayTrigger placement="auto" overlay={<Tooltip id="duration-missing-co">{tooltipText}</Tooltip>}>
        <span>{node}</span>
      </OverlayTrigger>
    );
  }

  if (incomplete) {
    const shortfall = formatDurationShortfall(duration!, requiredMinutes);
    const content = (
      <span className="duration-pill-danger attendance-duration-cell__pill">
        {displayDuration}
        <span className="attendance-duration-cell__warn" aria-hidden>
          ⚠
        </span>
      </span>
    );
    return (
      <OverlayTrigger
        placement="auto"
        overlay={<Tooltip id="duration-incomplete">{tooltipText}</Tooltip>}
      >
        <span>{content}</span>
      </OverlayTrigger>
    );
  }

  return (
    <span className="attendance-duration-cell__normal" style={{ color: ATTENDANCE_COLORS.normal }}>
      {displayDuration}
    </span>
  );
}

export default memo(AttendanceDurationCell);

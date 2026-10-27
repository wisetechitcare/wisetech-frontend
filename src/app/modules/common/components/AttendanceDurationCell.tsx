import { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { WtTooltip } from '@app/modules/common/components/ui/WtTooltip';
import {
  formatDurationShortfall,
  formatRequiredShiftLabel,
  isCheckOutMissing,
  isShiftIncomplete,
  parseDurationToMinutes,
  REQUIRED_SHIFT_MINUTES,
} from './attendanceDurationUtils';

export interface AttendanceDurationCellProps {
  duration?: string | null;
  checkOut?: string | null;
  requiredMinutes?: number;
  /** Skip incomplete styling on weekends/holidays */
  skipIncompleteHighlight?: boolean;
}

/**
 * A worked duration. Red pill with a warning glyph when the shift is shorter than required
 * (the ONE place a short day is flagged — never the check-in time, which is red only for a
 * late mark); muted when no check-out was recorded.
 *
 * MUI + the kit's WtTooltip, themed (works in dark mode). The `attendance-duration-cell__*`
 * class names are kept as stable hooks: tables restyle the muted state through them.
 */
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
    if (missingCheckout) return 'Check-out not recorded';
    if (!duration || displayDuration === '—' || !incomplete) return undefined;
    const total = parseDurationToMinutes(duration);
    if (total === null) return undefined;
    const worked = total >= 60 ? `${Math.floor(total / 60)}h ${total % 60}m` : `${total}m`;
    const shortfall = formatDurationShortfall(duration, requiredMinutes);
    return `Shift incomplete: ${worked} / ${formatRequiredShiftLabel(requiredMinutes)} required${shortfall ? ` (${shortfall})` : ''}`;
  }, [duration, displayDuration, incomplete, missingCheckout, requiredMinutes]);

  if (missingCheckout || displayDuration === '—') {
    return (
      <WtTooltip title={tooltipText}>
        <Box
          component="span"
          className="attendance-duration-cell__muted"
          sx={{ color: 'text.secondary', fontWeight: 500, opacity: 0.85 }}
        >
          {displayDuration}
        </Box>
      </WtTooltip>
    );
  }

  if (incomplete) {
    return (
      <WtTooltip title={tooltipText}>
        <Box
          component="span"
          className="attendance-duration-cell__pill"
          aria-label={tooltipText}
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: '12px',
            bgcolor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
            color: 'error.main',
            fontWeight: 500,
            lineHeight: 1.35,
          })}
        >
          {displayDuration}
          <Box component="span" aria-hidden sx={{ fontSize: '0.75rem', lineHeight: 1 }}>
            ⚠
          </Box>
        </Box>
      </WtTooltip>
    );
  }

  return (
    <Box component="span" className="attendance-duration-cell__normal" sx={{ color: 'text.primary' }}>
      {displayDuration}
    </Box>
  );
}

export default memo(AttendanceDurationCell);

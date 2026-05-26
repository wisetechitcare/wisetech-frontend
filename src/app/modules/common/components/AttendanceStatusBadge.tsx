/**
 * AttendanceStatusBadge — Unified filled pill badge for attendance / leave status values.
 *
 * Design System Compliance:
 * - Filled background (no outline)
 * - White text for better contrast
 * - Rounded pill shape (rounded-full)
 * - Consistent padding (py-1 px-3)
 * - Consistent font size (text-xs)
 * - Consistent font weight (font-semibold)
 *
 * Usage:
 *   const color = statusColors[status] ?? '#6c757d';
 *   return <AttendanceStatusBadge status={status} color={color} />;
 */

interface AttendanceStatusBadgeProps {
    /** The status label to display inside the badge. */
    status: string;
    /** Hex colour resolved by the caller (e.g. from Redux or a static map). */
    color: string;
}

const AttendanceStatusBadge = ({ status, color }: AttendanceStatusBadgeProps) => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            backgroundColor: color,
            color: '#ffffff',
            border: 'none',
            /* White ring separates the badge from a same-tinted row background */
            boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.15)',
            letterSpacing: '0.01em',
            textShadow: '0 1px 1px rgba(0,0,0,0.15)',
        }}
    >
        {status}
    </span>
);

export default AttendanceStatusBadge;

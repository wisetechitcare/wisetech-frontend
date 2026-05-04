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
            fontWeight: 600,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            backgroundColor: color,
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
    >
        {status}
    </span>
);

export default AttendanceStatusBadge;

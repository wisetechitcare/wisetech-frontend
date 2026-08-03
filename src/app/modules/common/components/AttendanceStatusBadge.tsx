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
        // Tailwind for everything static (CLAUDE.md bans inline style objects); only the
        // caller-resolved status colour stays inline, because it is a runtime hex from
        // configuration and cannot be expressed as a utility class.
        //
        // The label WRAPS rather than staying nowrap: a long status ("Check-out Missing")
        // in a narrow column previously overflowed the cell and was clipped mid-word.
        // `break-words` wraps at the space first, so it splits cleanly onto two lines, and
        // table rows use min-height so the row grows instead of the badge colliding with
        // its neighbours. `rounded-2xl` — a full pill radius bows out on two lines.
        className="inline-flex items-center justify-center text-center max-w-full py-1 px-3 rounded-2xl text-[12px] font-bold leading-[1.4] tracking-[0.01em] text-white border-0 whitespace-normal break-words shadow-[0_0_0_2px_rgba(255,255,255,0.9),0_2px_6px_rgba(0,0,0,0.15)] [text-shadow:0_1px_1px_rgba(0,0,0,0.15)]"
        style={{ backgroundColor: color }}
        title={status}
    >
        {status}
    </span>
);

export default AttendanceStatusBadge;

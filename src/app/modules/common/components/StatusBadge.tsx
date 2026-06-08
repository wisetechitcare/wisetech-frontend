/**
 * StatusBadge — Unified filled pill badge for ALL status values across the HRMS.
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
 *   <StatusBadge label="Present" color="#28a745" />
 *   <StatusBadge label="Unpaid Leaves" color="#95A5A6" />
 */

interface StatusBadgeProps {
    /** The text label to display inside the badge */
    label: string;
    /** Hex color for the badge background (e.g., "#28a745") */
    color: string;
    /** Optional className for additional styling */
    className?: string;
}

const StatusBadge = ({ label, color, className = '' }: StatusBadgeProps) => {
    return (
        <span
            className={`badge badge-pill ${className}`}
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
            {label}
        </span>
    );
};

export default StatusBadge;

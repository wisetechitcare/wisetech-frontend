/**
 * Status Color Utilities — Centralized color mapping for all status values.
 * 
 * Use these utilities to ensure consistent colors across the application.
 * 
 * Usage:
 *   import { getStatusColor, getStatusBackground } from '@utils/status-colors';
 *   
 *   const color = getStatusColor('Present');
 *   const bgColor = getStatusBackground('Present'); // Returns color with 15% opacity
 */

import { colors, getRowBackgroundColor } from '@app/modules/common/design-tokens';

/**
 * Standardized status color mapping
 */
export const statusColorMap: Record<string, string> = {
    // Attendance Status
    Present: colors.attendance.present,
    Absent: colors.attendance.absent,
    Weekend: colors.attendance.weekend,
    'Working Weekend': colors.attendance.workingWeekend,
    'Check-in Missing': colors.attendance.checkInMissing,
    'Check-out Missing': colors.attendance.checkOutMissing,
    'Raise Request': colors.attendance.raiseRequest,
    Holiday: colors.attendance.holiday,
    
    // Leave Types (Singular)
    'Annual Leave': colors.leaveTypes.annual,
    'Sick Leave': colors.leaveTypes.sick,
    'Casual Leave': colors.leaveTypes.casual,
    'Maternal Leave': colors.leaveTypes.maternal,
    'Floater Leave': colors.leaveTypes.floater,
    'Unpaid Leave': colors.leaveTypes.unpaid,
    'On Leave': colors.leaveTypes.onLeave,
    
    // Leave Types (Plural - DB format)
    'Annual Leaves': colors.leaveTypes.annual,
    'Sick Leaves': colors.leaveTypes.sick,
    'Casual Leaves': colors.leaveTypes.casual,
    'Maternal Leaves': colors.leaveTypes.maternal,
    'Floater Leaves': colors.leaveTypes.floater,
    'Unpaid Leaves': colors.leaveTypes.unpaid,
    
    // Work Types
    Office: colors.workType.office,
    'On Site': colors.workType.onSite,
    Remote: colors.workType.remote,
};

/**
 * Get color for a status value
 * 
 * @param status - The status string (e.g., 'Present', 'Unpaid Leaves')
 * @param customColors - Optional custom color overrides
 * @returns Hex color string
 * 
 * @example
 * const color = getStatusColor('Present'); // '#28a745'
 * const color = getStatusColor('Unpaid Leaves'); // '#95A5A6'
 */
export function getStatusColor(status: string, customColors?: Record<string, string>): string {
    // Check custom colors first
    if (customColors && customColors[status]) {
        return customColors[status];
    }
    
    // Direct match
    if (statusColorMap[status]) {
        return statusColorMap[status];
    }
    
    // Fuzzy matching for variations
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('present')) return colors.attendance.present;
    if (statusLower.includes('absent')) return colors.attendance.absent;
    if (statusLower.includes('weekend')) return colors.attendance.weekend;
    if (statusLower.includes('holiday')) return colors.attendance.holiday;
    if (statusLower.includes('annual')) return colors.leaveTypes.annual;
    if (statusLower.includes('sick')) return colors.leaveTypes.sick;
    if (statusLower.includes('casual')) return colors.leaveTypes.casual;
    if (statusLower.includes('maternal') || statusLower.includes('maternity')) return colors.leaveTypes.maternal;
    if (statusLower.includes('floater')) return colors.leaveTypes.floater;
    if (statusLower.includes('unpaid')) return colors.leaveTypes.unpaid;
    if (statusLower.includes('leave')) return colors.leaveTypes.onLeave;
    if (statusLower.includes('missing')) return colors.attendance.checkOutMissing;
    if (statusLower.includes('remote')) return colors.workType.remote;
    if (statusLower.includes('onsite') || statusLower.includes('on-site')) return colors.workType.onSite;
    if (statusLower.includes('office')) return colors.workType.office;
    
    // Default
    return colors.neutral.gray500;
}

/**
 * Get background color for table row based on status
 * Returns color with 15% opacity for subtle row tinting
 * 
 * @param status - The status string
 * @param opacity - Optional opacity value (default: 0.15)
 * @returns RGBA color string
 * 
 * @example
 * const bgColor = getStatusBackground('Present'); // 'rgba(40, 167, 69, 0.15)'
 * const bgColor = getStatusBackground('Absent', 0.2); // 'rgba(220, 53, 69, 0.2)'
 */
export function getStatusBackground(status: string, opacity: number = 0.15): string {
    const color = getStatusColor(status);
    return getRowBackgroundColor(color, opacity);
}

/**
 * Get complete status style object for badges
 * 
 * @param status - The status string
 * @returns Style object for inline styling
 * 
 * @example
 * const style = getStatusBadgeStyle('Present');
 * <span style={style}>Present</span>
 */
export function getStatusBadgeStyle(status: string, customColors?: Record<string, string>): React.CSSProperties {
    const color = getStatusColor(status, customColors);
    
    return {
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
    };
}

/**
 * Get text color based on background (for contrast)
 * Returns white for dark backgrounds, dark gray for light backgrounds
 * 
 * @param backgroundColor - Hex color string
 * @returns Hex color string for text
 */
export function getTextColorForBackground(backgroundColor: string): string {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, dark gray for light backgrounds
    return luminance < 0.5 ? '#ffffff' : '#334155';
}

export default {
    statusColorMap,
    getStatusColor,
    getStatusBackground,
    getStatusBadgeStyle,
    getTextColorForBackground,
};

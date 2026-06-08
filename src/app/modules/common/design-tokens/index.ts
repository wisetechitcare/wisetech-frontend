/**
 * Design Tokens — Centralized design system for HRMS application.
 * 
 * Follows industry standards from:
 * - Spine HRMS
 * - ERPNext
 * - Keka
 * 
 * Principles:
 * - 8px grid spacing system
 * - Consistent color palette
 * - Reusable components
 * - Consistent visual hierarchy
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
    // Status Colors
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    primary: '#007bff',
    secondary: '#6c757d',
    
    // Leave Type Colors (Standardized)
    leaveTypes: {
        annual: '#2ECC71',
        sick: '#E74C3C',
        casual: '#3498DB',
        maternal: '#9B59B6',
        floater: '#F39C12',
        unpaid: '#95A5A6',
        onLeave: '#FFC300',
    },
    
    // Attendance Status Colors
    attendance: {
        present: '#28a745',
        absent: '#dc3545',
        weekend: '#6c757d',
        workingWeekend: '#6610f2',
        checkInMissing: '#ffc107',
        checkOutMissing: '#ffc107',
        raiseRequest: '#6610f2',
        holiday: '#28a745',
    },
    
    // Work Type Colors
    workType: {
        office: '#3498db',
        onSite: '#e74c3c',
        remote: '#2ecc71',
    },
    
    // Neutral Colors
    neutral: {
        white: '#ffffff',
        gray50: '#f9fafb',
        gray100: '#f3f4f6',
        gray200: '#e5e7eb',
        gray300: '#d1d5db',
        gray400: '#9ca3af',
        gray500: '#6b7280',
        gray600: '#4b5563',
        gray700: '#374151',
        gray800: '#1f2937',
        gray900: '#111827',
    },
    
    // Background Colors
    background: {
        primary: '#ffffff',
        secondary: '#f8fafc',
        tertiary: '#f1f5f9',
        hover: '#f3f4f6',
    },
    
    // Border Colors
    border: {
        light: '#f1f5f9',
        medium: '#e2e8f0',
        dark: '#cbd5e1',
    },
    
    // Text Colors
    text: {
        primary: '#334155',
        secondary: '#64748b',
        muted: '#94a3b8',
        inverse: '#ffffff',
    },
};

// ============================================================================
// SPACING (8px Grid System)
// ============================================================================

export const spacing = {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
    fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
        xs: '11px',
        sm: '12px',
        base: '13px',
        lg: '14px',
        xl: '16px',
        '2xl': '18px',
        '3xl': '20px',
        '4xl': '24px',
    },
    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
    lineHeight: {
        tight: 1.25,
        normal: 1.4,
        relaxed: 1.5,
    },
};

// ============================================================================
// BADGE STYLES
// ============================================================================

export const badgeStyles = {
    // Unified badge style - Filled (NOT outline)
    filled: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        border: 'none',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    
    // Sizes
    sizes: {
        sm: {
            padding: '2px 8px',
            fontSize: '11px',
        },
        md: {
            padding: '4px 12px',
            fontSize: '12px',
        },
        lg: {
            padding: '6px 16px',
            fontSize: '14px',
        },
    },
};

// ============================================================================
// TABLE STYLES
// ============================================================================

export const tableStyles = {
    // Cell padding (consistent across all tables)
    cellPadding: {
        x: '16px',
        y: '12px',
    },
    
    // Row heights
    rowHeight: {
        compact: '40px',
        normal: '52px',
        comfortable: '64px',
    },
    
    // Column alignment
    alignment: {
        left: 'left',
        center: 'center',
        right: 'right',
    },
    
    // Header styles
    header: {
        backgroundColor: '#f8fafc',
        fontWeight: 700,
        fontSize: '12px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: '#64748b',
    },
    
    // Body styles
    body: {
        fontSize: '13px',
        color: '#334155',
    },
    
    // Border styles
    border: {
        color: '#e2e8f0',
        width: '1px',
    },
    
    // Row background (status-based)
    rowBackground: {
        opacity: 0.15, // 15% opacity for subtle tint
        hoverOpacity: 0.25,
    },
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
    none: '0px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
};

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
    fast: '0.1s ease-in-out',
    normal: '0.15s ease-in-out',
    slow: '0.3s ease-in-out',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status color from standardized palette
 */
export function getStatusColor(status: string, customColors?: Record<string, string>): string {
    const statusLower = status.toLowerCase();
    
    // Check custom colors first
    if (customColors && customColors[status]) {
        return customColors[status];
    }
    
    // Map status to color
    if (statusLower.includes('present')) return colors.success;
    if (statusLower.includes('absent')) return colors.danger;
    if (statusLower.includes('weekend')) return colors.secondary;
    if (statusLower.includes('holiday')) return colors.success;
    if (statusLower.includes('annual')) return colors.leaveTypes.annual;
    if (statusLower.includes('sick')) return colors.leaveTypes.sick;
    if (statusLower.includes('casual')) return colors.leaveTypes.casual;
    if (statusLower.includes('maternal') || statusLower.includes('maternity')) return colors.leaveTypes.maternal;
    if (statusLower.includes('floater')) return colors.leaveTypes.floater;
    if (statusLower.includes('unpaid')) return colors.leaveTypes.unpaid;
    if (statusLower.includes('leave')) return colors.leaveTypes.onLeave;
    if (statusLower.includes('missing')) return colors.warning;
    if (statusLower.includes('remote')) return colors.workType.remote;
    if (statusLower.includes('onsite') || statusLower.includes('on-site')) return colors.workType.onSite;
    if (statusLower.includes('office')) return colors.workType.office;
    
    // Default
    return colors.neutral.gray500;
}

/**
 * Get background color with opacity for table rows
 */
export function getRowBackgroundColor(color: string, opacity: number = 0.15): string {
    // Convert hex to rgba with opacity
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
    colors,
    spacing,
    typography,
    badgeStyles,
    tableStyles,
    borderRadius,
    shadows,
    transitions,
    getStatusColor,
    getRowBackgroundColor,
};

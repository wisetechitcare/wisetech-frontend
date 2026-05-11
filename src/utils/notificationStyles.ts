// Mirrors the ATTENDANCE_NOTIFICATION_TYPE constants from the backend.
export const ATTENDANCE_NOTIFICATION_TYPE = {
  EARLY_CHECKIN:    'attendance_early_checkin',
  CHECKIN_REMINDER: 'attendance_checkin_reminder',
  LATE_WARNING:     'attendance_late_warning',
  LATE_CONFIRMED:   'attendance_late_confirmed',
  SALARY_DEDUCTION: 'attendance_salary_deduction',
  CHECKOUT_REMINDER:'attendance_checkout_reminder',
  MISSING_CHECKOUT: 'attendance_missing_checkout',
} as const;

export type AttendanceNotificationType =
  (typeof ATTENDANCE_NOTIFICATION_TYPE)[keyof typeof ATTENDANCE_NOTIFICATION_TYPE];

// ── Per-type visual config ────────────────────────────────────────────────────

interface NotificationStyle {
  icon: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  label: string;
}

const STYLES: Record<string, NotificationStyle> = {
  [ATTENDANCE_NOTIFICATION_TYPE.EARLY_CHECKIN]: {
    icon: '🌟',
    borderColor: '#F5A623',
    bgColor:     '#FFFBF0',
    textColor:   '#7A5000',
    label:       'Early Check-In',
  },
  [ATTENDANCE_NOTIFICATION_TYPE.CHECKIN_REMINDER]: {
    icon: '⏰',
    borderColor: '#3B82F6',
    bgColor:     '#EFF6FF',
    textColor:   '#1D4ED8',
    label:       'Check-In Reminder',
  },
  [ATTENDANCE_NOTIFICATION_TYPE.LATE_WARNING]: {
    icon: '⚠️',
    borderColor: '#F97316',
    bgColor:     '#FFF7ED',
    textColor:   '#9A3412',
    label:       'Late Warning',
  },
  [ATTENDANCE_NOTIFICATION_TYPE.LATE_CONFIRMED]: {
    icon: '🔴',
    borderColor: '#EF4444',
    bgColor:     '#FEF2F2',
    textColor:   '#B91C1C',
    label:       'Late Check-In',
  },
  [ATTENDANCE_NOTIFICATION_TYPE.SALARY_DEDUCTION]: {
    icon: '⚠️',
    borderColor: '#DC2626',
    bgColor:     '#FEF2F2',
    textColor:   '#7F1D1D',
    label:       'Salary Deduction',
  },
  [ATTENDANCE_NOTIFICATION_TYPE.CHECKOUT_REMINDER]: {
    icon: '✅',
    borderColor: '#10B981',
    bgColor:     '#ECFDF5',
    textColor:   '#065F46',
    label:       'Checkout Reminder',
  },
  [ATTENDANCE_NOTIFICATION_TYPE.MISSING_CHECKOUT]: {
    icon: '🚨',
    borderColor: '#7C3AED',
    bgColor:     '#F5F3FF',
    textColor:   '#4C1D95',
    label:       'Missing Checkout',
  },
};

const DEFAULT_STYLE: NotificationStyle = {
  icon:        '🔔',
  borderColor: '#6B7280',
  bgColor:     '#F9FAFB',
  textColor:   '#374151',
  label:       'Notification',
};

function getStyle(status?: string | null): NotificationStyle {
  return (status && STYLES[status]) ? STYLES[status] : DEFAULT_STYLE;
}

export function getNotificationIcon(status?: string | null): string {
  return getStyle(status).icon;
}

export function getNotificationBorderColor(status?: string | null): string {
  return getStyle(status).borderColor;
}

export function getNotificationColors(status?: string | null): { bg: string; text: string } {
  const s = getStyle(status);
  return { bg: s.bgColor, text: s.textColor };
}

export function getNotificationLabel(status?: string | null): string {
  return getStyle(status).label;
}

import { api } from '@/lib/apiClient'
import { EMPLOYEE } from '@constants/api-endpoint'

export type ReminderChannel = 'inApp' | 'push' | 'sms' | 'whatsapp'

export type ReminderCategoryKey =
  | 'earlyCheckin'
  | 'checkinReminder'
  | 'lateWarning'
  | 'checkoutReminder'
  | 'missingCheckout'

export interface QuietHoursWindow {
  startMinutes: number
  endMinutes: number
}

export interface ProductEmailPrefs {
  managerLeaveDigest?: boolean
  birthdayGreetings?: boolean
}

export interface EmployeeNotificationPrefs {
  mutedUntil: string | null
  quietHours: QuietHoursWindow | null
  channels: Partial<Record<ReminderChannel, boolean>>
  categories: Partial<
    Record<ReminderCategoryKey, { enabled?: boolean; channels?: Partial<Record<ReminderChannel, boolean>> }>
  >
  product: ProductEmailPrefs
}

type PrefsResponse = { data?: { preferences?: EmployeeNotificationPrefs }; preferences?: EmployeeNotificationPrefs }

export async function fetchNotificationPreferences(): Promise<EmployeeNotificationPrefs> {
  const res = (await api.get(`/${EMPLOYEE.GET_NOTIFICATION_PREFERENCES}`)) as PrefsResponse
  return (res?.data?.preferences ?? res?.preferences ?? {}) as EmployeeNotificationPrefs
}

export async function saveNotificationPreferences(
  preferences: EmployeeNotificationPrefs,
): Promise<EmployeeNotificationPrefs> {
  const res = (await api.put(`/${EMPLOYEE.SET_NOTIFICATION_PREFERENCES}`, { preferences })) as PrefsResponse
  return (res?.data?.preferences ?? preferences) as EmployeeNotificationPrefs
}

export async function resetNotificationPreferences(): Promise<EmployeeNotificationPrefs> {
  const res = (await api.put(`/${EMPLOYEE.SET_NOTIFICATION_PREFERENCES}`, { clear: true })) as PrefsResponse
  return (res?.data?.preferences ?? {}) as EmployeeNotificationPrefs
}

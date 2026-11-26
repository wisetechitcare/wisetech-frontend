import { Building2, Landmark, ListPlus, Receipt, ScrollText, type LucideIcon } from "lucide-react"

import type { StatusTone } from "@/ds/lib/tone"
import {
  BuiltinSectionId,
  DeviceConnectionMode,
  DeviceHealth,
  ProfileFieldType,
  ProfileInputKind,
  SyncStatus,
  SyncTrigger,
  TimeFormat,
} from "@/storybook/screens/organization/types/organization"

export const STALE_AFTER_HOURS = 24

export const ALL_BRANCHES = "all"

export const HOURS_PER_DAY = { MIN: 1, MAX: 24 } as const
export const DAYS_PER_WEEK = { MIN: 1, MAX: 7 } as const

export const DEFAULT_COUNTRY_CODE = "IN"
export const DEFAULT_TIMEZONE = "Asia/Kolkata"
export const TIMEZONES = [DEFAULT_TIMEZONE, "Asia/Dubai", "Europe/London", "America/New_York"]

export const DEFAULT_DEVICE_PORT = "88"
export const DEFAULT_DEVICE_USERNAME = "essl"
export const MASKED_PASSWORD = "••••••"
export const MANUAL_SYNC_RECORDS = 14
export const BACKFILL_MODES: ReadonlyArray<DeviceConnectionMode> = [DeviceConnectionMode.PULL, DeviceConnectionMode.BOTH]

export const CONNECTION_MODES: ReadonlyArray<{ value: DeviceConnectionMode; label: string; description: string }> = [
  { value: DeviceConnectionMode.PUSH, label: "Push", description: "The device sends punches to the server. Best for cloud." },
  { value: DeviceConnectionMode.PULL, label: "Pull", description: "The server fetches logs from the device. Needs LAN access." },
  { value: DeviceConnectionMode.BOTH, label: "Push + Pull", description: "Push first; a periodic pull fills any missed punches." },
]

export const CONNECTION_MODE_LABEL: Record<DeviceConnectionMode, string> = {
  [DeviceConnectionMode.PUSH]: "Push",
  [DeviceConnectionMode.PULL]: "Pull",
  [DeviceConnectionMode.BOTH]: "Push + Pull",
}

export const DEVICE_HEALTH_META: Record<DeviceHealth, { label: string; variant: StatusTone }> = {
  [DeviceHealth.HEALTHY]: { label: "Healthy", variant: "success" },
  [DeviceHealth.STALE]: { label: "Not syncing", variant: "warning" },
  [DeviceHealth.FAILING]: { label: "Failing", variant: "danger" },
  [DeviceHealth.INACTIVE]: { label: "Inactive", variant: "neutral" },
}

export const DEVICE_HEALTH_ORDER = [DeviceHealth.FAILING, DeviceHealth.STALE, DeviceHealth.HEALTHY, DeviceHealth.INACTIVE]

export const SYNC_STATUS_META: Record<SyncStatus, { label: string; variant: StatusTone }> = {
  [SyncStatus.SUCCESS]: { label: "Success", variant: "success" },
  [SyncStatus.FAILED]: { label: "Failed", variant: "danger" },
  [SyncStatus.PARTIAL]: { label: "Partial", variant: "warning" },
}

export const SYNC_TRIGGER_LABEL: Record<SyncTrigger, string> = {
  [SyncTrigger.CRON]: "Scheduled",
  [SyncTrigger.MANUAL]: "Manual",
  [SyncTrigger.WEBHOOK]: "Device push",
}

export const TIME_FORMAT_OPTIONS: ReadonlyArray<{ value: TimeFormat; label: string }> = [
  { value: TimeFormat.ORGANIZATION_DEFAULT, label: "Organization default" },
  { value: TimeFormat.TWELVE_HOUR, label: "12-hour" },
  { value: TimeFormat.TWENTY_FOUR_HOUR, label: "24-hour" },
]

export const CUSTOM_FIELD_TYPES: ReadonlyArray<{ value: ProfileFieldType; label: string }> = [
  { value: ProfileFieldType.TEXT, label: "Text" },
  { value: ProfileFieldType.NUMBER, label: "Number" },
  { value: ProfileFieldType.DATE, label: "Date" },
  { value: ProfileFieldType.FILE, label: "Document" },
]

export const INPUT_KIND_LABEL: Record<ProfileInputKind, string> = {
  [ProfileInputKind.TEXT]: "Text",
  [ProfileInputKind.LONG_TEXT]: "Long text",
  [ProfileInputKind.NUMBER]: "Number",
  [ProfileInputKind.PHONE]: "Phone",
  [ProfileInputKind.EMAIL]: "Email",
  [ProfileInputKind.URL]: "Website",
  [ProfileInputKind.SELECT]: "Choice",
  [ProfileInputKind.MULTI_SELECT]: "Multiple choice",
  [ProfileInputKind.TOGGLE]: "Yes / No",
  [ProfileInputKind.DATE]: "Date range",
  [ProfileInputKind.FILE]: "Document",
  [ProfileInputKind.COORDINATE]: "Coordinate",
  [ProfileInputKind.REFERENCE_LIST]: "List",
}

export const BUILTIN_SECTION_ICON: Record<BuiltinSectionId, LucideIcon> = {
  [BuiltinSectionId.BASIC_INFO]: Building2,
  [BuiltinSectionId.GOVT]: ScrollText,
  [BuiltinSectionId.TAX]: Receipt,
  [BuiltinSectionId.BANK]: Landmark,
}

export const CUSTOM_SECTION_ICON: LucideIcon = ListPlus

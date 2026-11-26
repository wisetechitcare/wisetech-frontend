import type { PersonOption } from "@/ds/patterns/person-picker"
import type { IFormField, IFormSection } from "@/models/company"
import type { IBiometricDevice, IBiometricSyncLog } from "@/models/biometric"
import { DEFAULT_COUNTRY_CODE, DEFAULT_DEVICE_PORT, DEFAULT_DEVICE_USERNAME, DEFAULT_TIMEZONE, MASKED_PASSWORD } from "@/storybook/screens/organization/constants/organization"
import {
  BuiltinFieldId as FieldId,
  BuiltinSectionId,
  DeviceConnectionMode,
  ProfileFieldType,
  ProfileInputKind,
  SyncStatus,
  SyncTrigger,
  TimeFormat,
  type Branch,
  type Country,
  type Organization,
  type Town,
} from "@/storybook/screens/organization/types/organization"

/** Demo data for the Organization Profile prototype only — fictional organizations and people, no tenant data. */
export const FIXTURE_NOW = new Date("2026-11-18T10:00:00+05:30")

export const ORG_IDS = {
  GROUP: "org-meridian",
  ASSOCIATES: "org-associates",
  MEP: "org-mep",
  NORTHFIELD: "org-northfield",
} as const

const CUSTOM_FIELD_IDS = {
  MSME: "custom-msme",
  POLICY: "custom-policy",
  RENEWAL: "custom-renewal",
  INSURANCE_SECTION: "custom-insurance",
} as const

const builtin = (id: FieldId, label: string, extra: Partial<IFormField> = {}): IFormField => ({
  id,
  label,
  type: ProfileFieldType.TEXT,
  required: false,
  isSystem: true,
  ...extra,
})

const BUILTIN_SECTIONS: IFormSection[] = [
  {
    id: BuiltinSectionId.BASIC_INFO,
    title: "Basic information",
    isSystem: true,
    fields: [
      builtin(FieldId.NAME, "Organization name", { required: true, essential: true }),
      builtin(FieldId.FISCAL_YEAR, "Fiscal year", { type: ProfileFieldType.DATE, required: true, essential: true, fixedType: true, inputKind: ProfileInputKind.DATE }),
      builtin(FieldId.CONTACT_NUMBER, "Contact number", { fixedType: true, inputKind: ProfileInputKind.PHONE }),
      builtin(FieldId.WEBSITE_URL, "Website", { fixedType: true, inputKind: ProfileInputKind.URL }),
      builtin(FieldId.SUPER_ADMIN_EMAIL, "Super admin email", { required: true, fixedType: true, inputKind: ProfileInputKind.EMAIL }),
      builtin(FieldId.BUSINESS_TYPE, "Business type"),
      builtin(FieldId.FOUNDER, "Founder"),
      builtin(FieldId.FOUNDED_IN, "Founded in", { type: ProfileFieldType.NUMBER }),
    ],
  },
  {
    id: BuiltinSectionId.GOVT,
    title: "Registered address & statutory",
    isSystem: true,
    fields: [
      builtin(FieldId.ADDRESS, "Registered address", { required: true, fixedType: true, inputKind: ProfileInputKind.LONG_TEXT }),
      builtin(FieldId.ADDITIONAL_PLACES_OF_BUSINESS, "Additional places of business", { fixedType: true, inputKind: ProfileInputKind.LONG_TEXT }),
      builtin(FieldId.GST_NUMBER, "GST number", { required: true }),
      builtin(FieldId.CERTIFICATE_OF_INCORPORATION, "Certificate of incorporation", { type: ProfileFieldType.FILE }),
    ],
  },
  {
    id: BuiltinSectionId.TAX,
    title: "Tax details",
    isSystem: true,
    fields: [
      builtin(FieldId.PAN_NO, "PAN", { required: true }),
      builtin(FieldId.TAN_NO, "TAN"),
      builtin(FieldId.PTEC_CERTIFICATE, "PTEC certificate", { type: ProfileFieldType.FILE }),
      builtin(FieldId.HSN_SAC_NO, "HSN / SAC code"),
    ],
  },
  {
    id: BuiltinSectionId.BANK,
    title: "Bank details",
    isSystem: true,
    fields: [
      builtin(FieldId.BENEFICIARY_NAME, "Beneficiary name"),
      builtin(FieldId.BANK_NAME_AND_ADDRESS, "Bank name and address", { fixedType: true, inputKind: ProfileInputKind.LONG_TEXT }),
      builtin(FieldId.IFSC_CODE, "IFSC code"),
      builtin(FieldId.ACCOUNT_NO, "Account number"),
      builtin(FieldId.MICR_CODE, "MICR code"),
      builtin(FieldId.CONTACT_PERSON, "Contact person"),
      builtin(FieldId.ACCOUNTANT_NO, "Accountant phone", { fixedType: true, inputKind: ProfileInputKind.PHONE }),
    ],
  },
]

export const defaultSections = (): IFormSection[] => structuredClone(BUILTIN_SECTIONS)

function withCustomFields(): IFormSection[] {
  const sections = defaultSections()
  sections
    .find((s) => s.id === BuiltinSectionId.TAX)
    ?.fields.push({ id: CUSTOM_FIELD_IDS.MSME, label: "MSME registration", type: ProfileFieldType.TEXT, required: false, isSystem: false })
  sections.push({
    id: CUSTOM_FIELD_IDS.INSURANCE_SECTION,
    title: "Insurance",
    isSystem: false,
    fields: [
      { id: CUSTOM_FIELD_IDS.POLICY, label: "Group policy number", type: ProfileFieldType.TEXT, required: false, isSystem: false },
      { id: CUSTOM_FIELD_IDS.RENEWAL, label: "Renewal date", type: ProfileFieldType.DATE, required: false, isSystem: false },
    ],
  })
  return sections
}

export const ORGANIZATIONS: Organization[] = [
  {
    id: ORG_IDS.GROUP,
    name: "Meridian Group",
    parentId: null,
    fiscalYear: { start: "2025-04-01", end: "2026-03-31" },
    workingHoursPerDay: 8,
    workingDaysPerWeek: 5,
    values: { [FieldId.BUSINESS_TYPE]: "Holding company", [FieldId.FOUNDER]: "Ravi Menon" },
    sections: defaultSections(),
  },
  {
    id: ORG_IDS.ASSOCIATES,
    name: "Meridian Associates",
    parentId: ORG_IDS.GROUP,
    fiscalYear: { start: "2026-04-01", end: "2027-03-31" },
    workingHoursPerDay: 9,
    workingDaysPerWeek: 6,
    values: {
      [FieldId.CONTACT_NUMBER]: "+91 98200 11223",
      [FieldId.SUPER_ADMIN_EMAIL]: "admin@meridian-associates.example",
      [FieldId.BUSINESS_TYPE]: "Architecture consultancy",
      [FieldId.ADDRESS]: "4th Floor, Lake View Plaza, Andheri East, Mumbai 400069",
      [FieldId.GST_NUMBER]: "27AABCM1234F1Z5",
      [FieldId.PAN_NO]: "AABCM1234F",
    },
    sections: defaultSections(),
  },
  {
    id: ORG_IDS.MEP,
    name: "Meridian MEP Consultants Pvt. Ltd.",
    parentId: ORG_IDS.GROUP,
    fiscalYear: { start: "2026-04-01", end: "2027-03-31" },
    workingHoursPerDay: 8,
    workingDaysPerWeek: 5,
    values: {
      [FieldId.CONTACT_NUMBER]: "+91 98330 44556",
      [FieldId.WEBSITE_URL]: "https://meridian-mep.example",
      [FieldId.SUPER_ADMIN_EMAIL]: "it@meridian-mep.example",
      [FieldId.BUSINESS_TYPE]: "MEP design & consulting",
      [FieldId.FOUNDER]: "Anita Desai",
      [FieldId.FOUNDED_IN]: "2014",
      [FieldId.ADDRESS]: "Unit 12, Sector 17, Vashi, Navi Mumbai 400703",
      [FieldId.GST_NUMBER]: "27AADCM5678K1Z2",
      [FieldId.PAN_NO]: "AADCM5678K",
      [FieldId.TAN_NO]: "MUMM12345B",
      [FieldId.HSN_SAC_NO]: "998331",
      [FieldId.BENEFICIARY_NAME]: "Meridian MEP Consultants Pvt. Ltd.",
      [FieldId.BANK_NAME_AND_ADDRESS]: "Example Bank, Vashi Branch, Navi Mumbai",
      [FieldId.IFSC_CODE]: "EXMB0001234",
      [FieldId.ACCOUNT_NO]: "50200012345678",
      [FieldId.MICR_CODE]: "400240015",
      [FieldId.CONTACT_PERSON]: "Sunil Patil",
      [CUSTOM_FIELD_IDS.MSME]: "UDYAM-MH-33-0012345",
      [CUSTOM_FIELD_IDS.POLICY]: "GHI-2026-88412",
    },
    sections: withCustomFields(),
  },
  {
    id: ORG_IDS.NORTHFIELD,
    name: "Northfield Engineers Pvt. Ltd.",
    parentId: null,
    fiscalYear: { start: "2026-04-01", end: "2027-03-31" },
    workingHoursPerDay: 8,
    workingDaysPerWeek: 6,
    values: {
      [FieldId.CONTACT_NUMBER]: "+91 81690 49025",
      [FieldId.BUSINESS_TYPE]: "Engineering contractor",
      [FieldId.ADDRESS]: "Plot 7, Phase 2, Hinjewadi, Pune 411057",
      [FieldId.GST_NUMBER]: "27AAFCN4321P1Z9",
      [FieldId.PAN_NO]: "AAFCN4321P",
    },
    sections: defaultSections(),
  },
]

const branch = (b: Omit<Branch, "isActive" | "timeFormat" | "timezone" | "country"> & Partial<Branch>): Branch => ({
  isActive: true,
  timeFormat: TimeFormat.ORGANIZATION_DEFAULT,
  timezone: DEFAULT_TIMEZONE,
  country: DEFAULT_COUNTRY_CODE,
  ...b,
})

export const BRANCHES: Branch[] = [
  branch({ id: "br-andheri", name: "Andheri Studio", companyId: ORG_IDS.ASSOCIATES, employeeCount: 8, state: "Maharashtra", city: "Mumbai", town: "Andheri", postalCode: "400069", address: "4th Floor, Lake View Plaza, Andheri East", latitude: 19.1136, longitude: 72.8697 }),
  branch({ id: "br-assoc-vashi", name: "Vashi Studio", companyId: ORG_IDS.ASSOCIATES, employeeCount: 4, state: "Maharashtra", city: "Navi Mumbai", town: "Vashi", postalCode: "400703", address: "Shop 3, Palm Beach Road, Sector 17", latitude: 19.0771, longitude: 72.9986 }),
  branch({ id: "br-mep-vashi", name: "Vashi Office", companyId: ORG_IDS.MEP, employeeCount: 3, state: "Maharashtra", city: "Navi Mumbai", town: "Vashi", postalCode: "400703", address: "Unit 12, Sector 17", latitude: 19.0759, longitude: 72.9977 }),
  branch({ id: "br-jogeshwari", name: "Jogeshwari Head Office", companyId: ORG_IDS.MEP, employeeCount: 20, state: "Maharashtra", city: "Mumbai", town: "Jogeshwari", postalCode: "400060", address: "2nd Floor, Western Express Highway, Jogeshwari East", latitude: 19.1351, longitude: 72.8563 }),
  branch({ id: "br-pune", name: "Pune Works", companyId: ORG_IDS.NORTHFIELD, employeeCount: 6, state: "Maharashtra", city: "Pune", town: "Hinjewadi", postalCode: "411057", address: "Plot 7, Phase 2", latitude: 18.5913, longitude: 73.7389, timeFormat: TimeFormat.TWENTY_FOUR_HOUR }),
  branch({ id: "br-dubai", name: "Dubai Site Office", companyId: ORG_IDS.NORTHFIELD, employeeCount: 2, country: "AE", state: "Dubai", city: "Dubai", town: "Deira", postalCode: "00000", address: "Office 804, Al Maktoum Road", latitude: 25.2654, longitude: 55.3246, timezone: "Asia/Dubai" }),
]

const device = (d: Partial<IBiometricDevice> & Pick<IBiometricDevice, "id" | "branchId" | "name" | "serialNumber">): IBiometricDevice => ({
  deviceIp: "192.168.1.201",
  devicePort: DEFAULT_DEVICE_PORT,
  sourceDeviceName: null,
  username: DEFAULT_DEVICE_USERNAME,
  password: MASKED_PASSWORD,
  isActive: true,
  connectionMode: DeviceConnectionMode.PUSH,
  consecutiveFailures: 0,
  lastSyncedAt: null,
  lastSyncStatus: null,
  lastPushAt: null,
  lastPullAt: null,
  createdAt: "2026-01-10T09:00:00+05:30",
  ...d,
})

export const DEVICES: IBiometricDevice[] = [
  device({ id: "dev-main", branchId: "br-jogeshwari", name: "Main Entrance", serialNumber: "QJT3252900352", lastSyncedAt: "2026-10-20T09:12:00+05:30", lastSyncStatus: SyncStatus.SUCCESS, lastPushAt: "2026-10-20T09:12:00+05:30" }),
  device({ id: "dev-reception", branchId: "br-andheri", name: "Reception", serialNumber: "QJT3252900417", deviceIp: "192.168.0.50", connectionMode: DeviceConnectionMode.BOTH, lastSyncedAt: "2026-11-18T09:40:00+05:30", lastSyncStatus: SyncStatus.SUCCESS, lastPushAt: "2026-11-18T09:40:00+05:30", lastPullAt: "2026-11-18T06:00:00+05:30" }),
  device({ id: "dev-gate", branchId: "br-pune", name: "Site Gate", serialNumber: "QJT3252900588", deviceIp: "10.0.4.12", connectionMode: DeviceConnectionMode.PULL, consecutiveFailures: 3, lastSyncedAt: "2026-11-17T22:00:00+05:30", lastSyncStatus: SyncStatus.FAILED, lastPullAt: "2026-11-17T22:00:00+05:30" }),
  device({ id: "dev-backoffice", branchId: "br-mep-vashi", name: "Back Office", serialNumber: "QJT3252900611", isActive: false, lastSyncedAt: "2026-08-02T18:30:00+05:30", lastSyncStatus: SyncStatus.SUCCESS }),
]

export const SYNC_LOGS: IBiometricSyncLog[] = [
  { id: "log-1", deviceId: "dev-main", triggeredBy: SyncTrigger.WEBHOOK, startedAt: "2026-10-20T09:12:00+05:30", completedAt: "2026-10-20T09:12:04+05:30", recordCount: 46, status: SyncStatus.SUCCESS, errorMessage: null },
  { id: "log-2", deviceId: "dev-main", triggeredBy: SyncTrigger.CRON, startedAt: "2026-10-19T23:00:00+05:30", completedAt: "2026-10-19T23:00:09+05:30", recordCount: 12, status: SyncStatus.PARTIAL, errorMessage: "2 punches had no matching employee code." },
  { id: "log-3", deviceId: "dev-gate", triggeredBy: SyncTrigger.CRON, startedAt: "2026-11-17T22:00:00+05:30", completedAt: "2026-11-17T22:00:30+05:30", recordCount: null, status: SyncStatus.FAILED, errorMessage: "Device did not respond on 10.0.4.12:88." },
  { id: "log-4", deviceId: "dev-gate", triggeredBy: SyncTrigger.MANUAL, startedAt: "2026-11-15T11:20:00+05:30", completedAt: "2026-11-15T11:20:06+05:30", recordCount: 31, status: SyncStatus.SUCCESS, errorMessage: null },
  { id: "log-5", deviceId: "dev-reception", triggeredBy: SyncTrigger.WEBHOOK, startedAt: "2026-11-18T09:40:00+05:30", completedAt: "2026-11-18T09:40:02+05:30", recordCount: 8, status: SyncStatus.SUCCESS, errorMessage: null },
]

export const COUNTRIES: Country[] = [
  { code: DEFAULT_COUNTRY_CODE, name: "India", currency: "INR", states: ["Delhi", "Gujarat", "Karnataka", "Maharashtra"] },
  { code: "AE", name: "United Arab Emirates", currency: "AED", states: ["Abu Dhabi", "Dubai", "Sharjah"] },
]

export const TOWNS: Town[] = ["Andheri", "Deira", "Hinjewadi", "Jogeshwari", "Vashi", "Whitefield"].map((name) => ({
  id: `town-${name.toLowerCase()}`,
  name,
}))

const FIRST_NAMES = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Sana", "Ishaan", "Kavya", "Vikram", "Tara"]
const LAST_NAMES = ["Sharma", "Nair", "Rao", "Joshi", "Mehta", "Khan", "Iyer", "Kapoor"]
const DESIGNATIONS = ["MEP Engineer", "Site Supervisor", "Draughtsman", "Accountant", "HR Executive", "Project Manager"]

export function employeesOf(target: Branch): PersonOption[] {
  const offset = target.id.length
  return Array.from({ length: target.employeeCount }, (_, i) => ({
    id: `${target.id}-e${i}`,
    name: `${FIRST_NAMES[(i + offset) % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3 + offset) % LAST_NAMES.length]}`,
    code: `E-${String(1000 + offset * 40 + i)}`,
    subtitle: DESIGNATIONS[(i + offset) % DESIGNATIONS.length],
  }))
}

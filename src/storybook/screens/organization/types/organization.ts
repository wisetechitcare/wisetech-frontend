import type { IFormSection, IOrgBranchNode, IOrgNode } from "@/models/company"
import type { IBiometricDevice, IBiometricSyncLog } from "@/models/biometric"

export enum OrgDetailTab {
  OVERVIEW = "overview",
  BRANCHES = "branches",
  DEVICES = "devices",
  FIELDS = "fields",
}

export enum OrgListTab {
  HIERARCHY = "hierarchy",
  TOWNS = "towns",
}

export enum OrgKind {
  GROUP = "Group",
  SUB_ORGANIZATION = "Sub-organization",
  ORGANIZATION = "Organization",
}

export enum OrgTreeRowType {
  ORGANIZATION = "organization",
  BRANCH = "branch",
}

export enum DeviceHealth {
  HEALTHY = "healthy",
  STALE = "stale",
  FAILING = "failing",
  INACTIVE = "inactive",
}

export enum DeviceConnectionMode {
  PUSH = "PUSH",
  PULL = "PULL",
  BOTH = "BOTH",
}

export enum SyncStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  PARTIAL = "PARTIAL",
}

export enum SyncTrigger {
  CRON = "CRON",
  MANUAL = "MANUAL",
  WEBHOOK = "WEBHOOK",
}

export enum DeviceTableColumn {
  BRANCH = "branch",
  ADDRESS = "address",
  HEALTH = "health",
  ACTIONS = "actions",
}

export enum TimeFormat {
  ORGANIZATION_DEFAULT = "default",
  TWELVE_HOUR = "12h",
  TWENTY_FOUR_HOUR = "24h",
}

export enum ProfileFieldType {
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  FILE = "file",
}

export enum ProfileInputKind {
  TEXT = "text",
  LONG_TEXT = "longText",
  NUMBER = "number",
  PHONE = "phone",
  EMAIL = "email",
  URL = "url",
  SELECT = "select",
  MULTI_SELECT = "multiSelect",
  TOGGLE = "toggle",
  DATE = "date",
  FILE = "file",
  COORDINATE = "coordinate",
  REFERENCE_LIST = "referenceList",
}

export enum BuiltinSectionId {
  BASIC_INFO = "basic_info",
  GOVT = "govt",
  TAX = "tax",
  BANK = "bank",
}

export enum BuiltinFieldId {
  NAME = "name",
  FISCAL_YEAR = "fiscalYear",
  CONTACT_NUMBER = "contactNumber",
  WEBSITE_URL = "websiteUrl",
  SUPER_ADMIN_EMAIL = "superAdminEmail",
  BUSINESS_TYPE = "businessType",
  FOUNDER = "founder",
  FOUNDED_IN = "foundedIn",
  ADDRESS = "address",
  ADDITIONAL_PLACES_OF_BUSINESS = "additionalplacesofbusiness",
  GST_NUMBER = "gstNumber",
  CERTIFICATE_OF_INCORPORATION = "certificateOfIncorporation",
  PAN_NO = "panNo",
  TAN_NO = "tanNo",
  PTEC_CERTIFICATE = "ptecCertificate",
  HSN_SAC_NO = "hsnSacNo",
  BENEFICIARY_NAME = "beneficiaryName",
  BANK_NAME_AND_ADDRESS = "bankNameAndAddress",
  IFSC_CODE = "ifscCode",
  ACCOUNT_NO = "accountNo",
  MICR_CODE = "micrCode",
  CONTACT_PERSON = "contactPerson",
  ACCOUNTANT_NO = "accountantNo",
}

export interface FiscalYear {
  start: string
  end: string
}

export interface Organization {
  id: string
  name: string
  parentId: string | null
  logo?: string
  salaryStamp?: string
  fiscalYear: FiscalYear
  workingHoursPerDay: number
  workingDaysPerWeek: number
  values: Record<string, string>
  sections: IFormSection[]
}

export interface Branch extends IOrgBranchNode {
  isActive: boolean
  country: string
  state: string
  city: string
  town: string
  postalCode: string
  timezone: string
  timeFormat: TimeFormat
}

export interface Country {
  code: string
  name: string
  currency: string
  states: string[]
}

export interface Town {
  id: string
  name: string
}

/** An organization and everything under it: its sub-organizations, their branches and devices. */
export interface OrgScope {
  orgIds: string[]
  branches: Branch[]
  devices: IBiometricDevice[]
}

export type OrgTreeRow =
  | { type: OrgTreeRowType.ORGANIZATION; node: IOrgNode; depth: number; expandable: boolean }
  | { type: OrgTreeRowType.BRANCH; branch: IOrgBranchNode; depth: number }

export interface OrganizationData {
  orgs: Organization[]
  branches: Branch[]
  devices: IBiometricDevice[]
  syncLogs: IBiometricSyncLog[]
  towns: Town[]
}

export interface OrganizationStore extends OrganizationData {
  now: Date
  saveOrg: (org: Organization) => void
  deleteOrg: (id: string) => void
  saveSections: (orgId: string, sections: IFormSection[]) => void
  saveBranch: (branch: Branch) => void
  deleteBranch: (id: string) => void
  promoteBranch: (id: string) => Organization | undefined
  saveDevice: (device: IBiometricDevice) => void
  deleteDevice: (id: string) => void
  toggleDevice: (id: string) => void
  syncDevice: (id: string) => void
  addTown: (name: string) => Town
  renameTown: (id: string, name: string) => void
  deleteTown: (id: string) => void
}

export type MemberType = 'CONTACT' | 'EMPLOYEE';

export type GroupStatus = 'ACTIVE' | 'ARCHIVED';

export type DriveStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type DeliveryStatus = 'PENDING' | 'OUT' | 'DELIVERED' | 'SKIPPED';

export type DeliveryMode = 'IN_PERSON' | 'COURIER';

export type SkippedReason = 'REFUSED' | 'NOT_AVAILABLE' | 'DO_NOT_GIFT' | '';

/** User-facing name for a Drive (= one gift distribution run). */
export const GIFT_RUN_LABEL = 'Gift Run';
export const GIFT_RUN_LABEL_PLURAL = 'Gift Runs';

export interface PersonRef {
  memberType: MemberType;
  personId: string;
  fullName: string;
  companyName?: string;
  area?: string;
  address?: string;
  phone?: string;
  email?: string;
  doNotGift?: boolean;
}

export interface PeopleGroup {
  id: string;
  name: string;
  notes?: string;
  status: GroupStatus;
  members: PersonRef[];
  createdAt: string;
  updatedAt: string;
}

export interface CourtesyRecipient {
  id: string;
  memberType: MemberType;
  personId: string;
  fullName: string;
  companyName?: string;
  area?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: DeliveryStatus;
  mode: DeliveryMode;
  /** Gift / kit count for this person — editable on the Gift Run table. */
  quantity: number;
  assigneeEmployeeId?: string;
  assigneeName?: string;
  remark?: string;
  skippedReason?: SkippedReason;
  updatedAt: string;
}

export interface CourtesyDrive {
  id: string;
  title: string;
  /** Occasion config id (see CourtesyConfig.occasions). */
  occasionType: string;
  giftItem: string;
  driveDate?: string;
  sourceGroupId: string;
  sourceGroupName: string;
  status: DriveStatus;
  /** Drive-level defaults — apply to all, or leave empty when mixed. */
  defaultAssigneeEmployeeId?: string;
  defaultAssigneeName?: string;
  defaultMode?: DeliveryMode | 'MIXED';
  recipients: CourtesyRecipient[];
  createdAt: string;
  updatedAt: string;
}

export interface ConfigOption {
  id: string;
  name: string;
  color: string;
}

export interface CourtesyConfig {
  occasions: ConfigOption[];
  /** Colors keyed by DeliveryStatus. */
  statusColors: Record<DeliveryStatus, string>;
}

export interface CourtesyDeskState {
  groups: PeopleGroup[];
  drives: CourtesyDrive[];
  config: CourtesyConfig;
  version: number;
}

export const DEFAULT_STATUS_COLORS: Record<DeliveryStatus, string> = {
  PENDING: '#d97706',
  OUT: '#2563eb',
  DELIVERED: '#16a34a',
  SKIPPED: '#64748b',
};

export const DEFAULT_OCCASIONS: ConfigOption[] = [
  { id: 'DIWALI', name: 'Diwali', color: '#ea580c' },
  { id: 'RAMZAN', name: 'Ramzan', color: '#0d9488' },
  { id: 'WELCOME_KIT', name: 'Welcome Kit', color: '#7c3aed' },
  { id: 'CLIENT_GIFT', name: 'Client Gift', color: '#2563eb' },
];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: 'Pending',
  OUT: 'Out',
  DELIVERED: 'Delivered',
  SKIPPED: 'Skipped',
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  IN_PERSON: 'In Person',
  COURIER: 'Courier',
};

export const DRIVE_STATUS_LABELS: Record<DriveStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export function occasionLabel(config: CourtesyConfig, occasionId: string) {
  return config.occasions.find((o) => o.id === occasionId)?.name || occasionId;
}

export function occasionColor(config: CourtesyConfig, occasionId: string) {
  return config.occasions.find((o) => o.id === occasionId)?.color || '#64748b';
}

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
  avatarUrl?: string;
  /** Default gift count when copied into a Gift Run. */
  giftQuantity?: number;
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
  avatarUrl?: string;
  status: string;
  mode: DeliveryMode;
  /** Gift / kit count per person. */
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
  status: string;
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
  /** Handover statuses on Gift Run recipient lists (editable in Configure). */
  deliveryStatuses: ConfigOption[];
  /** Gift Run lifecycle statuses (editable in Configure). */
  giftRunStatuses: ConfigOption[];
  /** Delivery mode options per recipient (editable in Configure). */
  deliveryModes: ConfigOption[];
  /** @deprecated migrated to deliveryStatuses — kept for localStorage normalize only */
  statusColors?: Record<string, string>;
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

export const DEFAULT_DELIVERY_STATUSES: ConfigOption[] = (
  Object.keys(DELIVERY_STATUS_LABELS) as DeliveryStatus[]
).map((id) => ({
  id,
  name: DELIVERY_STATUS_LABELS[id],
  color: DEFAULT_STATUS_COLORS[id],
}));

export function deliveryStatusLabel(config: CourtesyConfig, statusId: string) {
  return config.deliveryStatuses.find((s) => s.id === statusId)?.name || statusId;
}

export function deliveryStatusColor(config: CourtesyConfig, statusId: string) {
  return config.deliveryStatuses.find((s) => s.id === statusId)?.color || '#64748b';
}

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

export const DEFAULT_DELIVERY_MODES: ConfigOption[] = (
  Object.keys(DELIVERY_MODE_LABELS) as DeliveryMode[]
).map((id) => ({
  id,
  name: DELIVERY_MODE_LABELS[id],
  color: id === 'COURIER' ? '#2563eb' : '#0d9488',
}));

export const DEFAULT_GIFT_RUN_STATUSES: ConfigOption[] = (
  Object.keys(DRIVE_STATUS_LABELS) as DriveStatus[]
).map((id) => ({
  id,
  name: DRIVE_STATUS_LABELS[id],
  color:
    id === 'COMPLETED'
      ? '#16a34a'
      : id === 'IN_PROGRESS'
        ? '#2563eb'
        : id === 'ARCHIVED'
          ? '#64748b'
          : '#d97706',
}));

export function giftRunStatusLabel(config: CourtesyConfig, statusId: string) {
  return config.giftRunStatuses.find((s) => s.id === statusId)?.name || statusId;
}

export function giftRunStatusColor(config: CourtesyConfig, statusId: string) {
  return config.giftRunStatuses.find((s) => s.id === statusId)?.color || '#64748b';
}

export function deliveryModeLabel(config: CourtesyConfig, modeId: string) {
  return config.deliveryModes.find((m) => m.id === modeId)?.name || modeId;
}

export function deliveryModeColor(config: CourtesyConfig, modeId: string) {
  return config.deliveryModes.find((m) => m.id === modeId)?.color || '#64748b';
}

export function occasionLabel(config: CourtesyConfig, occasionId: string) {
  return config.occasions.find((o) => o.id === occasionId)?.name || occasionId;
}

export function occasionColor(config: CourtesyConfig, occasionId: string) {
  return config.occasions.find((o) => o.id === occasionId)?.color || '#64748b';
}

export type MemberType = 'CONTACT' | 'EMPLOYEE';

export type GroupStatus = 'ACTIVE' | 'ARCHIVED';

export type DriveStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type DeliveryStatus = 'PENDING' | 'DELIVERED' | 'SKIPPED';

export type DeliveryMode = 'IN_PERSON' | 'COURIER';

/** GROUP = from linked People Group; DRIVE_ONLY = added on this Gift Run after creation. */
export type RecipientRosterSource = 'GROUP' | 'DRIVE_ONLY';

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

/** WhatsApp-style system line on a People Group. */
export type GroupActivityType =
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_MEMBER_ADDED'
  | 'GROUP_MEMBER_REMOVED'
  | 'GROUP_MEMBER_UPDATED'
  | 'GROUP_ARCHIVED'
  | 'GROUP_UNARCHIVED'
  | 'DRIVE_STARTED'
  | 'DRIVE_UPDATED'
  | 'DRIVE_STATUS_CHANGED'
  | 'RECIPIENT_ADDED'
  | 'RECIPIENT_REMOVED'
  | 'RECIPIENT_UPDATED'
  | 'RECIPIENT_DEFAULTS_APPLIED';

export interface GroupActivity {
  id: string;
  type: GroupActivityType;
  message: string;
  actorId?: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  runId?: string | null;
  createdAt: string;
}

export interface GroupActivityPage {
  activity: GroupActivity[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
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
  /** YYYY-MM-DD the gift was handed over; the API fills today when marked Delivered. */
  deliveredOn?: string | null;
  rosterSource?: RecipientRosterSource;
  updatedAt: string;
}

export interface CourtesyDrive {
  id: string;
  title: string;
  /** Occasion config id (see CourtesyConfig.occasions). */
  occasionType: string;
  giftItem: string;
  driveDate?: string;
  /** Primary People Group (first selected). */
  sourceGroupId: string;
  /** Names of every linked group, e.g. "IT Team, WiseTech Group". */
  sourceGroupName: string;
  /** Every linked People Group, primary first. */
  groupIds?: string[];
  status: string;
  /** Unit cost of one gift; total = costPerGift × sum(quantities). */
  costPerGift?: number | null;
  /** What ONE gift contains, as a decimal string ("250"). Always "1" for countable units. */
  sizePerGift?: string;
  /** Unit config id (see CourtesyConfig.units). */
  sizeUnit?: string;
  /** Configured symbol, shown verbatim ("kg", "Box", "Office Kit"). */
  sizeUnitSymbol?: string;
  sizeUnitCountable?: boolean;
  /** Drive-level defaults — apply to all, or leave empty when mixed. */
  defaultAssigneeEmployeeId?: string;
  defaultAssigneeName?: string;
  defaultMode?: DeliveryMode | 'MIXED';
  recipients: CourtesyRecipient[];
  createdAt: string;
  updatedAt: string;
}

/** A run's People Groups, primary first (older payloads: just the primary). */
export const driveGroupIds = (d: Pick<CourtesyDrive, "groupIds" | "sourceGroupId">) =>
  d.groupIds?.length ? d.groupIds : [d.sourceGroupId];

/** Members of each picked group (missing groups → none). */
export const groupMembersOf = (groups: PeopleGroup[], ids: string[]) =>
  ids.map((id) => groups.find((g) => g.id === id)?.members ?? []);

/**
 * People a run gets from several groups + individuals — each person once, keyed by
 * member type + database id (never name / phone). Mirrors the API's buildRoster.
 */
export function uniquePeopleCount(
  groupMembers: PersonRef[][],
  individuals: PersonRef[] = [],
): number {
  return new Set([...groupMembers.flat(), ...individuals].map((p) => `${p.memberType}:${p.personId}`))
    .size;
}

/** A recipient's gifts — fractional on kg / L runs (0.5 = half a gift); missing → 1. */
export const recipientQty = (q: number | null | undefined) => (Number(q) > 0 ? Number(q) : 1);

/** Total spend for a run: costPerGift × sum(recipient quantities). */
export function giftRunTotalAmount(drive: {
  costPerGift?: number | null;
  recipients: Array<{ quantity?: number | null }>;
}): number {
  const cost = Number(drive.costPerGift);
  if (!Number.isFinite(cost) || cost < 0) return 0;
  const qty = drive.recipients.reduce((sum, r) => sum + recipientQty(r.quantity), 0);
  return cost * qty;
}

/** Gifts × size per gift, with the configured unit: 1 gift of 0.25 kg → "0.25 kg", 5 → "5 Box". */
export function formatGiftQty(
  count: number,
  drive: Pick<CourtesyDrive, "sizePerGift" | "sizeUnitSymbol">,
): string {
  const total = Math.round(count * Number(drive.sizePerGift || 1) * 1000) / 1000;
  const n = total.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return drive.sizeUnitSymbol ? `${n} ${drive.sizeUnitSymbol}` : n;
}

/**
 * What a person typed ("0.25" kg, "2" Box) → their gift count. Countable units take whole
 * gifts; kg / L take any amount > 0 (3 decimals), stored as amount ÷ size per gift.
 * Returns null for an invalid entry.
 */
export function giftsFromAmount(
  text: string,
  drive: Pick<CourtesyDrive, "sizePerGift" | "sizeUnitCountable">,
): number | null {
  const amount = Math.round(Number(text) * 1000) / 1000;
  if (!(amount > 0)) return null;
  if (drive.sizeUnitCountable !== false) return Math.max(1, Math.round(amount));
  return Math.round((amount / Number(drive.sizePerGift || 1)) * 1e6) / 1e6;
}

/** Picker / Configure label: "Kilogram (kg)", or just "Office Kit" when name = symbol. */
export const unitLabel = (u: { name: string; symbol?: string }) =>
  u.symbol && u.symbol !== u.name ? `${u.name} (${u.symbol})` : u.name;

/** The modal's Quantity: countable = whole gifts each (≥ 1); measurable = amount each (> 0, ≤ 3 decimals). */
export function giftSizeError(isCountable: boolean, size: string): string | null {
  const text = size.trim();
  if (!text) return "Quantity is required";
  if (isCountable) return /^[1-9]\d*$/.test(text) ? null : "Enter a whole number (1 or more)";
  if (!/^\d+(\.\d{1,3})?$/.test(text) || !(Number(text) > 0) || Number(text) > 999999999.999) {
    return "Enter a number greater than 0 (up to 3 decimals)";
  }
  return null;
}

export interface ConfigOption {
  id: string;
  name: string;
  color: string;
  /** Units only. */
  symbol?: string;
  isCountable?: boolean;
  isDefault?: boolean;
  isSystem?: boolean;
  isActive?: boolean;
  inUse?: boolean;
}

export interface CourtesyConfig {
  occasions: ConfigOption[];
  /** Handover statuses on Gift Run recipient lists (editable in Configure). */
  deliveryStatuses: ConfigOption[];
  /** Gift Run lifecycle statuses (editable in Configure). */
  giftRunStatuses: ConfigOption[];
  /** Delivery mode options per recipient (editable in Configure). */
  deliveryModes: ConfigOption[];
  /** Active quantity units / kit labels (editable in Configure). */
  units: ConfigOption[];
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

const GROUP_STATUS_COLORS: Record<GroupStatus, string> = {
  ACTIVE: '#16a34a',
  ARCHIVED: '#94a3b8',
};

export function groupStatusColor(status: GroupStatus): string {
  return GROUP_STATUS_COLORS[status];
}

export function parseGroupStatus(status: unknown): GroupStatus {
  return status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';
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

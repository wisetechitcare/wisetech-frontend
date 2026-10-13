import type {
  CourtesyConfig,
  CourtesyDeskState,
  CourtesyDrive,
  CourtesyRecipient,
  ConfigOption,
  DeliveryMode,
  DeliveryStatus,
  PeopleGroup,
  PersonRef,
  SkippedReason,
} from "../types";
import {
  DEFAULT_DELIVERY_MODES,
  DEFAULT_DELIVERY_STATUSES,
  DEFAULT_GIFT_RUN_STATUSES,
  DEFAULT_OCCASIONS,
} from "../types";
import { seedCourtesyDeskState } from "../seed/demoData";

const STORAGE_KEY = "wisetech.courtesyDesk.v2";

type Listener = () => void;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultConfig(): CourtesyConfig {
  return {
    occasions: DEFAULT_OCCASIONS.map((o) => ({ ...o })),
    deliveryStatuses: DEFAULT_DELIVERY_STATUSES.map((s) => ({ ...s })),
    giftRunStatuses: DEFAULT_GIFT_RUN_STATUSES.map((s) => ({ ...s })),
    deliveryModes: DEFAULT_DELIVERY_MODES.map((m) => ({ ...m })),
  };
}

function migrateDeliveryStatuses(raw: any): ConfigOption[] {
  if (raw?.config?.deliveryStatuses?.length) {
    return raw.config.deliveryStatuses;
  }
  const legacy = raw?.config?.statusColors || {};
  return DEFAULT_DELIVERY_STATUSES.map((s) => ({
    ...s,
    color: legacy[s.id] || s.color,
  }));
}

function normalizeState(raw: any): CourtesyDeskState {
  const drives = (Array.isArray(raw?.drives) ? raw.drives : []).map(
    (d: any) => ({
      ...d,
      recipients: (d.recipients || []).map((r: any) => ({
        ...r,
        quantity:
          typeof r.quantity === "number" && r.quantity > 0 ? r.quantity : 1,
      })),
    }),
  );
  return {
    version: 2,
    groups: Array.isArray(raw?.groups) ? raw.groups : [],
    drives,
    config: {
      occasions: raw?.config?.occasions?.length
        ? raw.config.occasions
        : defaultConfig().occasions,
      deliveryStatuses: migrateDeliveryStatuses(raw),
      giftRunStatuses: raw?.config?.giftRunStatuses?.length
        ? raw.config.giftRunStatuses
        : defaultConfig().giftRunStatuses,
      deliveryModes: raw?.config?.deliveryModes?.length
        ? raw.config.deliveryModes
        : defaultConfig().deliveryModes,
    },
  };
}

function loadState(): CourtesyDeskState {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return normalizeState(JSON.parse(v2));
    // migrate v1 if present
    const v1 = localStorage.getItem("wisetech.courtesyDesk.v1");
    if (v1) {
      const migrated = normalizeState(JSON.parse(v1));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // seed
  }
  const seeded = seedCourtesyDeskState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

let state: CourtesyDeskState = loadState();
const listeners = new Set<Listener>();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function setState(next: CourtesyDeskState) {
  state = next;
  persist();
}

export function getCourtesyDeskState(): CourtesyDeskState {
  return state;
}

export function subscribeCourtesyDesk(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetCourtesyDeskDemo() {
  const seeded = seedCourtesyDeskState();
  setState(seeded);
  return seeded;
}

export function getConfig() {
  return state.config;
}

export function saveOccasion(option: ConfigOption) {
  const exists = state.config.occasions.some((o) => o.id === option.id);
  const occasions = exists
    ? state.config.occasions.map((o) => (o.id === option.id ? option : o))
    : [...state.config.occasions, option];
  setState({ ...state, config: { ...state.config, occasions } });
}

export function deleteOccasion(id: string) {
  setState({
    ...state,
    config: {
      ...state.config,
      occasions: state.config.occasions.filter((o) => o.id !== id),
    },
  });
}

export function saveDeliveryStatus(option: ConfigOption) {
  const exists = state.config.deliveryStatuses.some((s) => s.id === option.id);
  const deliveryStatuses = exists
    ? state.config.deliveryStatuses.map((s) =>
        s.id === option.id ? option : s,
      )
    : [...state.config.deliveryStatuses, option];
  setState({ ...state, config: { ...state.config, deliveryStatuses } });
}

export function deleteDeliveryStatus(id: string) {
  setState({
    ...state,
    config: {
      ...state.config,
      deliveryStatuses: state.config.deliveryStatuses.filter(
        (s) => s.id !== id,
      ),
    },
  });
}

export function saveGiftRunStatus(option: ConfigOption) {
  const exists = state.config.giftRunStatuses.some((s) => s.id === option.id);
  const giftRunStatuses = exists
    ? state.config.giftRunStatuses.map((s) => (s.id === option.id ? option : s))
    : [...state.config.giftRunStatuses, option];
  setState({ ...state, config: { ...state.config, giftRunStatuses } });
}

export function deleteGiftRunStatus(id: string) {
  setState({
    ...state,
    config: {
      ...state.config,
      giftRunStatuses: state.config.giftRunStatuses.filter((s) => s.id !== id),
    },
  });
}

export function saveDeliveryMode(option: ConfigOption) {
  const exists = state.config.deliveryModes.some((m) => m.id === option.id);
  const deliveryModes = exists
    ? state.config.deliveryModes.map((m) => (m.id === option.id ? option : m))
    : [...state.config.deliveryModes, option];
  setState({ ...state, config: { ...state.config, deliveryModes } });
}

export function deleteDeliveryMode(id: string) {
  setState({
    ...state,
    config: {
      ...state.config,
      deliveryModes: state.config.deliveryModes.filter((m) => m.id !== id),
    },
  });
}

export function listGroups(includeArchived = false) {
  return state.groups
    .filter((g) => includeArchived || g.status === "ACTIVE")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getGroup(id: string) {
  return state.groups.find((g) => g.id === id);
}

function dedupeMembers(members: PersonRef[]): PersonRef[] {
  const seen = new Set<string>();
  const out: PersonRef[] = [];
  for (const m of members) {
    const key = `${m.memberType}:${m.personId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export function saveGroup(input: {
  id?: string;
  name: string;
  notes?: string;
  members: PersonRef[];
  status?: PeopleGroup["status"];
}) {
  const ts = nowIso();
  if (input.id) {
    const groups = state.groups.map((g) =>
      g.id === input.id
        ? {
            ...g,
            name: input.name.trim(),
            notes: input.notes?.trim() || "",
            members: dedupeMembers(input.members),
            status: input.status ?? g.status,
            updatedAt: ts,
          }
        : g,
    );
    setState({ ...state, groups });
    return groups.find((g) => g.id === input.id)!;
  }

  const group: PeopleGroup = {
    id: uid("grp"),
    name: input.name.trim(),
    notes: input.notes?.trim() || "",
    status: "ACTIVE",
    members: dedupeMembers(input.members),
    createdAt: ts,
    updatedAt: ts,
  };
  setState({ ...state, groups: [group, ...state.groups] });
  return group;
}

export function cloneGroup(groupId: string, newName: string) {
  const source = getGroup(groupId);
  if (!source) throw new Error("Group not found");
  return saveGroup({
    name: newName.trim() || `${source.name} (copy)`,
    notes: source.notes,
    members: source.members.map((m) => ({ ...m })),
  });
}

export function archiveGroup(groupId: string) {
  const groups = state.groups.map((g) =>
    g.id === groupId
      ? { ...g, status: "ARCHIVED" as const, updatedAt: nowIso() }
      : g,
  );
  setState({ ...state, groups });
}

export function unarchiveGroup(groupId: string) {
  const groups = state.groups.map((g) =>
    g.id === groupId
      ? { ...g, status: "ACTIVE" as const, updatedAt: nowIso() }
      : g,
  );
  setState({ ...state, groups });
}

export function listDrives(includeArchived = false) {
  return state.drives
    .filter((d) => includeArchived || d.status !== "ARCHIVED")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDrive(id: string) {
  return state.drives.find((d) => d.id === id);
}

function snapshotRecipients(
  members: PersonRef[],
  fallbackQty = 1,
): CourtesyRecipient[] {
  const ts = nowIso();
  return members.map((m) => ({
    id: uid("rcp"),
    memberType: m.memberType,
    personId: m.personId,
    fullName: m.fullName,
    companyName: m.companyName,
    area: m.area,
    address: m.address,
    phone: m.phone,
    email: m.email,
    avatarUrl: m.avatarUrl,
    status: "PENDING" as const,
    mode: "IN_PERSON" as const,
    quantity:
      typeof m.giftQuantity === "number" && m.giftQuantity > 0
        ? m.giftQuantity
        : fallbackQty,
    remark: "",
    skippedReason: "" as const,
    updatedAt: ts,
  }));
}

function personKey(m: Pick<PersonRef, "memberType" | "personId">) {
  return `${m.memberType}:${m.personId}`;
}

export function createDrive(input: {
  title: string;
  occasionType: string;
  giftItem: string;
  driveDate?: string;
  sourceGroupId: string;
  defaultQuantity?: number;
}) {
  const group = getGroup(input.sourceGroupId);
  if (!group) throw new Error("People Group not found");
  if (!group.members.length) throw new Error("Group has no members");

  const ts = nowIso();
  const drive: CourtesyDrive = {
    id: uid("drv"),
    title: input.title.trim(),
    occasionType: input.occasionType,
    giftItem: input.giftItem.trim(),
    driveDate: input.driveDate || ts.slice(0, 10),
    sourceGroupId: group.id,
    sourceGroupName: group.name,
    status: "IN_PROGRESS",
    defaultMode: "IN_PERSON",
    recipients: snapshotRecipients(
      group.members,
      Math.max(1, input.defaultQuantity ?? 1),
    ),
    createdAt: ts,
    updatedAt: ts,
  };
  setState({ ...state, drives: [drive, ...state.drives] });
  return drive;
}

export function updateDriveMeta(
  driveId: string,
  patch: Partial<
    Pick<
      CourtesyDrive,
      | "title"
      | "giftItem"
      | "driveDate"
      | "status"
      | "occasionType"
      | "defaultAssigneeEmployeeId"
      | "defaultAssigneeName"
      | "defaultMode"
    >
  >,
) {
  const drives = state.drives.map((d) =>
    d.id === driveId ? { ...d, ...patch, updatedAt: nowIso() } : d,
  );
  setState({ ...state, drives });
  return drives.find((d) => d.id === driveId);
}

/** Apply one assignee + mode to every recipient (whole Gift Run). */
export function applyDriveAssigneeMode(
  driveId: string,
  input: {
    assigneeEmployeeId?: string;
    assigneeName?: string;
    mode: DeliveryMode;
  },
) {
  const drives = state.drives.map((d) => {
    if (d.id !== driveId) return d;
    const ts = nowIso();
    return {
      ...d,
      defaultAssigneeEmployeeId: input.assigneeEmployeeId || "",
      defaultAssigneeName: input.assigneeName || "",
      defaultMode: input.mode,
      updatedAt: ts,
      recipients: d.recipients.map((r) => ({
        ...r,
        mode: input.mode,
        assigneeEmployeeId:
          input.mode === "IN_PERSON"
            ? input.assigneeEmployeeId
            : r.assigneeEmployeeId,
        assigneeName:
          input.mode === "IN_PERSON" ? input.assigneeName : r.assigneeName,
        updatedAt: ts,
      })),
    };
  });
  setState({ ...state, drives });
  return getDrive(driveId);
}

/** Add people to gift run AND to the source group. */
export function addPeopleToDrive(driveId: string, people: PersonRef[]) {
  const drive = getDrive(driveId);
  if (!drive) throw new Error("Gift Run not found");
  const existing = new Set(drive.recipients.map((r) => personKey(r)));
  const additions = people.filter((p) => !existing.has(personKey(p)));
  if (!additions.length) return { added: 0, drive };

  const group = getGroup(drive.sourceGroupId);
  const groups = group
    ? state.groups.map((g) =>
        g.id === group.id
          ? {
              ...g,
              members: dedupeMembers([...g.members, ...additions]),
              updatedAt: nowIso(),
            }
          : g,
      )
    : state.groups;

  const updated: CourtesyDrive = {
    ...drive,
    recipients: [...drive.recipients, ...snapshotRecipients(additions)],
    updatedAt: nowIso(),
  };

  setState({
    ...state,
    groups,
    drives: state.drives.map((d) => (d.id === driveId ? updated : d)),
  });
  return { added: additions.length, drive: updated };
}

/** Remove people from gift run AND from the source group. */
export function removePeopleFromDrive(driveId: string, recipientIds: string[]) {
  const drive = getDrive(driveId);
  if (!drive) throw new Error("Gift Run not found");
  const idSet = new Set(recipientIds);
  const removed = drive.recipients.filter((r) => idSet.has(r.id));
  const removeKeys = new Set(removed.map((r) => personKey(r)));

  const group = getGroup(drive.sourceGroupId);
  const groups = group
    ? state.groups.map((g) =>
        g.id === group.id
          ? {
              ...g,
              members: g.members.filter((m) => !removeKeys.has(personKey(m))),
              updatedAt: nowIso(),
            }
          : g,
      )
    : state.groups;

  const updated: CourtesyDrive = {
    ...drive,
    recipients: drive.recipients.filter((r) => !idSet.has(r.id)),
    updatedAt: nowIso(),
  };

  setState({
    ...state,
    groups,
    drives: state.drives.map((d) => (d.id === driveId ? updated : d)),
  });
  return updated;
}

export function updateRecipient(
  driveId: string,
  recipientId: string,
  patch: Partial<
    Pick<
      CourtesyRecipient,
      | "status"
      | "mode"
      | "quantity"
      | "assigneeEmployeeId"
      | "assigneeName"
      | "remark"
      | "skippedReason"
    >
  >,
) {
  const drives = state.drives.map((d) => {
    if (d.id !== driveId) return d;
    const recipients = d.recipients.map((r) =>
      r.id === recipientId ? { ...r, ...patch, updatedAt: nowIso() } : r,
    );
    // recompute mixed defaults
    const modes = new Set(recipients.map((r) => r.mode));
    const assignees = new Set(
      recipients
        .filter((r) => r.mode === "IN_PERSON")
        .map((r) => r.assigneeEmployeeId || ""),
    );
    let defaultMode: CourtesyDrive["defaultMode"] = d.defaultMode;
    let defaultAssigneeEmployeeId = d.defaultAssigneeEmployeeId;
    let defaultAssigneeName = d.defaultAssigneeName;
    if (modes.size > 1) defaultMode = "MIXED";
    else if (modes.size === 1) defaultMode = [...modes][0];
    if (assignees.size > 1) {
      defaultAssigneeEmployeeId = "";
      defaultAssigneeName = "";
    } else if (assignees.size === 1) {
      const id = [...assignees][0];
      const match = recipients.find((r) => r.assigneeEmployeeId === id);
      defaultAssigneeEmployeeId = id;
      defaultAssigneeName = match?.assigneeName || "";
      if (defaultMode !== "MIXED" && defaultMode !== "COURIER")
        defaultMode = "IN_PERSON";
    }
    return {
      ...d,
      recipients,
      defaultMode,
      defaultAssigneeEmployeeId,
      defaultAssigneeName,
      updatedAt: nowIso(),
    };
  });
  setState({ ...state, drives });
  return getDrive(driveId);
}

export function bulkUpdateRecipients(
  driveId: string,
  recipientIds: string[],
  patch: Partial<
    Pick<
      CourtesyRecipient,
      | "status"
      | "mode"
      | "assigneeEmployeeId"
      | "assigneeName"
      | "skippedReason"
    >
  >,
) {
  for (const id of recipientIds) {
    updateRecipient(driveId, id, patch);
  }
  return getDrive(driveId);
}

export function getOverviewStats(fyStart?: string, fyEnd?: string) {
  const drives = listDrives(true).filter((d) => {
    if (d.status === "ARCHIVED") return false;
    if (!fyStart || !fyEnd) return true;
    const day = (d.driveDate || d.createdAt).slice(0, 10);
    return day >= fyStart && day <= fyEnd;
  });

  let pending = 0;
  let delivered = 0;
  let out = 0;
  let skipped = 0;

  drives.forEach((d) => {
    d.recipients.forEach((r) => {
      switch (r.status) {
        case "PENDING":
          pending += 1;
          break;
        case "DELIVERED":
          delivered += 1;
          break;
        case "OUT":
          out += 1;
          break;
        case "SKIPPED":
          skipped += 1;
          break;
        default:
          pending += 1;
          break;
      }
    });
  });

  return {
    activeDriveCount: drives.filter(
      (d) => d.status === "IN_PROGRESS" || d.status === "DRAFT",
    ).length,
    pending,
    out,
    delivered,
    skipped,
    drives: drives.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      giftItem: d.giftItem,
      occasionType: d.occasionType,
      total: d.recipients.length,
      delivered: d.recipients.filter((r) => r.status === "DELIVERED").length,
      pending: d.recipients.filter(
        (r) => r.status === "PENDING" || r.status === "OUT",
      ).length,
    })),
  };
}

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
  driveGroupIds,
  giftRunTotalAmount,
} from "../types";
import * as giftsApi from "@services/gifts";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";

const LEGACY_STORAGE_KEYS = [
  "wisetech.courtesyDesk.v2",
  "wisetech.courtesyDesk.v1",
];

let apiEnabled = false;
/** Last hydrate failure — rethrown by requireApi so toasts show the API `detail`. */
let lastHydrateError: unknown = null;

export function isCourtesyDeskApiMode() {
  return apiEnabled;
}

/** Writes must hit the API — never fake success in memory when hydrate failed. */
function requireApi(): void {
  if (!apiEnabled) {
    throw (
      lastHydrateError ?? {
        hasError: true,
        statusCode: 503,
        detail: "Gift Management API is not available.",
      }
    );
  }
}

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
    // Units always come from the API (configured per company) — none are hardcoded here.
    units: [],
  };
}

function emptyState(): CourtesyDeskState {
  return {
    version: 2,
    groups: [],
    drives: [],
    config: defaultConfig(),
  };
}

function clearLegacyLocalStorage() {
  try {
    LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

let state: CourtesyDeskState = emptyState();
const listeners = new Set<Listener>();

export async function bootstrapCourtesyDeskFromApi() {
  clearLegacyLocalStorage();
  try {
    const data = await giftsApi.hydrateGiftsState();
    apiEnabled = true;
    lastHydrateError = null;
    state = { ...data, version: 2 };
    for (const g of state.groups) syncDrivesFromGroup(g.id);
    listeners.forEach((l) => l());
  } catch (err) {
    lastHydrateError = err;
    apiEnabled = false;
    state = emptyState();
    // The screen falls back to built-in defaults; say so, or they pass for real config.
    toast.error(apiErrorMessage(err, "Could not load Gift Management — showing defaults only"), {
      toastId: "gift-hydrate-failed",
    });
    listeners.forEach((l) => l());
  }
}

function notify() {
  listeners.forEach((l) => l());
}

async function refreshDrivesFromApi() {
  if (!apiEnabled) return;
  const drives = await giftsApi.fetchDrives(true);
  setState({ ...state, drives });
}

function setState(next: CourtesyDeskState) {
  state = next;
  notify();
}

export function getCourtesyDeskState(): CourtesyDeskState {
  return state;
}

export function subscribeCourtesyDesk(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConfig() {
  return state.config;
}

export async function saveOccasionToApi(option: ConfigOption) {
  requireApi();
  const exists = state.config.occasions.some((o) => o.id === option.id);
  const saved = exists
    ? await giftsApi.updateConfigOptionApi("occasions", option)
    : await giftsApi.createConfigOptionApi("occasions", option);
  saveOccasion(saved);
}

export function saveOccasion(option: ConfigOption) {
  const exists = state.config.occasions.some((o) => o.id === option.id);
  const occasions = exists
    ? state.config.occasions.map((o) => (o.id === option.id ? option : o))
    : [...state.config.occasions, option];
  setState({ ...state, config: { ...state.config, occasions } });
}

export async function deleteOccasionToApi(id: string) {
  requireApi();
  await giftsApi.deleteConfigOptionApi("occasions", id);
  deleteOccasion(id);
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

export async function saveDeliveryStatusToApi(option: ConfigOption) {
  requireApi();
  const exists = state.config.deliveryStatuses.some((s) => s.id === option.id);
  const saved = exists
    ? await giftsApi.updateConfigOptionApi("delivery-statuses", option)
    : await giftsApi.createConfigOptionApi("delivery-statuses", option);
  saveDeliveryStatus(saved);
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

export async function deleteDeliveryStatusToApi(id: string) {
  requireApi();
  await giftsApi.deleteConfigOptionApi("delivery-statuses", id);
  deleteDeliveryStatus(id);
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

/**
 * Every unit incl. inactive (for Configure). Also refreshes the active list the Gift Run
 * forms read, so a unit saved in Configure appears in the dropdown immediately.
 */
export async function fetchAllUnitsFromApi() {
  requireApi();
  const all = await giftsApi.fetchConfigOptionsApi("units", true);
  setState({
    ...state,
    config: { ...state.config, units: all.filter((u) => u.isActive !== false) },
  });
  return all;
}

export async function saveUnitToApi(option: ConfigOption, isNew: boolean) {
  requireApi();
  if (isNew) await giftsApi.createConfigOptionApi("units", option);
  else await giftsApi.updateConfigOptionApi("units", option);
  return fetchAllUnitsFromApi();
}

export async function saveGiftRunStatusToApi(option: ConfigOption) {
  requireApi();
  const exists = state.config.giftRunStatuses.some((s) => s.id === option.id);
  const saved = exists
    ? await giftsApi.updateConfigOptionApi("gift-run-statuses", option)
    : await giftsApi.createConfigOptionApi("gift-run-statuses", option);
  saveGiftRunStatus(saved);
}

export function saveGiftRunStatus(option: ConfigOption) {
  const exists = state.config.giftRunStatuses.some((s) => s.id === option.id);
  const giftRunStatuses = exists
    ? state.config.giftRunStatuses.map((s) => (s.id === option.id ? option : s))
    : [...state.config.giftRunStatuses, option];
  setState({ ...state, config: { ...state.config, giftRunStatuses } });
}

export async function deleteGiftRunStatusToApi(id: string) {
  requireApi();
  await giftsApi.deleteConfigOptionApi("gift-run-statuses", id);
  deleteGiftRunStatus(id);
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

export async function saveDeliveryModeToApi(option: ConfigOption) {
  requireApi();
  const exists = state.config.deliveryModes.some((m) => m.id === option.id);
  const saved = exists
    ? await giftsApi.updateConfigOptionApi("delivery-modes", option)
    : await giftsApi.createConfigOptionApi("delivery-modes", option);
  saveDeliveryMode(saved);
}

export function saveDeliveryMode(option: ConfigOption) {
  const exists = state.config.deliveryModes.some((m) => m.id === option.id);
  const deliveryModes = exists
    ? state.config.deliveryModes.map((m) => (m.id === option.id ? option : m))
    : [...state.config.deliveryModes, option];
  setState({ ...state, config: { ...state.config, deliveryModes } });
}

export async function deleteDeliveryModeToApi(id: string) {
  requireApi();
  await giftsApi.deleteConfigOptionApi("delivery-modes", id);
  deleteDeliveryMode(id);
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

export async function saveGroupToApi(input: {
  id?: string;
  name: string;
  notes?: string;
  members: PersonRef[];
  status?: PeopleGroup["status"];
}) {
  requireApi();
  const saved = input.id
    ? await giftsApi.updateGroupApi(input.id, {
        name: input.name,
        notes: input.notes,
        members: input.members,
        status: input.status,
      })
    : await giftsApi.createGroupApi({
        name: input.name,
        notes: input.notes,
        members: input.members,
        status: input.status,
      });
  const groups = input.id
    ? state.groups.map((g) => (g.id === saved.id ? saved : g))
    : [saved, ...state.groups];
  setState({ ...state, groups });
  await refreshDrivesFromApi();
  // Always re-mirror from the group we just saved (API list can lag; offline has no sync endpoint).
  syncDrivesFromGroup(saved.id);
  return saved;
}

/** Gift Run roster mirrors its People Group; DRIVE_ONLY rows stay until removed on the run.
 *  COMPLETED / ARCHIVED runs are frozen — group edits must not change their roster. */
function syncDrivesFromGroup(groupId: string) {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) return;
  const ts = nowIso();
  const drives = state.drives.map((d) => {
    if (
      !driveGroupIds(d).includes(groupId) ||
      d.status === "ARCHIVED" ||
      d.status === "COMPLETED"
    ) {
      return d;
    }
    // Union of every group the run links — a person in two groups is one recipient.
    const linked = driveGroupIds(d)
      .map((id) => state.groups.find((g) => g.id === id))
      .filter((g): g is PeopleGroup => !!g);
    const members = linked
      .flatMap((g) => g.members)
      .filter((m, i, all) => all.findIndex((x) => personKey(x) === personKey(m)) === i);
    const memberKeys = new Set(members.map(personKey));
    const driveOnly = d.recipients.filter(
      (r) => (r.rosterSource ?? "GROUP") === "DRIVE_ONLY",
    );
    const groupLinked = d.recipients.filter(
      (r) =>
        (r.rosterSource ?? "GROUP") === "GROUP" && memberKeys.has(personKey(r)),
    );
    // Soft-removed on this run (still in group) — do not re-add.
    const removedKeys = new Set(
      d.recipients
        .filter((r) => (r.rosterSource as string) === "RUN_REMOVED")
        .map(personKey),
    );
    const linkedKeys = new Set([
      ...groupLinked.map(personKey),
      ...driveOnly.map(personKey),
      ...removedKeys,
    ]);
    const additions = members.filter(
      (m) => !linkedKeys.has(personKey(m)),
    );
    const recipients = [
      ...groupLinked.map((r) => {
        const m = members.find((x) => personKey(x) === personKey(r));
        if (!m) return { ...r, rosterSource: "GROUP" as const };
        return {
          ...r,
          rosterSource: "GROUP" as const,
          fullName: m.fullName,
          companyName: m.companyName,
          area: m.area,
          address: m.address,
          phone: m.phone,
          email: m.email,
          avatarUrl: m.avatarUrl,
        };
      }),
      ...driveOnly.map((r) => {
        const m = members.find((x) => personKey(x) === personKey(r));
        if (!m) return r;
        return {
          ...r,
          rosterSource: "GROUP" as const,
          fullName: m.fullName,
          companyName: m.companyName,
          area: m.area,
          address: m.address,
          phone: m.phone,
          email: m.email,
          avatarUrl: m.avatarUrl,
        };
      }),
      ...snapshotRecipients(additions, 1, "GROUP"),
    ];
    return {
      ...d,
      sourceGroupName: linked.map((g) => g.name).join(", "),
      recipients,
      updatedAt: ts,
    };
  });
  setState({ ...state, drives });
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
    syncDrivesFromGroup(input.id);
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

export async function cloneGroupToApi(groupId: string, newName: string) {
  requireApi();
  const saved = await giftsApi.cloneGroupApi(
    groupId,
    newName.trim() || `${getGroup(groupId)?.name ?? "Group"} (copy)`,
  );
  setState({ ...state, groups: [saved, ...state.groups] });
  return saved;
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

export async function archiveGroupToApi(groupId: string) {
  requireApi();
  const saved = await giftsApi.archiveGroupApi(groupId);
  setState({
    ...state,
    groups: state.groups.map((g) => (g.id === saved.id ? saved : g)),
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

export async function unarchiveGroupToApi(groupId: string) {
  requireApi();
  const saved = await giftsApi.unarchiveGroupApi(groupId);
  setState({
    ...state,
    groups: state.groups.map((g) => (g.id === saved.id ? saved : g)),
  });
}

export function unarchiveGroup(groupId: string) {
  const groups = state.groups.map((g) =>
    g.id === groupId
      ? { ...g, status: "ACTIVE" as const, updatedAt: nowIso() }
      : g,
  );
  setState({ ...state, groups });
}

export async function deleteGroupToApi(groupId: string) {
  requireApi();
  await giftsApi.deleteGroupApi(groupId);
  setState({
    ...state,
    groups: state.groups.filter((g) => g.id !== groupId),
  });
}

export function listDrives(includeArchived = false) {
  return state.drives
    .filter((d) => includeArchived || d.status !== "ARCHIVED")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDrive(id: string) {
  return state.drives.find((d) => d.id === id);
}

export async function refreshDriveFromApi(id: string) {
  if (!apiEnabled) return getDrive(id);
  const drive = await giftsApi.fetchDrive(id);
  const drives = state.drives.some((d) => d.id === id)
    ? state.drives.map((d) => (d.id === id ? drive : d))
    : [drive, ...state.drives];
  setState({ ...state, drives });
  return drive;
}

function snapshotRecipients(
  members: PersonRef[],
  fallbackQty = 1,
  rosterSource: CourtesyRecipient["rosterSource"] = "GROUP",
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
    rosterSource,
    updatedAt: ts,
  }));
}

function personKey(m: Pick<PersonRef, "memberType" | "personId">) {
  return `${m.memberType}:${m.personId}`;
}

export async function createDriveToApi(input: {
  title: string;
  occasionType: string;
  giftItem: string;
  driveDate?: string;
  sourceGroupId?: string;
  /** Several groups (first = primary); a person in more than one is added once. */
  sourceGroupIds?: string[];
  /** Individually picked people; skipped when already in a selected group. */
  members?: PersonRef[];
  fromRunId?: string;
  defaultQuantity?: number;
  costPerGift?: number | null;
  sizeUnit?: string;
  sizePerGift?: string;
}) {
  requireApi();
  const drive = await giftsApi.createDriveApi(input);
  setState({ ...state, drives: [drive, ...state.drives] });
  return drive;
}

export function createDrive(input: {
  title: string;
  occasionType: string;
  giftItem: string;
  driveDate?: string;
  sourceGroupId: string;
  defaultQuantity?: number;
  costPerGift?: number | null;
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
    costPerGift: input.costPerGift ?? null,
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

export async function updateDriveMetaToApi(
  driveId: string,
  patch: Partial<
    Pick<
      CourtesyDrive,
      | "title"
      | "giftItem"
      | "driveDate"
      | "status"
      | "occasionType"
      | "sourceGroupId"
      | "costPerGift"
      | "defaultAssigneeEmployeeId"
      | "defaultAssigneeName"
      | "defaultMode"
      | "sizeUnit"
      | "sizePerGift"
    >
  > & { sourceGroupIds?: string[] },
) {
  requireApi();
  const drive = await giftsApi.updateDriveApi(driveId, patch);
  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === drive.id ? drive : d)),
  });
  return drive;
}

export async function cloneDriveToApi(driveId: string, newTitle?: string) {
  requireApi();
  const drive = await giftsApi.cloneDriveApi(
    driveId,
    newTitle?.trim() || undefined,
  );
  setState({ ...state, drives: [drive, ...state.drives] });
  return drive;
}

export async function archiveDriveToApi(driveId: string) {
  requireApi();
  const drive = await giftsApi.archiveDriveApi(driveId);
  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === drive.id ? drive : d)),
  });
  return drive;
}

export async function unarchiveDriveToApi(driveId: string) {
  requireApi();
  const drive = await giftsApi.unarchiveDriveApi(driveId);
  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === drive.id ? drive : d)),
  });
  return drive;
}

export async function deleteDriveToApi(driveId: string) {
  requireApi();
  await giftsApi.deleteDriveApi(driveId);
  setState({
    ...state,
    drives: state.drives.filter((d) => d.id !== driveId),
  });
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
      | "sourceGroupId"
      | "costPerGift"
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
export async function applyDriveAssigneeModeToApi(
  driveId: string,
  input: {
    assigneeEmployeeId?: string;
    assigneeName?: string;
    mode: DeliveryMode;
  },
) {
  requireApi();
  const drive = await giftsApi.applyDriveDefaultsApi(driveId, input);
  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === drive.id ? drive : d)),
  });
  return drive;
}

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

/** Add people to this Gift Run only (does not change the People Group). */
export async function addPeopleToDriveToApi(
  driveId: string,
  people: PersonRef[],
  defaultQuantity?: number,
) {
  requireApi();
  const drive = await giftsApi.addRunRecipientsApi(
    driveId,
    people,
    defaultQuantity,
  );
  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === drive.id ? drive : d)),
  });
  return drive;
}

export function addPeopleToDrive(driveId: string, people: PersonRef[]) {
  const drive = getDrive(driveId);
  if (!drive) throw new Error("Gift Run not found");
  const existing = new Set(drive.recipients.map((r) => personKey(r)));
  const additions = people.filter((p) => !existing.has(personKey(p)));
  if (!additions.length) return { added: 0, drive };

  const updated: CourtesyDrive = {
    ...drive,
    recipients: [
      ...drive.recipients,
      ...snapshotRecipients(additions, 1, "DRIVE_ONLY"),
    ],
    updatedAt: nowIso(),
  };

  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === driveId ? updated : d)),
  });
  return { added: additions.length, drive: updated };
}

/** Remove recipients from this Gift Run only (People Group is never changed). */
export async function removePeopleFromDriveToApi(
  driveId: string,
  recipientIds: string[],
) {
  requireApi();
  const drive = await giftsApi.removeRunRecipientsApi(driveId, recipientIds);
  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === drive.id ? drive : d)),
  });
  return drive;
}

export function removePeopleFromDrive(driveId: string, recipientIds: string[]) {
  const drive = getDrive(driveId);
  if (!drive) throw new Error("Gift Run not found");
  const idSet = new Set(recipientIds);

  const updated: CourtesyDrive = {
    ...drive,
    recipients: drive.recipients.filter((r) => !idSet.has(r.id)),
    updatedAt: nowIso(),
  };

  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === driveId ? updated : d)),
  });
  return updated;
}

export async function updateRecipientToApi(
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
  requireApi();
  const drive = await giftsApi.patchRecipientApi(driveId, recipientId, patch);
  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === drive.id ? drive : d)),
  });
  return drive;
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

export async function bulkUpdateRecipientsToApi(
  driveId: string,
  recipientIds: string[],
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
  requireApi();
  const drive = await giftsApi.bulkPatchRecipientsApi(
    driveId,
    recipientIds,
    patch,
  );
  setState({
    ...state,
    drives: state.drives.map((d) => (d.id === drive.id ? drive : d)),
  });
  return drive;
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

export async function getOverviewStatsFromApi(
  fyStart?: string,
  fyEnd?: string,
) {
  if (!apiEnabled) return getOverviewStats(fyStart, fyEnd);
  return giftsApi.fetchGiftsOverview(fyStart, fyEnd);
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
  let skipped = 0;
  let totalAmount = 0;

  drives.forEach((d) => {
    totalAmount += giftRunTotalAmount(d);
    d.recipients.forEach((r) => {
      switch (r.status) {
        case "PENDING":
          pending += 1;
          break;
        case "DELIVERED":
          delivered += 1;
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
    delivered,
    skipped,
    totalAmount,
    drives: drives.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      giftItem: d.giftItem,
      occasionType: d.occasionType,
      total: d.recipients.length,
      delivered: d.recipients.filter((r) => r.status === "DELIVERED").length,
      pending: d.recipients.filter((r) => r.status === "PENDING").length,
      amount: giftRunTotalAmount(d),
    })),
  };
}

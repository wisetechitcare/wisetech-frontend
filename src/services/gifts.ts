import axios from "axios";
import { GIFTS } from "@constants/api-endpoint";
import type {
  ConfigOption,
  CourtesyConfig,
  CourtesyDrive,
  CourtesyRecipient,
  GroupActivityPage,
  PeopleGroup,
  PersonRef,
} from "@app/pages/employee/courtesy-desk/types";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

const path = (template: string, params: Record<string, string>) =>
  Object.entries(params).reduce((p, [k, v]) => p.replace(`:${k}`, encodeURIComponent(v)), template);

const get = async <T>(url: string): Promise<T> => {
  const { data } = await axios.get(`${API_BASE_URL}/${url}`);
  return data as T;
};

const post = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await axios.post(`${API_BASE_URL}/${url}`, body);
  return data as T;
};

const patchJson = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await axios.patch(`${API_BASE_URL}/${url}`, body);
  return data as T;
};

const del = async <T>(url: string): Promise<T> => {
  const { data } = await axios.delete(`${API_BASE_URL}/${url}`);
  return data as T;
};

export type GiftsOverview = {
  activeDriveCount: number;
  pending: number;
  delivered: number;
  skipped: number;
  totalAmount: number;
  drives: Array<{
    id: string;
    title: string;
    status: string;
    giftItem: string;
    occasionType: string;
    total: number;
    delivered: number;
    pending: number;
    amount: number;
  }>;
};

export async function fetchGiftsConfig() {
  const res = await get<{ config: CourtesyConfig }>(GIFTS.GET_CONFIG);
  return res.config;
}

export async function fetchGiftsOverview(fyStart?: string, fyEnd?: string) {
  const qs = new URLSearchParams();
  if (fyStart) qs.set("fyStart", fyStart);
  if (fyEnd) qs.set("fyEnd", fyEnd);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await get<{ overview: GiftsOverview }>(`${GIFTS.GET_OVERVIEW}${suffix}`);
  return res.overview;
}

export async function fetchGroups(includeArchived = false) {
  const qs = includeArchived ? "?includeArchived=1" : "";
  const res = await get<{ groups: PeopleGroup[] }>(`${GIFTS.GROUPS}${qs}`);
  return res.groups;
}

export async function fetchGroup(id: string) {
  const res = await get<{ group: PeopleGroup }>(path(GIFTS.GROUP_BY_ID, { id }));
  return res.group;
}

export async function fetchGroupActivity(
  id: string,
  page = 1,
  pageSize = 20,
) {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await get<GroupActivityPage>(
    `${path(GIFTS.GROUP_ACTIVITY, { id })}?${qs}`,
  );
  return res;
}

export async function fetchDriveActivity(
  id: string,
  page = 1,
  pageSize = 20,
) {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await get<GroupActivityPage>(
    `${path(GIFTS.DRIVE_ACTIVITY, { id })}?${qs}`,
  );
  return res;
}

export async function createGroupApi(input: {
  name: string;
  notes?: string;
  members: PersonRef[];
  status?: PeopleGroup["status"];
}) {
  const res = await post<{ group: PeopleGroup }>(GIFTS.GROUPS, input);
  return res.group;
}

export async function updateGroupApi(
  id: string,
  input: {
    name: string;
    notes?: string;
    members: PersonRef[];
    status?: PeopleGroup["status"];
  },
) {
  const res = await patchJson<{ group: PeopleGroup }>(path(GIFTS.GROUP_BY_ID, { id }), input);
  return res.group;
}

export async function cloneGroupApi(id: string, name: string) {
  const res = await post<{ group: PeopleGroup }>(path(GIFTS.CLONE_GROUP, { id }), { name });
  return res.group;
}

export async function archiveGroupApi(id: string) {
  const res = await post<{ group: PeopleGroup }>(path(GIFTS.ARCHIVE_GROUP, { id }));
  return res.group;
}

export async function unarchiveGroupApi(id: string) {
  const res = await post<{ group: PeopleGroup }>(path(GIFTS.UNARCHIVE_GROUP, { id }));
  return res.group;
}

export async function deleteGroupApi(id: string) {
  await del<{ message?: string }>(path(GIFTS.GROUP_BY_ID, { id }));
}

export async function fetchDrives(includeArchived = false) {
  const qs = includeArchived ? "?includeArchived=1" : "";
  const res = await get<{ drives: CourtesyDrive[] }>(`${GIFTS.DRIVES}${qs}`);
  return res.drives;
}

export async function fetchDrive(id: string) {
  const res = await get<{ drive: CourtesyDrive }>(path(GIFTS.DRIVE_BY_ID, { id }));
  return res.drive;
}

export async function createDriveApi(input: {
  title: string;
  occasionType: string;
  giftItem: string;
  driveDate?: string;
  sourceGroupId?: string;
  fromRunId?: string;
  defaultQuantity?: number;
  costPerGift?: number | null;
}) {
  const res = await post<{ drive: CourtesyDrive }>(GIFTS.DRIVES, input);
  return res.drive;
}

export async function updateDriveApi(id: string, patch: Partial<CourtesyDrive>) {
  const res = await patchJson<{ drive: CourtesyDrive }>(path(GIFTS.DRIVE_BY_ID, { id }), patch);
  return res.drive;
}

export async function cloneDriveApi(id: string, title?: string) {
  const res = await post<{ drive: CourtesyDrive }>(path(GIFTS.CLONE_DRIVE, { id }), {
    ...(title?.trim() ? { title: title.trim() } : {}),
  });
  return res.drive;
}

export async function archiveDriveApi(id: string) {
  const res = await post<{ drive: CourtesyDrive }>(path(GIFTS.ARCHIVE_DRIVE, { id }));
  return res.drive;
}

export async function unarchiveDriveApi(id: string) {
  const res = await post<{ drive: CourtesyDrive }>(path(GIFTS.UNARCHIVE_DRIVE, { id }));
  return res.drive;
}

export async function deleteDriveApi(id: string) {
  await del<{ message?: string }>(path(GIFTS.DRIVE_BY_ID, { id }));
}

export async function applyDriveDefaultsApi(
  id: string,
  input: { assigneeEmployeeId?: string; assigneeName?: string; mode: string },
) {
  const res = await post<{ drive: CourtesyDrive }>(path(GIFTS.APPLY_DEFAULTS, { id }), input);
  return res.drive;
}

export async function patchRecipientApi(
  driveId: string,
  recipientId: string,
  patch: Partial<CourtesyRecipient>,
) {
  const res = await patchJson<{ drive: CourtesyDrive }>(
    path(GIFTS.RECIPIENT_BY_ID, { id: driveId, recipientId }),
    patch,
  );
  return res.drive;
}

export async function bulkPatchRecipientsApi(
  driveId: string,
  recipientIds: string[],
  patch: Partial<CourtesyRecipient>,
) {
  const res = await post<{ drive: CourtesyDrive }>(path(GIFTS.BULK_RECIPIENTS, { id: driveId }), {
    recipientIds,
    patch,
  });
  return res.drive;
}

export async function addRunRecipientsApi(
  driveId: string,
  members: PersonRef[],
  defaultQuantity?: number,
) {
  const res = await post<{ drive: CourtesyDrive }>(path(GIFTS.ADD_RECIPIENTS, { id: driveId }), {
    members,
    defaultQuantity,
  });
  return res.drive;
}

export async function removeRunRecipientsApi(driveId: string, recipientIds: string[]) {
  const res = await post<{ drive: CourtesyDrive }>(
    path(GIFTS.REMOVE_RECIPIENTS, { id: driveId }),
    { recipientIds },
  );
  return res.drive;
}

type ConfigKindPath = "occasions" | "delivery-statuses" | "gift-run-statuses" | "delivery-modes";

export async function createConfigOptionApi(kind: ConfigKindPath, option: ConfigOption) {
  const res = await post<{ option: ConfigOption }>(path(GIFTS.CONFIG_KIND, { kind }), option);
  return res.option;
}

export async function updateConfigOptionApi(kind: ConfigKindPath, option: ConfigOption) {
  const res = await patchJson<{ option: ConfigOption }>(
    path(GIFTS.CONFIG_KIND_BY_SLUG, { kind, slug: option.id }),
    option,
  );
  return res.option;
}

export async function deleteConfigOptionApi(kind: ConfigKindPath, id: string) {
  await del(path(GIFTS.CONFIG_KIND_BY_SLUG, { kind, slug: id }));
}

export async function hydrateGiftsState() {
  const [config, groups, drives] = await Promise.all([
    fetchGiftsConfig(),
    fetchGroups(true),
    fetchDrives(true),
  ]);
  return { config, groups, drives, version: 2 };
}

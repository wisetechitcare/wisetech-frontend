import axios from "axios";
import { PROFORMA } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Proforma repository client — MANAGEMENT ONLY.
 *
 * There is deliberately no create/generate call here. A proforma is generated
 * from the Accounts Queue; a second door onto that would fork the one workflow
 * that decides what gets billed.
 */

export type VersionStatus =
  | "DRAFT" | "GENERATED" | "SENT" | "VIEWED"
  | "CLIENT_ACCEPTED" | "CLIENT_REJECTED" | "SUPERSEDED" | "ARCHIVED";

export interface ProformaVersion {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  statusLabel: string;
  isPublished: boolean;
  isCurrent: boolean;
  pdfUrl?: string | null;
  pdfGeneratedAt?: string | null;
  changeNote?: string | null;
  createdById: string;
  createdByName?: string | null;
  createdAt: string;
  archivedAt?: string | null;
  canDelete: boolean;
  /** Populated from the server's transition map — never hardcode this list. */
  allowedStatuses: { status: VersionStatus; label: string }[];
}

/** One node of the repository tree: a proforma and its revisions. */
export interface ProformaNode {
  id: string;
  documentNumber: string;
  kind: string;
  status: string;
  templateCode: string;
  billingRequestId?: string | null;
  billingRequestNumber?: string | null;
  leadId?: string | null;
  projectName?: string | null;
  clientName?: string | null;
  currency: string;
  subtotal: number | string;
  taxTotal: number | string;
  grandTotal: number | string;
  issueDate: string;
  versionCount: number;
  archivedAt?: string | null;
  createdById: string;
  createdByName?: string | null;
  createdAt: string;
  currentVersionId: string | null;
  currentVersionNumber: number | null;
  currentStatus: VersionStatus | null;
  currentStatusLabel: string | null;
  versions: ProformaVersion[];
}

export interface ProformaActivity {
  id: string;
  type: string;
  message: string;
  versionId?: string | null;
  metadata?: unknown;
  actorId?: string | null;
  actorName?: string | null;
  createdAt: string;
}

export interface TimelineStep {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming" | "failed";
  at?: string | null;
  detail?: string | null;
}

export interface FieldChange {
  field: string;
  label: string;
  kind: "added" | "removed" | "changed" | "unchanged";
  before: string | null;
  after: string | null;
  readOnly: boolean;
}

export interface VersionComparison {
  before: { id: string; versionNumber: number; status: VersionStatus; createdAt: string };
  after: { id: string; versionNumber: number; status: VersionStatus; createdAt: string };
  editable: FieldChange[];
  financial: FieldChange[];
  changedCount: number;
}

export interface ProformaDetail {
  document: ProformaNode;
  project: { id: string; name?: string | null; number?: string | null; startDate?: string | null; endDate?: string | null } | null;
  client: {
    id: string; companyName?: string | null; email?: string | null; phone?: string | null;
    gstNumber?: string | null; city?: string | null; state?: string | null; address?: string | null;
  } | null;
  /** The current version's stored HTML — what actually printed, never re-rendered. */
  preview: { id: string; versionNumber: number; html: string; status: VersionStatus } | null;
  financial: {
    subtotal: number; taxTotal: number; grandTotal: number; currency: string;
    contractValue: number | null; alreadyBilled: number | null; remainingContractValue: number | null;
  };
  activity: ProformaActivity[];
  emails: { id: string; toAddresses: string; subject: string; status: string; sentAt: string; error?: string | null }[];
  /** Filled by the Payment and Invoice modules; shape is here so the page won't change. */
  payment: unknown | null;
  invoice: unknown | null;
}

export interface ProformaListParams {
  search?: string;
  projectId?: string;
  clientId?: string;
  billingRequestId?: string;
  status?: VersionStatus | "";
  createdById?: string;
  createdFrom?: string;
  createdTo?: string;
  minVersions?: number;
  archived?: boolean;
  sortBy?: "createdAt" | "documentNumber" | "grandTotal" | "versionCount";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface Pagination {
  page: number; pageSize: number; total: number; pageCount: number;
}

const url = (path: string, params: Record<string, string> = {}) =>
  `${API_BASE_URL}/${Object.entries(params).reduce((p, [k, v]) => p.replace(`:${k}`, v), path)}`;

/** Blank values are dropped so an untouched select doesn't become `status=`. */
const clean = (params: ProformaListParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  );

export const listProformas = async (
  params: ProformaListParams = {},
): Promise<{ proformas: ProformaNode[]; pagination: Pagination }> => {
  const { data } = await axios.get(url(PROFORMA.LIST), { params: clean(params), withCredentials: true });
  return { proformas: data.proformas ?? [], pagination: data.pagination };
};

export const getProforma = async (id: string): Promise<ProformaDetail> => {
  const { data } = await axios.get(url(PROFORMA.GET_BY_ID, { id }), { withCredentials: true });
  return data;
};

export const getProformaVersions = async (id: string): Promise<ProformaVersion[]> => {
  const { data } = await axios.get(url(PROFORMA.VERSIONS, { id }), { withCredentials: true });
  return data.versions ?? [];
};

export const getProformaTimeline = async (id: string): Promise<TimelineStep[]> => {
  const { data } = await axios.get(url(PROFORMA.TIMELINE, { id }), { withCredentials: true });
  return data.timeline ?? [];
};

export const getProformaActivity = async (id: string): Promise<ProformaActivity[]> => {
  const { data } = await axios.get(url(PROFORMA.ACTIVITY, { id }), { withCredentials: true });
  return data.activity ?? [];
};

export const compareVersions = async (
  id: string, versionId: string, from?: string,
): Promise<VersionComparison> => {
  const { data } = await axios.get(url(PROFORMA.COMPARE, { id, versionId }), {
    params: from ? { from } : undefined,
    withCredentials: true,
  });
  return data;
};

export const getVersionPreview = async (
  id: string, versionId: string,
): Promise<{ id: string; versionNumber: number; html: string; status: VersionStatus }> => {
  const { data } = await axios.get(url(PROFORMA.PREVIEW, { id, versionId }), { withCredentials: true });
  return data.version;
};

export const createRevision = async (id: string, reason: string): Promise<ProformaDetail> => {
  const { data } = await axios.post(url(PROFORMA.REVISION, { id }), { reason }, { withCredentials: true });
  return data;
};

/** Download / print / share are one operation; the intent is what gets audited. */
export const accessProforma = async (
  id: string,
  intent: "DOWNLOAD" | "PRINT" | "SHARE",
  versionId?: string,
): Promise<{ versionId: string; url: string }> => {
  const { data } = await axios.post(
    url(PROFORMA.ACCESS, { id }), { intent, versionId }, { withCredentials: true },
  );
  return data;
};

/**
 * Download the Word export and trigger a browser save — built from the exact
 * same stored HTML as the PDF (see `htmlWordConverter.ts`), so it's a binary
 * stream, not a JSON link like `accessProforma`'s PDF path.
 */
export const downloadWord = async (id: string, versionId?: string): Promise<void> => {
  const response = await axios.get(url(PROFORMA.DOWNLOAD_WORD, { id }), {
    params: versionId ? { versionId } : undefined,
    withCredentials: true,
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const fileName = disposition?.match(/filename="(.+)"/)?.[1] ?? `${id}.doc`;

  const href = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(href);
};

export const setVersionStatus = async (
  id: string, versionId: string, status: VersionStatus,
): Promise<ProformaVersion> => {
  const { data } = await axios.patch(
    url(PROFORMA.VERSION_STATUS, { id, versionId }), { status }, { withCredentials: true },
  );
  return data.version;
};

export const duplicateProforma = async (id: string, billingRequestId: string) => {
  const { data } = await axios.post(
    url(PROFORMA.DUPLICATE, { id }), { billingRequestId }, { withCredentials: true },
  );
  return data.document as ProformaNode;
};

export const archiveProforma = async (id: string): Promise<ProformaDetail> => {
  const { data } = await axios.post(url(PROFORMA.ARCHIVE, { id }), {}, { withCredentials: true });
  return data;
};

export const restoreProforma = async (id: string): Promise<ProformaDetail> => {
  const { data } = await axios.post(url(PROFORMA.RESTORE, { id }), {}, { withCredentials: true });
  return data;
};

export const deleteVersion = async (id: string, versionId: string): Promise<void> => {
  await axios.delete(url(PROFORMA.DELETE_VERSION, { id, versionId }), { withCredentials: true });
};

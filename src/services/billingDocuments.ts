import axios from "axios";
import { BILLING_DOCUMENT } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Billing document repository — Proforma and Tax Invoice, by id. Management only:
 * a document is raised from a bill on the project's Billing tab (services/bills.ts).
 */

export type VersionStatus =
  | "DRAFT" | "GENERATED" | "SENT" | "VIEWED"
  | "CLIENT_ACCEPTED" | "CLIENT_REJECTED" | "SUPERSEDED" | "ARCHIVED";

export interface BillingDocumentVersion {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  statusLabel: string;
  /**
   * The Bill Stage code this status means for the document's kind (PROFORMA_SENT…). Render THIS, so the chip reads
   * Billing → Configure's wording and colour, as the Billing Tracker does. Null (superseded, archived): show `status`.
   */
  stageCode: string | null;
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
  allowedStatuses: { status: VersionStatus; label: string; stageCode: string | null }[];
}

export interface BillingDocumentNode {
  id: string;
  documentNumber: string;
  kind: string;
  status: string;
  templateCode: string;
  /** The template's own name ("MEP Proforma Invoice (Commercial)"), for the title bar. */
  templateName?: string | null;
  /** The bill (one stage, or a part of one) this document was raised for. */
  billNumber?: string | null;
  stageName?: string | null;
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
  /** See `BillingDocumentVersion.stageCode`. */
  currentStageCode: string | null;
  versions: BillingDocumentVersion[];
}

export interface BillingDocumentActivity {
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

export interface BillingDocumentDetail {
  document: BillingDocumentNode;
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
  activity: BillingDocumentActivity[];
  emails: { id: string; toAddresses: string; subject: string; status: string; sentAt: string; error?: string | null }[];
  /** Addresses the Send form offers: the billed company, then each Contact Person row's person, company and sub company. */
  recipients?: { email: string; name: string; kind: string; also?: string[] }[];
  /** The subject an untyped send goes out with — shown in the Send form as is. */
  emailDefaults?: { subject: string };
}

export type AccessIntent = "DOWNLOAD" | "PRINT" | "SHARE";

const url = (path: string, params: Record<string, string> = {}) =>
  `${API_BASE_URL}/${Object.entries(params).reduce((p, [k, v]) => p.replace(`:${k}`, v), path)}`;

export const getBillingDocument = async (id: string): Promise<BillingDocumentDetail> => {
  const { data } = await axios.get(url(BILLING_DOCUMENT.GET_BY_ID, { id }), { withCredentials: true });
  return data;
};

export const getBillingDocumentTimeline = async (id: string): Promise<TimelineStep[]> => {
  const { data } = await axios.get(url(BILLING_DOCUMENT.TIMELINE, { id }), { withCredentials: true });
  return data.timeline ?? [];
};

export const compareVersions = async (
  id: string, versionId: string, from?: string,
): Promise<VersionComparison> => {
  const { data } = await axios.get(url(BILLING_DOCUMENT.COMPARE, { id, versionId }), {
    params: from ? { from } : undefined,
    withCredentials: true,
  });
  return data;
};

export const getVersionPreview = async (
  id: string, versionId: string,
): Promise<{ id: string; versionNumber: number; html: string; status: VersionStatus }> => {
  const { data } = await axios.get(url(BILLING_DOCUMENT.PREVIEW, { id, versionId }), { withCredentials: true });
  return data.version;
};

export const createRevision = async (id: string, reason: string): Promise<BillingDocumentDetail> => {
  const { data } = await axios.post(url(BILLING_DOCUMENT.REVISION, { id }), { reason }, { withCredentials: true });
  return data;
};

/** Download / print / share are one operation; the intent is what gets audited. */
/**
 * The short share link for a code: this app's own address + `/s/<code>`. Built from the origin the app is open on, so
 * it is the live domain in production and localhost in development with no setting to keep in step.
 */
export const shareLinkFor = (code: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/?$/, "/")}s/${code}`;

/** The public endpoint that redirects straight to the PDF — the viewer's fallback. */
export const shareRedirectUrl = (code: string) =>
  `${API_BASE_URL}/api/public/share/${encodeURIComponent(code)}`;

export interface SharedDocumentInfo {
  documentNumber: string;
  title: string;
  /** Branding and summary, as the shared PDF prints them. Blank when the document has none. */
  companyName: string;
  companyLogoUrl: string;
  projectName: string;
  clientName: string;
  documentDate: string;
  totalDue: string;
  /** The document's own currency (ISO code) — the one its figures are in, not the viewer's. */
  currency: string;
  expiresAt: string;
  fileName: string;
  mode: "PREVIEW" | "DOWNLOAD";
  viewUrl: string;
  downloadUrl: string;
}

/** What the `/s/<code>` viewer shows. PUBLIC — no credentials; null when the link is unknown or expired. */
export const getSharedDocument = async (code: string): Promise<SharedDocumentInfo | null> => {
  try {
    const { data } = await axios.get(`${shareRedirectUrl(code)}/info`, { withCredentials: false });
    return data as SharedDocumentInfo;
  } catch {
    return null;
  }
};

export const accessDocument = async (
  id: string,
  intent: AccessIntent,
  versionId?: string,
  /**
   * SHARE: `url` opens the PDF in the browser; `downloadUrl` saves it. `previewCode` / `downloadCode` are the short
   * `/s/<code>` versions of the same two (see `shareLinkFor`). All last 7 days.
   */
): Promise<{ versionId: string; url: string; downloadUrl?: string; previewCode?: string; downloadCode?: string }> => {
  const { data } = await axios.post(
    url(BILLING_DOCUMENT.ACCESS, { id }), { intent, versionId }, { withCredentials: true },
  );
  return data;
};

/** Word export, built from the same stored HTML as the PDF; streamed as a file, then saved by the browser. */
export const downloadDocumentWord = async (id: string, versionId?: string): Promise<void> => {
  const response = await axios.get(url(BILLING_DOCUMENT.DOWNLOAD_WORD, { id }), {
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
): Promise<BillingDocumentVersion> => {
  const { data } = await axios.patch(
    url(BILLING_DOCUMENT.VERSION_STATUS, { id, versionId }), { status }, { withCredentials: true },
  );
  return data.version;
};

export const archiveBillingDocument = async (id: string): Promise<BillingDocumentDetail> => {
  const { data } = await axios.post(url(BILLING_DOCUMENT.ARCHIVE, { id }), {}, { withCredentials: true });
  return data;
};

export const restoreBillingDocument = async (id: string): Promise<BillingDocumentDetail> => {
  const { data } = await axios.post(url(BILLING_DOCUMENT.RESTORE, { id }), {}, { withCredentials: true });
  return data;
};

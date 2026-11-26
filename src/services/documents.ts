import axios from "axios";
import { DOCUMENT } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Document engine client — kind-agnostic.
 *
 * Proforma is a `kind`, not an endpoint, so Tax Invoice / Quotation / PO / Credit
 * Note / Debit Note / Receipt / Delivery Note reach the UI through this same file.
 *
 * NOTE: there is no client-side merge engine here on purpose. The server returns
 * already-rendered HTML; the editor patches only the `data-field` spans inside it.
 * A second implementation of the template would be a second thing to keep in sync
 * with the PDF, and that is exactly what "the preview must be identical" forbids.
 */

export type DocumentKind =
  | "PROFORMA" | "TAX_INVOICE" | "QUOTATION" | "PURCHASE_ORDER"
  | "CREDIT_NOTE" | "DEBIT_NOTE" | "PAYMENT_RECEIPT" | "DELIVERY_NOTE";

export type DocumentStatus = "DRAFT" | "PUBLISHED" | "SENT" | "CANCELLED";

/** The template's field contract. The left panel is BUILT from this, not hardcoded. */
export interface FieldPolicy {
  editable: string[];
  locked: string[];
  required: string[];
}

export interface GeneratedDocument {
  id: string;
  documentNumber: string;
  kind: DocumentKind;
  status: DocumentStatus;
  templateCode: string;
  templateVersion: number;
  subjectType: string;
  subjectId: string;
  leadId?: string | null;
  companyId?: string | null;
  currency: string;
  /** Which version the editor is showing. Absent on the list payload. */
  currentVersionId?: string | null;
  subtotal: number | string;
  taxTotal: number | string;
  grandTotal: number | string;
  issueDate: string;
  versionCount: number;
  publishedAt?: string | null;
  lastSentAt?: string | null;
  createdAt: string;
  template?: { id: string; code: string; name: string; variant: string; version: number };
}

export interface DocumentVersionSummary {
  id: string;
  versionNumber: number;
  isPublished: boolean;
  pdfUrl?: string | null;
  pdfGeneratedAt?: string | null;
  changeNote?: string | null;
  createdById: string;
  createdAt: string;
}

export interface DocumentEmailEntry {
  id: string;
  toAddresses: string;
  ccAddresses?: string | null;
  subject: string;
  status: string;
  error?: string | null;
  sentAt: string;
}

/** Everything the editor needs: the document, its rendered HTML, and the contract. */
export interface DocumentPayload {
  document: GeneratedDocument;
  version: DocumentVersionSummary & { html: string; mergeData: Record<string, unknown> };
  policy: FieldPolicy;
  html: string;
  editable: Record<string, string>;
  isEditable: boolean;
  /** Page-layout script shared with the server's PDF renderer — see DocumentSheet. */
  paginator?: string;
}

const url = (path: string, id?: string) =>
  `${API_BASE_URL}/${id ? path.replace(":id", id) : path}`;

export const openDocument = async (input: {
  kind: DocumentKind;
  subjectId: string;
  subjectType?: string;
  templateCode?: string;
}): Promise<DocumentPayload> => {
  const { data } = await axios.post(url(DOCUMENT.OPEN), input, { withCredentials: true });
  return data;
};

export const getDocument = async (id: string): Promise<DocumentPayload> => {
  const { data } = await axios.get(url(DOCUMENT.GET_BY_ID, id), { withCredentials: true });
  return data;
};

/** Persist the editable half. Locked keys sent here are discarded server-side. */
export const saveDocumentDraft = async (
  id: string,
  editable: Record<string, string>,
): Promise<DocumentPayload> => {
  const { data } = await axios.patch(url(DOCUMENT.SAVE_DRAFT, id), { editable }, { withCredentials: true });
  return data;
};

/** Re-pull a draft's record-derived fields (bank, Bill To, SAC…) from the ERP. */
export const refreshDocumentDraft = async (id: string): Promise<DocumentPayload> => {
  const { data } = await axios.post(url(DOCUMENT.REFRESH, id), {}, { withCredentials: true });
  return data;
};

/**
 * The page as it would read after saving, without saving. The editor calls this while a bill amount is being typed,
 * so the fee schedule, GST and totals follow the amount live. Refused (with the reason) when the bill cannot take it.
 */
export const previewDocumentDraft = async (id: string, editable: Record<string, string>): Promise<{ html: string; connected: Record<string, string> }> => {
  const { data } = await axios.post(url(DOCUMENT.PREVIEW, id), { editable }, { withCredentials: true });
  return data;
};

export const publishDocument = async (id: string, changeNote?: string): Promise<DocumentPayload> => {
  const { data } = await axios.post(url(DOCUMENT.PUBLISH, id), { changeNote }, { withCredentials: true });
  return data;
};

export const reviseDocument = async (id: string, reason: string): Promise<DocumentPayload> => {
  const { data } = await axios.post(url(DOCUMENT.REVISE, id), { reason }, { withCredentials: true });
  return data;
};

/** Returns a short-lived presigned link — documents are stored privately. */
export const generateDocumentPdf = async (
  id: string,
  versionId?: string,
  size?: PaperSize,
): Promise<{ versionId: string; url: string; regenerated: boolean }> => {
  const { data } = await axios.post(url(DOCUMENT.PDF, id), {}, {
    params: { ...(versionId ? { versionId } : {}), ...(size ? { size } : {}) },
    withCredentials: true,
  });
  return data;
};

/**
 * Paper sizes a document can be previewed and printed on. Mirrors the server's
 * `services/documents/paper.ts` — the keys are the wire values and the CSS class
 * suffix (`paper-<key>`); `px` is the page width at 96 dpi, for fit-to-width.
 */
export const PAPER_SIZES = [
  { key: "a4", label: "A4", px: 794 },
  { key: "a5", label: "A5", px: 559 },
  { key: "letter", label: "Letter", px: 816 },
  { key: "legal", label: "Legal", px: 816 },
  { key: "thermal80", label: "Thermal 80mm", px: 302 },
] as const;

export type PaperSize = (typeof PAPER_SIZES)[number]["key"];

export const getDocumentVersions = async (id: string): Promise<DocumentVersionSummary[]> => {
  const { data } = await axios.get(url(DOCUMENT.VERSIONS, id), { withCredentials: true });
  return data.versions ?? [];
};

export const getDocumentEmails = async (id: string): Promise<DocumentEmailEntry[]> => {
  const { data } = await axios.get(url(DOCUMENT.EMAILS, id), { withCredentials: true });
  return data.emails ?? [];
};

export const emailDocument = async (
  id: string,
  input: { to: string; cc?: string; subject?: string; body?: string },
): Promise<DocumentEmailEntry> => {
  const { data } = await axios.post(url(DOCUMENT.SEND_EMAIL, id), input, { withCredentials: true });
  return data.log;
};

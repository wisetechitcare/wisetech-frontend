import axios from "axios";
import { PAYMENT } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Payment Collection client — the finance team's workspace.
 *
 * NO INVOICE CALL EXISTS HERE. `readyForInvoice` is on every payload so the next
 * phase can filter on it; generating one is entirely out of this module.
 */

export type ClientPaymentMethod =
  | "CASH" | "CHEQUE" | "NEFT" | "RTGS" | "IMPS" | "UPI" | "BANK_TRANSFER" | "ONLINE" | "OTHER";

export type PaymentTransactionStatus = "RECORDED" | "VERIFIED" | "REJECTED" | "CANCELLED";
export type PaymentVerificationStatus = "NOT_VERIFIED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
export type PaymentStatus = "PENDING" | "PARTIALLY_PAID" | "FULLY_PAID" | "OVERPAID" | "CANCELLED";
export type AttachmentKind =
  | "BANK_RECEIPT" | "UTR_SCREENSHOT" | "CHEQUE_SCAN" | "DEPOSIT_SLIP" | "PAYMENT_ADVICE" | "SUPPORTING_DOCUMENT";

export interface DueInfo {
  state: "NONE" | "UPCOMING" | "DUE_TODAY" | "OVERDUE" | "SETTLED";
  daysRemaining: number | null;
  daysOverdue: number | null;
}

/** One row of the payment list — a billing operation viewed through the payment lens. */
export interface PaymentListItem {
  id: string;
  operationNumber: string;
  requestNumber: string;
  proformaNumber?: string | null;
  leadId?: string | null;
  companyId?: string | null;
  projectName?: string | null;
  clientName?: string | null;
  projectManagerName?: string | null;
  status: string;
  workflowStatusLabel: string;
  verificationStatus: PaymentVerificationStatus;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  totalAmount: number | string;
  collectedAmount: number | string;
  outstandingAmount: number | string;
  collectionPercentage: number;
  dueDate?: string | null;
  due: DueInfo;
  lastPaymentAt?: string | null;
  paymentAge: number | null;
  collectionDays: number | null;
  readyForInvoice: boolean;
  invoiceNumber: string | null;
  _count?: { transactions: number; attachments: number };
}

export interface PaymentStatistics {
  pendingPayments: number;
  partialPayments: number;
  fullyPaid: number;
  awaitingVerification: number;
  overduePayments: number;
  readyForInvoice: number;
  collectedToday: number;
  collectedThisMonth: number;
  outstandingAmount: number;
  totalCollections: number;
  billedAmount: number;
  averageCollectionDays: number | null;
}

export interface PaymentTransaction {
  id: string;
  paymentNumber: string;
  operationId: string;
  amount: number | string;
  paymentDate: string;
  method: ClientPaymentMethod;
  bankName?: string | null;
  referenceNumber?: string | null;
  transactionNumber?: string | null;
  utrNumber?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  receivedById?: string | null;
  receivedByName?: string | null;
  recordedById: string;
  recordedByName?: string | null;
  remarks?: string | null;
  status: PaymentTransactionStatus;
  isOverpayment: boolean;
  verifiedAt?: string | null;
  verifiedById?: string | null;
  verifiedByName?: string | null;
  verificationNote?: string | null;
  countsTowardCollection: boolean;
  createdAt: string;
}

export interface PaymentAttachment {
  id: string;
  operationId: string;
  transactionId?: string | null;
  kind: AttachmentKind;
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  note?: string | null;
  uploadedById: string;
  createdAt: string;
}

export interface TimelineStep {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming" | "failed";
  at?: string | null;
  detail?: string | null;
}

export interface PaymentDetail {
  collection: PaymentListItem;
  project: { id: string; name?: string | null; number?: string | null } | null;
  client: {
    id: string; companyName?: string | null; email?: string | null; phone?: string | null;
    gstNumber?: string | null; city?: string | null; state?: string | null;
  } | null;
  billingRequest: { id: string; requestNumber: string; status: string } | null;
  proforma: { id: string; documentNumber: string; grandTotal: number | string; status: string } | null;
  transactions: PaymentTransaction[];
  attachments: PaymentAttachment[];
  financial: {
    contractValue: number | null;
    billingRequestAmount: number;
    proformaAmount: number;
    taxAmount: number;
    totalAmount: number;
    collectedAmount: number;
    outstandingAmount: number;
    collectionPercentage: number;
    alreadyBilled: number | null;
    remainingContractValue: number | null;
  };
  timeline: TimelineStep[];
  pendingNotifications: string[];
  readyForInvoice: boolean;
  invoice: unknown | null;
}

export interface PaymentListParams {
  search?: string;
  projectId?: string;
  clientId?: string;
  paymentStatus?: PaymentStatus | "";
  verificationStatus?: PaymentVerificationStatus | "";
  method?: ClientPaymentMethod | "";
  receivedById?: string;
  dueState?: "DUE_TODAY" | "OVERDUE" | "UPCOMING" | "";
  paidFrom?: string;
  paidTo?: string;
  readyForInvoice?: boolean;
  sortBy?: "lastPaymentAt" | "dueDate" | "outstandingAmount" | "collectedAmount" | "operationNumber";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface Pagination { page: number; pageSize: number; total: number; pageCount: number; }

const url = (path: string, params: Record<string, string> = {}) =>
  `${API_BASE_URL}/${Object.entries(params).reduce((p, [k, v]) => p.replace(`:${k}`, v), path)}`;

const clean = (params: PaymentListParams) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export const listPayments = async (
  params: PaymentListParams = {},
): Promise<{ payments: PaymentListItem[]; pagination: Pagination }> => {
  const { data } = await axios.get(url(PAYMENT.LIST), { params: clean(params), withCredentials: true });
  return { payments: data.payments ?? [], pagination: data.pagination };
};

export const getPaymentStatistics = async (): Promise<PaymentStatistics> => {
  const { data } = await axios.get(url(PAYMENT.STATISTICS), { withCredentials: true });
  return data.statistics;
};

export const getPayment = async (id: string): Promise<PaymentDetail> => {
  const { data } = await axios.get(url(PAYMENT.GET_BY_ID, { id }), { withCredentials: true });
  return data;
};

export const getPaymentHistory = async (id: string): Promise<PaymentTransaction[]> => {
  const { data } = await axios.get(url(PAYMENT.HISTORY, { id }), { withCredentials: true });
  return data.transactions ?? [];
};

export interface RecordPaymentInput {
  amount: number;
  paymentDate: string;
  method: ClientPaymentMethod;
  bankName?: string;
  referenceNumber?: string;
  transactionNumber?: string;
  utrNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  receivedById?: string;
  remarks?: string;
  allowOverpayment?: boolean;
}

export const recordPayment = async (
  id: string, input: RecordPaymentInput,
): Promise<{ transaction: PaymentTransaction; totals: unknown }> => {
  const { data } = await axios.post(url(PAYMENT.RECORD, { id }), input, { withCredentials: true });
  return data;
};

export const updatePayment = async (
  id: string, transactionId: string, input: Partial<RecordPaymentInput>,
): Promise<{ transaction: PaymentTransaction; totals: unknown }> => {
  const { data } = await axios.patch(
    url(PAYMENT.UPDATE_TRANSACTION, { id, transactionId }), input, { withCredentials: true },
  );
  return data;
};

export const verifyPayment = async (
  id: string, transactionId: string, decision: "VERIFIED" | "REJECTED" | "CANCELLED", note?: string,
): Promise<{ transaction: PaymentTransaction; totals: unknown }> => {
  const { data } = await axios.post(
    url(PAYMENT.VERIFY, { id }), { transactionId, decision, note }, { withCredentials: true },
  );
  return data;
};

export const setCollectionVerification = async (
  id: string, status: "UNDER_REVIEW" | "REJECTED", note: string,
) => {
  const { data } = await axios.patch(
    url(PAYMENT.SET_VERIFICATION, { id }), { status, note }, { withCredentials: true },
  );
  return data.operation as PaymentListItem;
};

export const uploadAttachments = async (
  id: string, files: File[], meta: { kind?: AttachmentKind; transactionId?: string; note?: string } = {},
): Promise<PaymentAttachment[]> => {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  if (meta.kind) form.append("kind", meta.kind);
  if (meta.transactionId) form.append("transactionId", meta.transactionId);
  if (meta.note) form.append("note", meta.note);
  const { data } = await axios.post(url(PAYMENT.ADD_ATTACHMENT, { id }), form, {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.attachments ?? [];
};

export const getAttachmentLink = async (id: string, attachmentId: string): Promise<string> => {
  const { data } = await axios.get(url(PAYMENT.GET_ATTACHMENT, { id, attachmentId }), { withCredentials: true });
  return data.url;
};

export const deleteAttachment = async (id: string, attachmentId: string): Promise<void> => {
  await axios.delete(url(PAYMENT.DELETE_ATTACHMENT, { id, attachmentId }), { withCredentials: true });
};

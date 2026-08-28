import axios from "axios";
import { BILLING_OPERATION } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Billing Operations client — the Accounts workspace.
 *
 * There is exactly one write call here (`updateOperationStatus`) plus notes.
 * Project, client and billing-request data are read-only through this module by
 * design: it monitors the financial lifecycle, it does not own those records.
 */

export type BillingOperationStatus =
  | "READY_FOR_PROFORMA" | "PROFORMA_DRAFT" | "PROFORMA_GENERATED" | "PROFORMA_SENT"
  | "CLIENT_VIEWED" | "PAYMENT_PENDING" | "PARTIALLY_PAID" | "FULLY_PAID"
  | "PAYMENT_VERIFIED" | "READY_FOR_INVOICE" | "INVOICE_GENERATED" | "INVOICE_SENT"
  | "COMPLETED" | "CANCELLED" | "ON_HOLD";

export type BillingOperationStage = "PROFORMA" | "PAYMENT" | "INVOICE" | "CLOSED";

export type DueState = "NONE" | "UPCOMING" | "DUE_TODAY" | "OVERDUE" | "SETTLED";

export interface DueInfo {
  state: DueState;
  daysRemaining: number | null;
  daysOverdue: number | null;
}

export interface BillingOperation {
  id: string;
  operationNumber: string;
  billingRequestId: string;
  requestNumber: string;
  leadId?: string | null;
  companyId?: string | null;
  projectManagerId?: string | null;
  status: BillingOperationStatus;
  stage: BillingOperationStage;
  heldFromStatus?: BillingOperationStatus | null;
  holdReason?: string | null;
  cancelReason?: string | null;
  currency: string;
  requestAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  collectedAmount: number | string;
  outstandingAmount: number | string;
  issueDate?: string | null;
  expectedPaymentDate?: string | null;
  dueDate?: string | null;
  paymentTermsDays: number;
  approvedAt?: string | null;
  proformaDocumentId?: string | null;
  invoiceDocumentId?: string | null;
  lastActivityAt: string;
  createdAt: string;
  /** Server-decorated — never stored, so it cannot go stale. */
  projectName?: string | null;
  clientName?: string | null;
  projectManagerName?: string | null;
  statusLabel: string;
  due: DueInfo;
  /** What this operation may legally move to right now, from the server's map. */
  allowedTransitions: { status: BillingOperationStatus; label: string }[];
}

export interface OperationStatistics {
  readyForProforma: number;
  pendingClientResponse: number;
  pendingPayments: number;
  partialPayments: number;
  overduePayments: number;
  readyForInvoice: number;
  completed: number;
  onHold: number;
  outstandingAmount: number;
  collectedAmount: number;
  billedAmount: number;
}

export interface OperationTimelineStep {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming" | "failed";
  at?: string | null;
  detail?: string | null;
}

export interface OperationEvent {
  id: string;
  type: string;
  fromStatus?: BillingOperationStatus | null;
  toStatus?: BillingOperationStatus | null;
  message: string;
  metadata?: unknown;
  actorId?: string | null;
  actorName?: string | null;
  createdAt: string;
}

export interface OperationDocument {
  kind: string;
  label: string;
  documentNumber: string | null;
  status: string;
  createdById: string | null;
  createdAt: string | null;
  documentId: string | null;
  available: boolean;
}

export interface OperationNote {
  id: string;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  authorId: string;
  createdAt: string;
}

export interface OperationFinancial {
  contractValue: number;
  billingRequestAmount: number;
  taxAmount: number;
  totalAmount: number;
  alreadyBilled: number;
  collectedAmount: number;
  outstandingAmount: number;
  remainingContractValue: number;
}

export interface OperationDetail {
  operation: BillingOperation;
  project: { id: string; name?: string | null; number?: string | null; startDate?: string | null; endDate?: string | null } | null;
  client: { id: string; companyName?: string | null; email?: string | null; phone?: string | null; gstNumber?: string | null; city?: string | null; state?: string | null } | null;
  billingRequest: unknown;
  financial: OperationFinancial;
  workflowTimeline: OperationTimelineStep[];
  documents: OperationDocument[];
  notes: OperationNote[];
  /** What WOULD be notified. Nothing is sent yet. */
  pendingNotifications: string[];
}

export interface OperationListParams {
  search?: string;
  projectId?: string;
  clientId?: string;
  projectManagerId?: string;
  status?: BillingOperationStatus | "";
  stage?: BillingOperationStage | "";
  dueState?: "UPCOMING" | "DUE_TODAY" | "OVERDUE" | "";
  approvedFrom?: string;
  approvedTo?: string;
  dueFrom?: string;
  dueTo?: string;
  minAmount?: number;
  maxAmount?: number;
  requestNumber?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

const url = (path: string, id?: string) =>
  `${API_BASE_URL}/${id ? path.replace(":id", id) : path}`;

/** Blank filter values are dropped so an empty select doesn't become `status=`. */
const clean = (params: OperationListParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null),
  );

export const listBillingOperations = async (
  params: OperationListParams = {},
): Promise<{ operations: BillingOperation[]; pagination: Pagination }> => {
  const { data } = await axios.get(url(BILLING_OPERATION.LIST), {
    params: clean(params),
    withCredentials: true,
  });
  return { operations: data.operations ?? [], pagination: data.pagination };
};

export const getBillingOperationStatistics = async (): Promise<OperationStatistics> => {
  const { data } = await axios.get(url(BILLING_OPERATION.STATISTICS), { withCredentials: true });
  return data.statistics;
};

export const getBillingOperation = async (id: string): Promise<OperationDetail> => {
  const { data } = await axios.get(url(BILLING_OPERATION.GET_BY_ID, id), { withCredentials: true });
  return data;
};

export const updateOperationStatus = async (
  id: string,
  input: { status: BillingOperationStatus; reason?: string; note?: string },
): Promise<BillingOperation> => {
  const { data } = await axios.patch(url(BILLING_OPERATION.UPDATE_STATUS, id), input, {
    withCredentials: true,
  });
  return data.operation;
};

export const getOperationTimeline = async (id: string): Promise<OperationTimelineStep[]> => {
  const { data } = await axios.get(url(BILLING_OPERATION.TIMELINE, id), { withCredentials: true });
  return data.timeline ?? [];
};

export const getOperationActivity = async (id: string): Promise<OperationEvent[]> => {
  const { data } = await axios.get(url(BILLING_OPERATION.ACTIVITY, id), { withCredentials: true });
  return data.activity ?? [];
};

export const getOperationDocuments = async (id: string): Promise<OperationDocument[]> => {
  const { data } = await axios.get(url(BILLING_OPERATION.DOCUMENTS, id), { withCredentials: true });
  return data.documents ?? [];
};

export const addOperationNote = async (
  id: string,
  input: { body: string; attachmentUrl?: string; attachmentName?: string },
): Promise<OperationNote> => {
  const { data } = await axios.post(url(BILLING_OPERATION.ADD_NOTE, id), input, {
    withCredentials: true,
  });
  return data.note;
};

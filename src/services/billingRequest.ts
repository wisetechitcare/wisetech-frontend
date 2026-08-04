import axios from "axios";
import { BILLING_REQUEST } from "@constants/api-endpoint";
import type { ProjectDeliverable, DeliverablePriority } from "@services/projectExecution";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Billing Request client.
 *
 * There are deliberately NO approve / reject / send-back calls here — a billing request is
 * decided through the existing approval services and Approval Inbox, exactly like leave or
 * reimbursement. Duplicating them would fork the approval system.
 */

export type BillingRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT_TO_ACCOUNTS"
  | "PROFORMA_GENERATED";

/** A frozen copy of a deliverable as it was when billing was requested. Never re-read
 *  from the live deliverable — that is the point of the snapshot. */
export interface BillingRequestItem {
  id: string;
  billingRequestId: string;
  projectDeliverableId: string;
  name: string;
  description?: string | null;
  stageName: string;
  percentage: number | string;
  calculatedAmount: number | string;
  category?: string | null;
  priority: DeliverablePriority;
  sortOrder: number;
}

export interface BillingRequest {
  id: string;
  requestNumber: string;
  leadId: string;
  projectStageId: string;
  status: BillingRequestStatus;
  stageName: string;
  stageAmount: number | string;
  totalPercentage: number | string;
  totalAmount: number | string;
  remarks?: string | null;
  requestedById: string;
  requestedByName?: string | null;
  requestedAt?: string | null;
  approvalInstanceId?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  sentToAccountsAt?: string | null;
  proformaId?: string | null;
  proformaGeneratedAt?: string | null;
  createdAt: string;
  items: BillingRequestItem[];
  lead?: {
    id: string;
    prefix?: string | null;
    title?: string | null;
    originalProjectPrefix?: string | null;
    company?: { id: string; companyName?: string | null } | null;
  } | null;
  /** Approval timeline straight from the existing framework — not a parallel copy. */
  approval?: unknown;
}

export type BlockedReason = "NOT_COMPLETED" | "NOT_BILLABLE" | "ALREADY_REQUESTED";

/** A candidate row plus the live deliverable it refers to. `blocked` entries carry why. */
export interface BillableCandidate {
  id: string;
  name: string;
  status: string;
  isBillable: boolean;
  reason?: BlockedReason;
  message?: string;
  deliverable?: ProjectDeliverable;
}

export interface BillingRequestPayload {
  projectStageId?: string;
  deliverableIds?: string[];
  remarks?: string | null;
}

/** Selectable + blocked deliverables. Blocked rows are shown greyed WITH the reason —
 *  hiding them silently reads as data loss. */
export const getBillableDeliverables = async (
  stageId: string,
  excludeRequestId?: string,
): Promise<{ selectable: BillableCandidate[]; blocked: BillableCandidate[] }> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.BILLABLE_DELIVERABLES.replace(":stageId", stageId)}`;
  const { data } = await axios.get(endpoint, {
    params: excludeRequestId ? { excludeRequestId } : undefined,
  });
  return { selectable: data?.selectable ?? [], blocked: data?.blocked ?? [] };
};

export const listBillingRequests = async (params: {
  projectId?: string;
  stageId?: string;
  status?: BillingRequestStatus;
} = {}): Promise<BillingRequest[]> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.LIST}`;
  const { data } = await axios.get(endpoint, { params });
  return data?.billingRequests ?? [];
};

export const getBillingRequest = async (id: string): Promise<BillingRequest> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.GET_BY_ID.replace(":id", id)}`;
  const { data } = await axios.get(endpoint);
  return data?.billingRequest;
};

export const createBillingRequest = async (payload: BillingRequestPayload): Promise<BillingRequest> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.CREATE}`;
  const { data } = await axios.post(endpoint, payload);
  return data?.billingRequest;
};

export const updateBillingRequest = async (
  id: string,
  payload: BillingRequestPayload,
): Promise<BillingRequest> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.UPDATE.replace(":id", id)}`;
  const { data } = await axios.patch(endpoint, payload);
  return data?.billingRequest;
};

export const deleteBillingRequest = async (id: string) => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.DELETE.replace(":id", id)}`;
  const { data } = await axios.delete(endpoint);
  return data;
};

/** Hands the request to the configured approval chain. Fails clearly if none is set up. */
export const submitBillingRequest = async (id: string): Promise<BillingRequest> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.SUBMIT.replace(":id", id)}`;
  const { data } = await axios.post(endpoint);
  return data?.billingRequest;
};

/** Approved requests with no proforma yet — the only thing Accounts ever sees. */
export const getAccountsBillingQueue = async (): Promise<BillingRequest[]> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.ACCOUNTS_QUEUE}`;
  const { data } = await axios.get(endpoint);
  return data?.billingRequests ?? [];
};

export const generateProforma = async (id: string, proformaId?: string | null) => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.GENERATE_PROFORMA.replace(":id", id)}`;
  const { data } = await axios.post(endpoint, { proformaId: proformaId ?? null });
  return data?.billingRequest as BillingRequest;
};

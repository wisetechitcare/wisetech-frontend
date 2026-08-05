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
  | "CANCELLED"
  | "READY_FOR_PROFORMA"
  /** Deprecated alias for READY_FOR_PROFORMA, still held by older rows. */
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
  /** Null when the request spans several stages — each item carries its own stage. */
  projectStageId?: string | null;
  status: BillingRequestStatus;
  stageName?: string | null;
  stageAmount: number | string;
  totalPercentage: number | string;
  totalAmount: number | string;
  remarks?: string | null;
  requestedById: string;
  requestedByName?: string | null;
  projectManagerId?: string | null;
  cancelledAt?: string | null;
  requestedAt?: string | null;
  approvalInstanceId?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  sentToAccountsAt?: string | null;
  proformaId?: string | null;
  proformaGeneratedAt?: string | null;
  createdAt: string;
  /** Server-computed: true only while NO approver has acted. The rule lives on the
   *  server, so never re-derive this from `status` — a PENDING_APPROVAL request nobody
   *  has touched is still withdrawable. */
  canDelete?: boolean;
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
  /** Preferred — a request may span several stages of one project. */
  projectId?: string;
  /** Single-stage entry point (the project's Billing tab). */
  projectStageId?: string;
  deliverableIds?: string[];
  remarks?: string | null;
}

/** One entry in a request's own activity trail. Approver decisions come from the approval
 *  framework separately — this never duplicates them. */
export interface BillingRequestActivity {
  id: string;
  type: string;
  message: string;
  actorId?: string | null;
  actorName?: string | null;
  createdAt: string;
}

/**
 * Selectable + blocked deliverables. Blocked rows are shown greyed WITH the reason —
 * hiding them silently reads as data loss.
 *
 * Scope by `projectId` to build a multi-stage request, or by `stageId` for a single one.
 */
export const getBillableDeliverables = async (
  scope: { projectId?: string; stageId?: string },
  excludeRequestId?: string,
): Promise<{ selectable: BillableCandidate[]; blocked: BillableCandidate[] }> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.BILLABLE_DELIVERABLES}`;
  const { data } = await axios.get(endpoint, {
    params: { ...scope, ...(excludeRequestId ? { excludeRequestId } : {}) },
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

/** Cancel — keeps the record and its history, unlike delete. Blocked once an approver
 *  has acted, same gate as delete. */
export const cancelBillingRequest = async (id: string): Promise<BillingRequest> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.CANCEL.replace(":id", id)}`;
  const { data } = await axios.post(endpoint);
  return data?.billingRequest;
};

/** Copy into a fresh draft. Deliverables billed elsewhere since are skipped, and the
 *  count comes back so the caller can say so. */
export const duplicateBillingRequest = async (
  id: string,
): Promise<{ billingRequest: BillingRequest; skipped: number }> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.DUPLICATE.replace(":id", id)}`;
  const { data } = await axios.post(endpoint);
  return { billingRequest: data?.billingRequest, skipped: data?.skipped ?? 0 };
};

/** The request's own activity trail, oldest first. */
export const getBillingRequestHistory = async (id: string): Promise<BillingRequestActivity[]> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.HISTORY.replace(":id", id)}`;
  const { data } = await axios.get(endpoint);
  return data?.history ?? [];
};

/** A project with at least one completed, billable, unclaimed deliverable. */
export interface BillableProject {
  id: string;
  title?: string | null;
  prefix?: string | null;
  originalProjectPrefix?: string | null;
  clientName?: string | null;
  billableCount: number;
}

/** Projects the user can actually raise a request against — not every project. */
export const getBillableProjects = async (): Promise<BillableProject[]> => {
  const endpoint = `${API_BASE_URL}/${BILLING_REQUEST.BILLABLE_PROJECTS}`;
  const { data } = await axios.get(endpoint);
  return data?.projects ?? [];
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

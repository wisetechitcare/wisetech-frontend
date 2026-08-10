import axios from "axios";
import { PROJECT_BILLING } from "@constants/api-endpoint";
import type { BillingRequest } from "./billingRequest";
import type { ProformaNode } from "./proformas";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Project Financial Workspace client — READ ONLY.
 *
 * One call returns everything Project → Billing renders. There is deliberately no
 * write function here: every action the workspace offers navigates into the
 * Billing module and posts to that module's own endpoint, so the rules governing
 * a write live in exactly one place.
 */

export type WorkflowKey =
  | "REQUEST" | "APPROVAL" | "ACCOUNTS" | "PROFORMA" | "PAYMENT" | "INVOICE" | "COMPLETED";

/** Every figure is computed by the module that owns it — this is a read model. */
export interface ProjectFinancials {
  contractValue: number;
  approvedBilling: number;
  requestedTotal: number;
  remainingContractValue: number;
  proformaValue: number;
  invoiceValue: number;
  invoiceTaxable: number;
  gstAmount: number;
  collected: number;
  outstanding: number;
  operationTotal: number;
  collectionPercentage: number;
  requestCount: number;
  currency: string;
}

export interface WorkflowProgress {
  steps: { key: WorkflowKey; label: string }[];
  currentStep: WorkflowKey;
  perRequest: { requestId: string; requestNumber: string; step: WorkflowKey }[];
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export interface WorkspaceActivity {
  id: string;
  source: "REQUEST" | "OPERATION" | "DOCUMENT";
  sourceId: string;
  type: string;
  message: string;
  actorName?: string | null;
  createdAt: string;
}

/** A billing operation seen through the payment lens — the row `listPayments` returns. */
export interface WorkspacePayment {
  id: string;
  operationNumber: string;
  billingRequestId: string;
  billingRequestNumber?: string | null;
  proformaDocumentId?: string | null;
  proformaNumber?: string | null;
  invoiceDocumentId?: string | null;
  invoiceNumber?: string | null;
  totalAmount: number | string;
  collectedAmount: number | string;
  outstandingAmount: number | string;
  paymentStatus: string;
  paymentStatusLabel: string;
  verificationStatus: string;
  collectionPercentage: number;
  readyForInvoice: boolean;
  lastPaymentAt?: string | null;
  dueDate?: string | null;
  status: string;
  statusLabel?: string;
}

export interface WorkspaceOperation {
  id: string;
  operationNumber: string;
  billingRequestId: string;
  status: string;
  statusLabel: string;
  stage: string;
  proformaDocumentId?: string | null;
  invoiceDocumentId?: string | null;
  totalAmount: number | string;
  collectedAmount: number | string;
  outstandingAmount: number | string;
}

/** What the CALLER may do. Distinct from `readiness`, which is what the DATA permits. */
export interface WorkspaceCapabilities {
  canRaiseRequest: boolean;
  canGenerate: boolean;
  canRecordPayment: boolean;
  canApprove: boolean;
}

/** What the WORK is ready for. Mirrors the gate each owning module enforces on write. */
export interface WorkspaceReadiness {
  canGenerateProforma: boolean;
  canRecordPayment: boolean;
  canGenerateInvoice: boolean;
  hasBilling: boolean;
}

export interface ProjectBillingWorkspaceData {
  project: { id: string; name?: string | null; number?: string | null };
  client: { id: string; name?: string | null; gstNumber?: string | null } | null;
  financial: ProjectFinancials;
  workflow: WorkflowProgress;
  requests: BillingRequest[];
  operations: WorkspaceOperation[];
  payments: WorkspacePayment[];
  proformas: ProformaNode[];
  invoices: ProformaNode[];
  activity: WorkspaceActivity[];
  readiness: WorkspaceReadiness;
  capabilities: WorkspaceCapabilities;
}

const url = (path: string, params: Record<string, string> = {}) =>
  `${API_BASE_URL}/${Object.entries(params).reduce((p, [k, v]) => p.replace(`:${k}`, v), path)}`;

export const getProjectBillingWorkspace = async (
  projectId: string,
): Promise<ProjectBillingWorkspaceData> => {
  const { data } = await axios.get(url(PROJECT_BILLING.WORKSPACE, { projectId }), {
    withCredentials: true,
  });
  return data;
};

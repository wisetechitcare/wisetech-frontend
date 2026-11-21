import axios from "axios";
import { BILLING_TRACKER } from "@constants/api-endpoint";
import type { BillSettlement } from "./bills";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * The billing trackers and the dashboard — every one a read over bills and payments, plus the Billing Tracker's
 * one write (its hand-set columns on a project). Mirrors the backend's handlers/billingTrackers.ts.
 */

const url = (path: string) => `${API_BASE_URL}/${path}`;

/** Blank filter values are dropped so an empty select doesn't become `status=`. */
const clean = <T extends object>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null),
  );

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

// ─── Billing Tracker ─────────────────────────────────────────────────────────

/**
 * The Billing Tracker's Bill Stage — set automatically: Bill Stage codes by the project's proformas / tax invoices,
 * Bill Payment Status codes by its receipts. Mirrors `TRACKER_STATUSES` in the backend's trackerStatus.ts.
 */
export type TrackerStatus =
  | "READY_FOR_PROFORMA" | "PROFORMA_DRAFT" | "PROFORMA_GENERATED" | "PROFORMA_SENT"
  | "PROFORMA_REJECTED"
  // Bill Payment Status's codes — what a recorded receipt sets it to.
  | "PENDING" | "PARTIALLY_PAID" | "FULLY_PAID"
  | "READY_FOR_INVOICE" | "INVOICE_DRAFT" | "INVOICE_GENERATED" | "INVOICE_SENT"
  | "INVOICE_REJECTED"
  | "COMPLETED" | "ON_HOLD";

/** The band a project sits in. Mirrors `TRACKER_STAGES`. */
type TrackerStage = "PROFORMA" | "PAYMENT" | "INVOICE" | "CLOSED";

export type PaymentStatus = "PENDING" | "PARTIALLY_PAID" | "FULLY_PAID" | "CANCELLED";

/** The project's current bill: its latest issued bill and the document the client holds for it. */
interface CurrentBill {
  billId: string;
  documentId: string | null;
  documentNumber: string;
  kind: "PROFORMA" | "TAX_INVOICE";
  issueDate: string | null;
  /** Face value (taxable + GST). */
  amount: number;
  stageName: string;
  paymentStatus: PaymentStatus;
}

/** Footer sums, computed server-side over every row in the filtered set. */
interface BillingTrackerTotals {
  poValue: number;
  receivedAmount: number;
  pendingAmount: number;
  totalBilled: number;
  notBilledAmount: number;
  expectedThisMonth: number;
}

/** One project on the Billing Tracker. Mirrors `BillingTrackerRow` in the backend's billingTracker.ts. */
export interface BillingTrackerRow {
  leadId: string;
  projectNumber: string | null;
  projectName: string | null;
  clientName: string | null;
  /** The lead's owning organization (WISETECH MEP, …). Null for leads that predate organizations. */
  organizationName: string | null;
  handledByName: string | null;
  projectStartDate: string | null;
  projectStatus: { name: string; color: string | null } | null;
  poStatus: string | null;
  poApproved: boolean;
  /** Null until the PO is approved — the contract is not agreed, so there is no value. */
  poValue: number | null;
  receivedAmount: number;
  /** poValue − received. Null whenever poValue is. */
  pendingAmount: number | null;
  /** 0–100 of the PO still to come in. Null when there is no PO value to divide by. */
  pendingPercentage: number | null;
  status: TrackerStatus | null;
  statusLabel: string | null;
  statusSource: "MANUAL" | null;
  stage: TrackerStage | null;
  /** MANUAL = set on the tracker; DERIVED = follows the status. */
  stageSource: "MANUAL" | "DERIVED" | null;
  /** The bill's payment state, from the current bill's own arithmetic, else set by hand. */
  billPaymentStatus: PaymentStatus | null;
  billPaymentSource: "BILL" | "MANUAL" | null;
  lastPaymentAt: string | null;
  /** What came in on the last payment date (that day's receipts added together). Null when nothing is paid. */
  lastPaymentAmount: number | null;
  nextFollowUpDate: string | null;
  followUpManagerName: string | null;
  /** Face value of every issued bill. */
  totalBilled: number;
  /** poValue − totalBilled: the part of the PO no bill has been raised for. Null whenever poValue is. */
  notBilledAmount: number | null;
  /** What is still owed on issued bills falling due this calendar month. */
  expectedThisMonth: number;
  /** 0–100: stage work weighted by stage share. Null when the project has no stages yet. */
  workDonePercent: number | null;
  /** poValue × workDonePercent. Null before PO approval or with no stages. */
  workDoneAmount: number | null;
  bill: CurrentBill | null;
  /** The sheet's one shared note for the project (Action column). */
  billingNote: string | null;
  /** Live tasks raised from this row. */
  taskCount: number;
}

/** Mirrors the backend's `TRACKER_SORT_KEYS` — every column orders in SQL. */
export const TRACKER_SORT_KEYS = [
  "projectNumber", "projectName", "clientName", "poValue", "receivedAmount", "pendingAmount",
  "lastPaymentAt", "nextFollowUpDate", "projectStartDate", "organizationName", "handledByName",
  "projectStatus", "paymentStatus", "followUpManagerName", "totalBilled", "billDate", "billedStage",
  "billNo", "billAmount", "billStatus", "notBilledAmount", "expectedThisMonth",
  "lastPaymentAmount",
] as const;
export type BillingTrackerSort = (typeof TRACKER_SORT_KEYS)[number];

export interface BillingTrackerParams {
  search?: string;
  status?: TrackerStatus | "";
  stage?: TrackerStage | "";
  projectManagerId?: string;
  organizationId?: string;
  billPaymentStatus?: string;
  poApprovedOnly?: boolean;
  sortBy?: BillingTrackerSort;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export const listBillingTracker = async (
  params: BillingTrackerParams = {},
): Promise<{
  projects: BillingTrackerRow[];
  managers: Array<{ id: string; name: string }>;
  organizations: Array<{ id: string; name: string }>;
  pagination: Pagination;
  /** Sums over every row in scope, not the page. Drives the table's footer row. */
  totals: BillingTrackerTotals;
}> => {
  const { data } = await axios.get(url(BILLING_TRACKER.LIST), { params: clean(params), withCredentials: true });
  return {
    projects: data.projects ?? [],
    managers: data.managers ?? [],
    organizations: data.organizations ?? [],
    pagination: data.pagination,
    totals: data.totals,
  };
};

/**
 * The tracker's hand-set columns for one project. Send any subset — an omitted key is left alone, an explicit `null`
 * clears it. That distinction is load-bearing: without it, setting the stage would wipe the status.
 */
export interface BillingTrackerPatch {
  status?: TrackerStatus | null;
  stage?: TrackerStage | null;
  billPaymentStatus?: PaymentStatus | null;
  /** Empty string or null clears it. */
  billingNote?: string | null;
}

export const setBillingTrackerFields = async (leadId: string, patch: BillingTrackerPatch): Promise<void> => {
  await axios.patch(url(BILLING_TRACKER.UPDATE.replace(":leadId", encodeURIComponent(leadId))), patch, {
    withCredentials: true,
  });
};

/** Mirrors the backend's `BILLING_NOTE_MAX` (the column is VARCHAR(200)). */
export const BILLING_NOTE_MAX = 200;

/** A task raised from a project's row on the sheet. */
export interface TrackerTask {
  id: string;
  taskName: string;
  taskNo: number | null;
  dueDate: string | null;
  progress: number;
  status: { name: string; color: string | null } | null;
  assigneeName: string | null;
}

const tasksUrl = (leadId: string) => url(BILLING_TRACKER.TASKS.replace(":leadId", encodeURIComponent(leadId)));

export const listTrackerTasks = async (leadId: string): Promise<TrackerTask[]> => {
  const { data } = await axios.get(tasksUrl(leadId), { withCredentials: true });
  return data.tasks ?? [];
};

/** Link a task (already created through the task API) to the project's row. */
export const linkTrackerTask = async (leadId: string, taskId: string): Promise<void> => {
  await axios.post(tasksUrl(leadId), { taskId }, { withCredentials: true });
};

// ─── Proforma Tracker ────────────────────────────────────────────────────────

/** Where one proforma is in its life — the tracker's tiles, filters and counts all speak these. */
export type ProformaState = "DRAFT" | "AWAITING" | "PARTIAL" | "PAID" | "INVOICED";

/** One proforma (= one bill's proforma). Mirrors `ProformaTrackerRow` in the backend's proformaTracker.ts. */
export interface ProformaTrackerRow {
  billId: string;
  billNumber: string;
  leadId: string;
  projectNumber: string | null;
  projectName: string | null;
  clientName: string | null;
  organizationName: string | null;
  stageName: string;
  documentId: string | null;
  proformaNumber: string | null;
  proformaDate: string | null;
  documentStatus: "DRAFT" | "PUBLISHED" | "SENT" | "CANCELLED" | null;
  /** The current version's Bill Stage code (PROFORMA_SENT…): render this, in Configure's wording and colour. */
  stageCode: string | null;
  revisions: number;
  state: ProformaState;
  /** The bill's status code, for `BillingStatusBadge`. */
  billStatus: string;
  revising: boolean;
  amount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  tdsAmount: number;
  expectedAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  dueDate: string | null;
  overdueDays: number;
  invoiceDocumentId: string | null;
  invoiceNumber: string | null;
  lastPaymentAt: string | null;
  /** Bill Amount / GST / TDS: each one's value, what has come in, what is left — the Invoice Tracker's columns. */
  settlement: BillSettlement;
}

/** One project with its proformas rolled up. Mirrors `ProformaTrackerProject` in the backend. */
export interface ProformaTrackerProject {
  leadId: string;
  projectNumber: string | null;
  projectName: string | null;
  clientName: string | null;
  organizationName: string | null;
  managerName: string | null;
  followUpManagerName: string | null;
  poStatus: string | null;
  poApproved: boolean;
  contractValue: number | null;
  stageCount: number;
  /** PO approved, or a proforma exists. Contract totals count only these (legacy PO-pending rows carry imported estimates). */
  inBilling: boolean;
  raisedAmount: number;
  notRaisedAmount: number | null;
  raisedPercent: number | null;
  counts: Record<ProformaState, number> & { total: number; overdue: number };
  draftAmount: number;
  issuedAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  nextDueDate: string | null;
  lastProforma: { number: string | null; date: string | null; state: ProformaState; billId: string; documentId: string | null } | null;
}

/** Every project in scope and every proforma, in one call (the screen filters, sorts and totals in the browser). */
export const getProformaTracker = async (
  params: { organizationId?: string } = {},
): Promise<{ projects: ProformaTrackerProject[]; proformas: ProformaTrackerRow[] }> => {
  const { data } = await axios.get(url(BILLING_TRACKER.PROFORMAS), {
    params: clean(params),
    withCredentials: true,
  });
  return { projects: data.projects ?? [], proformas: data.proformas ?? [] };
};

// ─── Tax Invoice Tracker ─────────────────────────────────────────────────────

/** Where one tax invoice is: not issued yet, then the money. Mirrors `InvoiceState` in the backend. */
export type InvoiceState = "DRAFT" | "AWAITING" | "PARTIAL" | "SETTLED";

export interface InvoiceTrackerRow {
  billId: string;
  billNumber: string;
  leadId: string;
  projectNumber: string | null;
  projectName: string | null;
  clientName: string | null;
  organizationName: string | null;
  stageName: string;
  documentId: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  documentStatus: "DRAFT" | "PUBLISHED" | "SENT" | "CANCELLED" | null;
  /** The current version's Bill Stage code (PROFORMA_SENT…): render this, in Configure's wording and colour. */
  stageCode: string | null;
  revisions: number;
  state: InvoiceState;
  proformaNumber: string | null;
  proformaDocumentId: string | null;
  amount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  tdsAmount: number;
  tdsPending: boolean;
  expectedAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  dueDate: string | null;
  overdueDays: number;
  lastPaymentAt: string | null;
}

/** An issued bill with no tax invoice yet — the invoicing queue. */
export interface UninvoicedBill {
  billId: string;
  leadId: string;
  projectNumber: string | null;
  projectName: string | null;
  clientName: string | null;
  stageName: string;
  proformaNumber: string | null;
  proformaDocumentId: string | null;
  totalAmount: number;
  receivedAmount: number;
  /** Fully collected: the invoice is due now. */
  paid: boolean;
}

export interface InvoiceTrackerProject {
  leadId: string;
  projectNumber: string | null;
  projectName: string | null;
  clientName: string | null;
  organizationName: string | null;
  managerName: string | null;
  followUpManagerName: string | null;
  poStatus: string | null;
  poApproved: boolean;
  contractValue: number | null;
  stageCount: number;
  /** PO approved, or something billed. Contract totals count only these. */
  inBilling: boolean;
  billedAmount: number;
  invoicedAmount: number;
  invoicedPercent: number | null;
  notInvoicedCount: number;
  notInvoicedAmount: number;
  invoiceDueCount: number;
  invoiceDueAmount: number;
  counts: Record<InvoiceState, number> & { total: number; overdue: number };
  receivedAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  tdsPendingAmount: number;
  nextDueDate: string | null;
  lastInvoice: { number: string | null; date: string | null; state: InvoiceState; documentId: string } | null;
}

export const getInvoiceTracker = async (
  params: { organizationId?: string } = {},
): Promise<{ projects: InvoiceTrackerProject[]; invoices: InvoiceTrackerRow[]; uninvoiced: UninvoicedBill[] }> => {
  const { data } = await axios.get(url(BILLING_TRACKER.INVOICES), {
    params: clean(params),
    withCredentials: true,
  });
  return { projects: data.projects ?? [], invoices: data.invoices ?? [], uninvoiced: data.uninvoiced ?? [] };
};

// ─── Billing Dashboard ───────────────────────────────────────────────────────

/** One proforma named in an attention list. Mirrors `DashboardItem` in the backend's billingDashboard.ts. */
export interface DashboardItem {
  billId: string;
  leadId: string;
  documentId: string | null;
  proformaNumber: string | null;
  projectNumber: string | null;
  projectName: string | null;
  clientName: string | null;
  stageName: string;
  state: ProformaState;
  totalAmount: number;
  outstandingAmount: number;
  tdsAmount: number;
  proformaDate: string | null;
  dueDate: string | null;
  overdueDays: number;
}

export interface DashboardList {
  count: number;
  amount: number;
  items: DashboardItem[];
}

export interface BillingDashboardData {
  kpis: {
    contractValue: number;
    contractProjects: number;
    notRaised: number;
    notRaisedProjects: number;
    billed: number;
    billedCount: number;
    received: number;
    receivedThisMonth: number;
    outstanding: number;
    outstandingCount: number;
    overdue: number;
    overdueCount: number;
    collectionRate: number | null;
  };
  pipeline: Array<{ state: ProformaState; count: number; amount: number }>;
  trend: Array<{ month: string; billed: number; received: number }>;
  attention: Record<"overdue" | "dueSoon" | "invoiceDue" | "drafts" | "tdsPending", DashboardList>;
  recentPayments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    method: string;
    component: "BASIC" | "GST" | "TDS" | null;
    reference: string | null;
    leadId: string;
    projectNumber: string | null;
    projectName: string | null;
    proformaNumber: string | null;
    documentId: string | null;
    stageName: string;
  }>;
  topOutstanding: Array<{
    leadId: string;
    projectNumber: string | null;
    projectName: string | null;
    clientName: string | null;
    outstandingAmount: number;
    overdueAmount: number;
    issuedAmount: number;
    receivedAmount: number;
  }>;
  asOf: string;
}

export const getBillingDashboard = async (params: { organizationId?: string } = {}): Promise<BillingDashboardData> => {
  const { data } = await axios.get(url(BILLING_TRACKER.DASHBOARD), { params: clean(params), withCredentials: true });
  return data;
};

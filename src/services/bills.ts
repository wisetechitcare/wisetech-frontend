import axios from "axios";
import { BILLS, PROJECT_BILLING } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Direct billing client — one bill per deliverable.
 *
 * The project's Billing tab is deliverable-grained, not bill-grained: its table
 * IS the deliverable list, with a bill attached where one exists. Returning bills
 * alone would hide the rows that actually need acting on — work that is finished
 * and that nobody has billed.
 */

/** The one path a bill takes: DRAFT -> PROFORMA -> PARTIALLY_PAID -> PAID -> INVOICED. */
export type BillStatus =
  | "DRAFT" | "PROFORMA" | "PARTIALLY_PAID" | "PAID" | "INVOICED" | "CANCELLED";
export type WorkStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type BillBlockReason = "NOT_COMPLETED" | "NOT_BILLABLE" | "ALREADY_BILLED";

export type PaymentMethod =
  | "CASH" | "CHEQUE" | "NEFT" | "RTGS" | "IMPS" | "UPI" | "BANK_TRANSFER" | "ONLINE" | "OTHER";

export interface BillOnRow {
  id: string;
  billNumber: string;
  status: BillStatus;
  billDate: string | null;
  dueDate: string | null;
  /** Taxable value. */
  amount: number;
  gstRate: number;
  gstAmount: number;
  tdsRate: number;
  tdsAmount: number;
  /** amount + GST — the face value. */
  totalAmount: number;
  /** totalAmount − TDS — what the client actually transfers. */
  expectedAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  tdsDeposited: boolean;
  tdsDepositedAt: string | null;
  tdsReference: string | null;
  paymentCount: number;
  /** The proforma — the request for money, raised first. */
  proformaDocumentId: string | null;
  proformaNumber: string | null;
  proformaDate: string | null;
  /** The tax invoice — the legal document, raised only once the money is in. */
  invoiceDocumentId: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  /**
   * Where each document stands with the client, read live from the document
   * engine. DRAFT means it exists but has not been finalised, so the row offers
   * "Open" rather than treating the step as done.
   */
  proformaStatus: DocumentStatus | null;
  invoiceStatus: DocumentStatus | null;
  /** More than one means the proforma has been revised. */
  proformaVersions: number;
  /**
   * Which rate category this bill was raised under. A LABEL, not money — the
   * amounts are already frozen on the bill, so a category renamed in Configure
   * reads by its current name here. Null if the category was deleted.
   */
  gstSlabName: string | null;
  tdsSectionName: string | null;
  tdsSectionCode: string | null;
}

/** The document engine's own lifecycle, mirrored for display only. */
export type DocumentStatus = "DRAFT" | "PUBLISHED" | "SENT" | "CANCELLED";

export interface ProjectBillingRow {
  deliverableId: string;
  deliverableName: string;
  stageId: string;
  stageName: string;
  stageSortOrder: number;
  percentage: number;
  amount: number;
  workStatus: WorkStatus;
  completedAt: string | null;
  isBillable: boolean;
  /** Why this row offers no "Raise bill", or null when it does. */
  blockReason: BillBlockReason | null;
  blockMessage: string | null;
  bill: BillOnRow | null;
}

export interface ProjectBillingSummary {
  /** Contract value — the commercials total, exclusive of GST. */
  totalBilling: number;
  /** Cash actually received: GST in, TDS already deducted by the client. */
  received: number;
  /** totalBilling − received. The Tracker's definition, so the two agree. */
  pending: number;
  /** Work finished that nobody has billed — ours to chase. */
  doneNotBilled: number;
  /** Billed and still unpaid — the client's to settle. */
  billedUnpaid: number;
  /** Contract left that no work has been done against yet. */
  notStarted: number;
  gstBilled: number;
  tdsDeducted: number;
  /** Withheld by clients but not shown as deposited. */
  tdsPending: number;
  /**
   * Collected through the old billing-request chain, before this project moved
   * to per-deliverable bills. Included in `received` so this tab and the Billing
   * Tracker agree; surfaced separately so the table, which only knows about
   * bills, does not look short by that amount.
   */
  legacyReceived: number;
  billCount: number;
  billableCount: number;
  currency: string;
}

export interface ProjectBillingPayload {
  project: {
    id: string;
    title: string | null;
    projectNumber: string | null;
    clientName: string | null;
    clientGstNumber: string | null;
  };
  summary: ProjectBillingSummary;
  rows: ProjectBillingRow[];
  defaults: {
    gstSlabId: string | null;
    gstRate: number;
    tdsSectionId: string | null;
    tdsRate: number;
  };
  capabilities: { canBill: boolean; canRecordPayment: boolean };
}

export interface BillPayment {
  id: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  bankName: string | null;
  remarks: string | null;
  createdAt: string;
}

const url = (path: string) => `${API_BASE_URL}/${path}`;
const byId = (path: string, id: string) =>
  `${API_BASE_URL}/${path.replace(/:(id|paymentId|projectId)/, encodeURIComponent(id))}`;

export const getProjectBilling = async (projectId: string): Promise<ProjectBillingPayload> => {
  const { data } = await axios.get(byId(PROJECT_BILLING.OVERVIEW, projectId), {
    withCredentials: true,
  });
  return {
    project: data.project,
    summary: data.summary,
    rows: data.rows ?? [],
    defaults: data.defaults,
    capabilities: data.capabilities ?? { canBill: false, canRecordPayment: false },
  };
};

export interface RaiseBillInput {
  deliverableId: string;
  gstSlabId?: string | null;
  tdsSectionId?: string | null;
  billDate?: string | null;
  paymentTermsDays?: number;
  remarks?: string | null;
  asDraft?: boolean;
}

/**
 * Create the bill and, unless it is saved as a draft, open its proforma ready to
 * edit. `documentId` is where the caller sends the user next — the proforma is
 * NOT published here; it is finalised in the document editor like any other.
 */
export const raiseBill = async (
  input: RaiseBillInput,
): Promise<{ bill: any; documentId: string | null }> => {
  const { data } = await axios.post(url(BILLS.RAISE), input, { withCredentials: true });
  return { bill: data.bill, documentId: data.documentId ?? null };
};

export const getBill = async (billId: string) => {
  const { data } = await axios.get(byId(BILLS.GET_BY_ID, billId), { withCredentials: true });
  return data.bill;
};

/** Step 1 — open the proforma as an editable draft. Returns its document id. */
export const openProforma = async (
  billId: string,
  billDate?: string | null,
): Promise<{ bill: any; documentId: string }> => {
  const { data } = await axios.put(byId(BILLS.PROFORMA, billId), { billDate }, { withCredentials: true });
  return { bill: data.bill, documentId: data.documentId };
};

/**
 * Step 3 — open the tax invoice as an editable draft.
 *
 * The server refuses this until the bill is fully paid: a tax invoice books
 * output GST, so raising one against money that has not arrived is a filing
 * problem rather than a UI inconvenience.
 */
export const openTaxInvoice = async (
  billId: string,
): Promise<{ bill: any; documentId: string }> => {
  const { data } = await axios.put(byId(BILLS.INVOICE, billId), {}, { withCredentials: true });
  return { bill: data.bill, documentId: data.documentId };
};

export const cancelBill = async (billId: string, reason?: string | null) => {
  const { data } = await axios.put(byId(BILLS.CANCEL, billId), { reason }, { withCredentials: true });
  return data.bill;
};

export interface RecordPaymentInput {
  amount: number;
  paymentDate: string;
  method?: PaymentMethod;
  reference?: string | null;
  bankName?: string | null;
  remarks?: string | null;
}

export const recordBillPayment = async (billId: string, input: RecordPaymentInput) => {
  const { data } = await axios.post(byId(BILLS.PAYMENTS, billId), input, { withCredentials: true });
  return data.bill;
};

export const deleteBillPayment = async (paymentId: string) => {
  const { data } = await axios.delete(byId(BILLS.PAYMENT, paymentId), { withCredentials: true });
  return data.bill;
};

/**
 * Deducting TDS and DEPOSITING it are two different acts by the client, and only
 * the second gets us the credit — hence a flag of its own rather than something
 * inferred from the payment.
 */
export const setTdsDeposited = async (
  billId: string,
  input: { deposited: boolean; reference?: string | null; depositedAt?: string | null },
) => {
  const { data } = await axios.put(byId(BILLS.TDS, billId), input, { withCredentials: true });
  return data.bill;
};

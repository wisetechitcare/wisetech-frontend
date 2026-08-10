import axios from "axios";
import { BILLING_REPORT } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Financial Reporting Center client — every report is a read-only GET, so this
 * file is thin: one function per endpoint, filters passed straight through as
 * query params. No client-side aggregation lives here; every number on screen
 * is what the server sent.
 */

export interface ReportFilterParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  clientId?: string;
  projectManagerId?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ChartPoint { label: string; value: number; [key: string]: unknown }
export interface TimeSeriesPoint extends ChartPoint { date: string }
export interface TablePage<T> { rows: T[]; total: number; page: number; pageSize: number }

// ─── Revenue ────────────────────────────────────────────────────────────────

export interface RevenueStats {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  averageInvoiceValue: number;
  highestInvoice: number;
  lowestInvoice: number;
  invoiceCount: number;
}

export interface RevenueTableRow {
  id: string;
  invoiceNumber: string;
  leadId: string | null;
  companyId: string | null;
  projectName: string | null;
  clientName: string | null;
  invoiceDate: string;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  generatedBy: string | null;
}

export interface RevenueReportResponse {
  stats: RevenueStats;
  charts: { monthlyTrend: TimeSeriesPoint[]; byClient: ChartPoint[]; byProject: ChartPoint[] };
  table: TablePage<RevenueTableRow>;
}

export const getRevenueReport = async (params: ReportFilterParams = {}): Promise<RevenueReportResponse> => {
  const { data } = await axios.get(`${API_BASE_URL}/${BILLING_REPORT.REVENUE}`, { params });
  return data;
};

// ─── Collections ────────────────────────────────────────────────────────────

export interface CollectionStats {
  collectedAmount: number;
  outstandingAmount: number;
  collectionPercentage: number;
  averageCollectionDays: number | null;
  pendingCollectionCount: number;
}

export interface CollectionTableRow {
  id: string;
  operationNumber: string;
  requestNumber: string;
  projectName: string | null;
  clientName: string | null;
  leadId: string | null;
  companyId: string | null;
  invoiceAmount: number;
  collected: number;
  outstanding: number;
  paymentStatus: string;
  paymentStatusLabel: string;
  lastPaymentAt: string | null;
}

export interface CollectionReportResponse {
  stats: CollectionStats;
  charts: { trend: (TimeSeriesPoint & { outstanding: number })[]; methodDistribution: ChartPoint[] };
  table: TablePage<CollectionTableRow>;
}

export const getCollectionReport = async (params: ReportFilterParams = {}): Promise<CollectionReportResponse> => {
  const { data } = await axios.get(`${API_BASE_URL}/${BILLING_REPORT.COLLECTIONS}`, { params });
  return data;
};

// ─── Outstanding ────────────────────────────────────────────────────────────

export interface OutstandingStats {
  outstandingAmount: number;
  overdueAmount: number;
  averageDueDays: number;
  overdueClientCount: number;
}

export interface OutstandingTableRow {
  id: string;
  operationNumber: string;
  requestNumber: string;
  projectName: string | null;
  clientName: string | null;
  leadId: string | null;
  companyId: string | null;
  outstanding: number;
  dueDate: string | null;
  daysOverdue: number;
  dueState: string;
  paymentStatus: string;
}

export interface OutstandingReportResponse {
  stats: OutstandingStats;
  charts: { aging: ChartPoint[]; byClient: ChartPoint[]; byProject: ChartPoint[] };
  table: TablePage<OutstandingTableRow>;
}

export const getOutstandingReport = async (params: ReportFilterParams = {}): Promise<OutstandingReportResponse> => {
  const { data } = await axios.get(`${API_BASE_URL}/${BILLING_REPORT.OUTSTANDING}`, { params });
  return data;
};

// ─── Receivables ────────────────────────────────────────────────────────────

export interface ReceivableStats {
  receivableAmount: number;
  pendingBillingCount: number;
  pendingProformaCount: number;
  pendingPaymentCount: number;
  readyForInvoiceCount: number;
}

export interface ReceivableTableRow {
  id: string;
  operationNumber: string;
  requestNumber: string;
  projectName: string | null;
  clientName: string | null;
  leadId: string | null;
  companyId: string | null;
  stage: string;
  status: string;
  statusLabel: string;
  amount: number;
}

export interface ReceivableReportResponse {
  stats: ReceivableStats;
  charts: { pipeline: ChartPoint[]; funnel: ChartPoint[] };
  table: TablePage<ReceivableTableRow>;
}

export const getReceivableReport = async (params: ReportFilterParams = {}): Promise<ReceivableReportResponse> => {
  const { data } = await axios.get(`${API_BASE_URL}/${BILLING_REPORT.RECEIVABLES}`, { params });
  return data;
};

// ─── Monthly ────────────────────────────────────────────────────────────────

export interface MonthlyRow {
  period: string;
  label: string;
  billingRequests: number;
  proformas: number;
  payments: number;
  invoices: number;
  revenue: number;
  collected: number;
}

export interface MonthlyReportResponse {
  rows: MonthlyRow[];
  totals: Omit<MonthlyRow, "period" | "label">;
}

export const getMonthlyReport = async (
  params: ReportFilterParams & { months?: number } = {},
): Promise<MonthlyReportResponse> => {
  const { data } = await axios.get(`${API_BASE_URL}/${BILLING_REPORT.MONTHLY}`, { params });
  return data;
};

// ─── Client ─────────────────────────────────────────────────────────────────

export interface ClientBillingSummary {
  companyId: string;
  companyName: string;
  totalProjects: number;
  totalRevenue: number;
  outstanding: number;
  paid: number;
  pending: number;
}

export interface ClientProjectRow {
  leadId: string;
  projectName: string | null;
  billingRequestNumber: string;
  operationNumber: string;
  invoiceDocumentId: string | null;
  totalAmount: number;
  collected: number;
  outstanding: number;
  status: string;
}

export interface ClientReportResponse {
  summary: ClientBillingSummary;
  projects: ClientProjectRow[];
  charts: { revenueTimeline: TimeSeriesPoint[] };
}

export const getClientReport = async (clientId: string): Promise<ClientReportResponse> => {
  const { data } = await axios.get(`${API_BASE_URL}/${BILLING_REPORT.CLIENT}`, { params: { clientId } });
  return data;
};

// ─── Project ────────────────────────────────────────────────────────────────

export interface ProjectReportSummary {
  leadId: string;
  projectName: string | null;
  clientName: string | null;
  contractValue: number;
  billedAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  remainingBilling: number;
  billingPercentage: number;
}

export interface ProjectReportRow {
  id: string;
  operationNumber: string;
  requestNumber: string;
  stage: string;
  status: string;
  proformaNumber: string | null;
  invoiceNumber: string | null;
  totalAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  approvedAt: string | null;
}

export interface ProjectReportResponse {
  summary: ProjectReportSummary;
  rows: ProjectReportRow[];
  stageBilling: ChartPoint[];
  revenueTimeline: TimeSeriesPoint[];
  paymentTimeline: (TimeSeriesPoint & { method: string })[];
}

export const getProjectReport = async (projectId: string): Promise<ProjectReportResponse> => {
  const { data } = await axios.get(`${API_BASE_URL}/${BILLING_REPORT.PROJECT}`, { params: { projectId } });
  return data;
};

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface ReportsDashboardResponse {
  operations: Record<string, number>;
  payments: Record<string, number>;
  revenue: RevenueStats;
}

export const getReportsDashboard = async (): Promise<ReportsDashboardResponse> => {
  const { data } = await axios.get(`${API_BASE_URL}/${BILLING_REPORT.DASHBOARD}`);
  return data;
};

import axios from "axios";
import { TAX_INVOICE } from "@constants/api-endpoint";
import type {
  VersionStatus, ProformaVersion, ProformaNode, ProformaActivity,
  TimelineStep, VersionComparison, ProformaDetail, ProformaListParams, Pagination,
} from "./proformas";

export type {
  VersionStatus, ProformaVersion, ProformaNode, ProformaActivity,
  TimelineStep, VersionComparison, ProformaDetail, ProformaListParams, Pagination,
};

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Tax Invoice repository client — MANAGEMENT ONLY.
 *
 * There is deliberately no create/generate call here. A Tax Invoice is generated
 * from verified Payment Collection; a second door onto that would fork the one
 * workflow that decides what gets paid and invoiced.
 *
 * Types reuse Proforma's shapes (they're document-kind-agnostic).
 */

const url = (path: string, params: Record<string, string> = {}) =>
  `${API_BASE_URL}/${Object.entries(params).reduce((p, [k, v]) => p.replace(`:${k}`, v), path)}`;

const clean = (params: ProformaListParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  );

export const listInvoices = async (
  params: ProformaListParams = {},
): Promise<{ invoices: ProformaNode[]; pagination: Pagination }> => {
  const { data } = await axios.get(url(TAX_INVOICE.LIST), { params: clean(params), withCredentials: true });
  return { invoices: data.invoices ?? [], pagination: data.pagination };
};

export const getInvoice = async (id: string): Promise<ProformaDetail> => {
  const { data } = await axios.get(url(TAX_INVOICE.GET_BY_ID, { id }), { withCredentials: true });
  return data;
};

export const getInvoiceVersions = async (id: string): Promise<ProformaVersion[]> => {
  const { data } = await axios.get(url(TAX_INVOICE.VERSIONS, { id }), { withCredentials: true });
  return data.versions ?? [];
};

export const getInvoiceTimeline = async (id: string): Promise<TimelineStep[]> => {
  const { data } = await axios.get(url(TAX_INVOICE.TIMELINE, { id }), { withCredentials: true });
  return data.timeline ?? [];
};

export const getInvoiceActivity = async (id: string): Promise<ProformaActivity[]> => {
  const { data } = await axios.get(url(TAX_INVOICE.ACTIVITY, { id }), { withCredentials: true });
  return data.activity ?? [];
};

export const compareInvoiceVersions = async (
  id: string, versionId: string, from?: string,
): Promise<VersionComparison> => {
  const { data } = await axios.get(url(TAX_INVOICE.COMPARE, { id, versionId }), {
    params: from ? { from } : undefined,
    withCredentials: true,
  });
  return data;
};

export const getInvoicePreview = async (
  id: string, versionId: string,
): Promise<{ id: string; versionNumber: number; html: string; status: VersionStatus }> => {
  const { data } = await axios.get(url(TAX_INVOICE.PREVIEW, { id, versionId }), { withCredentials: true });
  return data.version;
};

export const accessInvoice = async (
  id: string,
  intent: "DOWNLOAD" | "PRINT" | "SHARE",
  versionId?: string,
): Promise<{ versionId: string; url: string }> => {
  const { data } = await axios.post(
    url(TAX_INVOICE.ACCESS, { id }), { intent, versionId }, { withCredentials: true },
  );
  return data;
};

export const downloadInvoiceWord = async (id: string, versionId?: string): Promise<void> => {
  const response = await axios.get(url(TAX_INVOICE.DOWNLOAD_WORD, { id }), {
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

export const setInvoiceVersionStatus = async (
  id: string, versionId: string, status: VersionStatus,
): Promise<ProformaVersion> => {
  const { data } = await axios.patch(
    url(TAX_INVOICE.VERSION_STATUS, { id, versionId }), { status }, { withCredentials: true },
  );
  return data.version;
};

export const archiveInvoice = async (id: string): Promise<ProformaDetail> => {
  const { data } = await axios.post(url(TAX_INVOICE.ARCHIVE, { id }), {}, { withCredentials: true });
  return data;
};

export const restoreInvoice = async (id: string): Promise<ProformaDetail> => {
  const { data } = await axios.post(url(TAX_INVOICE.RESTORE, { id }), {}, { withCredentials: true });
  return data;
};

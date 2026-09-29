import axios from "axios";
import { BILLING_CONFIG } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Billing → Configure client.
 *
 * Display configuration only — the label and colour behind every Billing status,
 * stage and bill payment chip. There is no create or delete: the codes are enum
 * members, because the status list is a workflow with legal transitions and the
 * bill payment status is derived from what has been collected.
 */

/** The curated tones the theme resolves per light/dark mode. */
export type BillingTone = "brand" | "success" | "danger" | "warning" | "indigo" | "cyan" | "neutral";

/**
 * What a code's colour can be: a tone name, or a literal hex the admin picked —
 * the same choice Leads Configure offers. `(string & {})` keeps tone-name
 * autocomplete alive while still accepting `#00FFFF`.
 */
export type BillingStatusColour = BillingTone | (string & {});

export interface BillingLabelEntry {
  code: string;
  label: string;
  tone: BillingStatusColour;
  /** The entry its group settles on. At most one per group. */
  isDefault: boolean;
  /** True when this differs from what the module shipped with. */
  isCustomised: boolean;
}

export interface BillingLabelGroup {
  key: string;
  title: string;
  description: string;
  entries: BillingLabelEntry[];
}

export interface BillingLabelConfig {
  tones: BillingTone[];
  groups: BillingLabelGroup[];
}

const url = (path: string, code?: string) =>
  `${API_BASE_URL}/${code ? path.replace(":code", encodeURIComponent(code)) : path}`;

const unwrap = (data: any): BillingLabelConfig => ({
  tones: data.tones ?? [],
  groups: data.groups ?? [],
});

export const getBillingStatusLabels = async (): Promise<BillingLabelConfig> => {
  const { data } = await axios.get(url(BILLING_CONFIG.STATUS_LABELS), { withCredentials: true });
  return unwrap(data);
};

export const saveBillingStatusLabels = async (
  entries: Array<{ code: string; label: string; tone: BillingStatusColour; isDefault?: boolean }>,
): Promise<BillingLabelConfig> => {
  const { data } = await axios.put(
    url(BILLING_CONFIG.STATUS_LABELS),
    { entries },
    { withCredentials: true },
  );
  return unwrap(data);
};

/** Removing the override row IS the reset — the server falls back to its default. */
export const resetBillingStatusLabel = async (code: string): Promise<BillingLabelConfig> => {
  const { data } = await axios.delete(url(BILLING_CONFIG.RESET_STATUS_LABEL, code), {
    withCredentials: true,
  });
  return unwrap(data);
};

// ─── tax rates ───────────────────────────────────────────────────────────────
//
// Unlike the labels above, these ARE rows: GST and TDS rates change by law and by
// the service being billed, so the list gets New and Delete. What it does not get
// is retroactive effect — every bill snapshots the rate it was raised with, so
// correcting a slab here fixes the next bill and never restates an issued one.

export interface TaxRateRow {
  id: string;
  name: string;
  /** Percent, not a fraction: 18 means 18%. */
  rate: number;
  /** TDS only — the section of the Income Tax Act, e.g. "194J". */
  section?: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  /** How many bills were raised on this rate. Non-zero means it cannot be deleted. */
  billCount: number;
}

export interface BillingTaxConfig {
  gstSlabs: TaxRateRow[];
  tdsSections: TaxRateRow[];
}

export interface TaxRateInput {
  id?: string;
  name: string;
  rate: number;
  section?: string;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

const idUrl = (path: string, id: string) =>
  `${API_BASE_URL}/${path.replace(":id", encodeURIComponent(id))}`;

export const getBillingTaxRates = async (): Promise<BillingTaxConfig> => {
  const { data } = await axios.get(url(BILLING_CONFIG.TAX_RATES), { withCredentials: true });
  return { gstSlabs: data.gstSlabs ?? [], tdsSections: data.tdsSections ?? [] };
};

/** Create or update — the body's optional `id` decides which, so one call does both. */
export const saveGstSlab = async (input: TaxRateInput): Promise<TaxRateRow[]> => {
  const { data } = await axios.put(url(BILLING_CONFIG.GST_SLABS), input, { withCredentials: true });
  return data.gstSlabs ?? [];
};

export const deleteGstSlab = async (id: string): Promise<TaxRateRow[]> => {
  const { data } = await axios.delete(idUrl(BILLING_CONFIG.GST_SLAB, id), { withCredentials: true });
  return data.gstSlabs ?? [];
};

export const saveTdsSection = async (input: TaxRateInput): Promise<TaxRateRow[]> => {
  const { data } = await axios.put(url(BILLING_CONFIG.TDS_SECTIONS), input, { withCredentials: true });
  return data.tdsSections ?? [];
};

export const deleteTdsSection = async (id: string): Promise<TaxRateRow[]> => {
  const { data } = await axios.delete(idUrl(BILLING_CONFIG.TDS_SECTION, id), { withCredentials: true });
  return data.tdsSections ?? [];
};

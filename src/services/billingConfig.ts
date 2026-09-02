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

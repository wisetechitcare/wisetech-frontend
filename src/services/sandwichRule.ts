import axios from "axios";
import { SANDWICH_RULE } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export interface SandwichRulePattern {
  runLength: number;
  /** 'holiday' = interior days must be genuine active holidays (not weekends); 'weekend' = must
   * be a branch off-day (a holiday marked isWeekend also counts); 'any' = either qualifies. */
  interiorDayType?: 'holiday' | 'weekend' | 'any';
  leadingRequired: boolean;
  leadingPaidCondition: 'paid' | 'unpaid' | 'any';
  trailingRequired: boolean;
  trailingPaidCondition: 'paid' | 'unpaid' | 'any';
  excludeInteriorDaysFromSalary: boolean;
  excludeLeadingDayFromSalary: boolean;
  excludeTrailingDayFromSalary: boolean;
}

export interface SandwichRule {
  id: string;
  name: string;
  description: string | null;
  category: 'holiday-bridge' | 'weekend-bridge' | 'custom';
  pattern: SandwichRulePattern;
  isEnabled: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SandwichRuleAuditLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  action: 'CREATED' | 'UPDATED' | 'ENABLED' | 'DISABLED' | 'DELETED';
  actorId: string | null;
  /** Human name of the actor, resolved server-side from actorId (null = system/deleted user). */
  actorName: string | null;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
}

export interface SandwichRuleInput {
  name: string;
  description?: string | null;
  category: 'holiday-bridge' | 'weekend-bridge' | 'custom';
  pattern: SandwichRulePattern;
  isEnabled?: boolean;
  sortOrder?: number;
}

export const fetchSandwichRules = async (): Promise<{ rules: SandwichRule[] }> => {
  const { data } = await axios.get(`${API_BASE_URL}/${SANDWICH_RULE.LIST}`);
  return data.data;
};

export const createSandwichRule = async (payload: SandwichRuleInput): Promise<{ rule: SandwichRule }> => {
  const { data } = await axios.post(`${API_BASE_URL}/${SANDWICH_RULE.CREATE}`, payload);
  return data.data;
};

export const updateSandwichRule = async (
  id: string,
  payload: Partial<SandwichRuleInput>,
): Promise<{ rule: SandwichRule }> => {
  const { data } = await axios.put(`${API_BASE_URL}/${SANDWICH_RULE.UPDATE.replace(':id', id)}`, payload);
  return data.data;
};

export const deleteSandwichRule = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/${SANDWICH_RULE.DELETE.replace(':id', id)}`);
};

/** Persist a new order atomically. `orderedIds` is the full display order (all categories). */
export const reorderSandwichRules = async (orderedIds: string[]): Promise<{ rules: SandwichRule[] }> => {
  const { data } = await axios.put(`${API_BASE_URL}/${SANDWICH_RULE.REORDER}`, { orderedIds });
  return data.data;
};

export const fetchSandwichRuleAuditLog = async (id: string): Promise<{ logs: SandwichRuleAuditLogEntry[] }> => {
  const { data } = await axios.get(`${API_BASE_URL}/${SANDWICH_RULE.AUDIT_LOG.replace(':id', id)}`);
  return data.data;
};

export interface SandwichPreviewDay {
  date: string;
  class: 'leave-paid' | 'leave-unpaid' | 'off-day-counted' | 'off-day-excluded';
  isOffDay: boolean;
  ruleId?: string;
  ruleName?: string;
}

export interface SandwichPreviewResult {
  days: SandwichPreviewDay[];
  /** Interior off-days a currently-enabled rule docks as Unpaid — the ONLY dates the calendar
   * should hatch. Empty under the default (strictly rule-driven) rule set. */
  excludedOffDayDates: string[];
  aggregate: unknown;
}

/** Classify a candidate leave span against the live Sandwich Rules (read-only, backend engine).
 * Single source of truth — the calendar must not re-derive sandwich days locally. */
export const fetchSandwichPreview = async (payload: {
  dateFrom: string;
  dateTo: string;
  employeeId?: string;
  isHalfDay?: boolean;
}): Promise<SandwichPreviewResult> => {
  const { data } = await axios.post(`${API_BASE_URL}/${SANDWICH_RULE.PREVIEW}`, payload);
  return data.data;
};

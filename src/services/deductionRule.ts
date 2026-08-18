import axios from "axios";
import { DEDUCTION_RULE } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Break / meal deduction rules API.
 *
 * The server owns every rule about what a day is credited. This file moves data and
 * decides nothing — the preview endpoint runs the SAME engine payroll runs, so the
 * screen can never show a number the payslip disagrees with.
 */

export type DeductionMethod = 'hours_worked' | 'time_window';
export type AppliesOn = 'all' | 'working_day' | 'non_working_day';
export type DayKind = 'working' | 'weekend' | 'holiday';

export interface DeductionRule {
    id: string;
    companyId: string | null;
    branchId: string | null;
    name: string;
    description: string | null;
    method: DeductionMethod;
    /** Deduct only once the day exceeds this. */
    thresholdMinutes: number;
    deductMinutes: number;
    windowStart: string | null;
    windowEnd: string | null;
    appliesOn: AppliesOn;
    exemptHolidays: boolean;
    exemptWeekends: boolean;
    weekdays: Record<string, boolean> | null;
    waiveIfBreakPunched: boolean;
    /** Cap the subtraction so credit never decreases for working longer. */
    capAtThreshold: boolean;
    isEnabled: boolean;
    isSystem: boolean;
    sortOrder: number;
    effectiveFrom: string | null;
    effectiveTo: string | null;
}

export interface DeductionOutcome {
    totalMinutes: number;
    netMinutes: number;
    applied: Array<{ ruleId: string; ruleName: string; minutes: number }>;
    skipped: Array<{ ruleId: string; ruleName: string; reason: string }>;
}

const url = (path: string, id?: string) =>
    `${API_BASE_URL}/${id ? path.replace(':id', id) : path}`;

export const fetchDeductionRules = async (): Promise<DeductionRule[]> => {
    const { data } = await axios.get(url(DEDUCTION_RULE.LIST));
    return data?.data?.rules ?? [];
};

/** What the group → org → branch ladder actually resolves for a scope. */
export const fetchEffectiveDeductionRules = async (branchId?: string | null): Promise<DeductionRule[]> => {
    const suffix = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    const { data } = await axios.get(`${url(DEDUCTION_RULE.EFFECTIVE)}${suffix}`);
    return data?.data?.rules ?? [];
};

export const createDeductionRule = async (payload: Partial<DeductionRule>): Promise<DeductionRule> => {
    const { data } = await axios.post(url(DEDUCTION_RULE.CREATE), payload);
    return data?.data?.rule;
};

export const updateDeductionRule = async (
    id: string, payload: Partial<DeductionRule>,
): Promise<DeductionRule> => {
    const { data } = await axios.put(url(DEDUCTION_RULE.UPDATE, id), payload);
    return data?.data?.rule;
};

export const deleteDeductionRule = async (id: string): Promise<void> => {
    await axios.delete(url(DEDUCTION_RULE.DELETE, id));
};

export const reorderDeductionRules = async (orderedIds: string[]): Promise<number> => {
    const { data } = await axios.post(url(DEDUCTION_RULE.REORDER), { orderedIds });
    return data?.data?.updated ?? 0;
};

/**
 * "What would a day like this be credited?" — evaluated by the server's engine, so the
 * answer here is the answer payroll will give.
 */
export const previewDeduction = async (payload: {
    workedMinutes: number;
    dayKind: DayKind;
    weekday: string;
    dateISO: string;
    branchId?: string | null;
}): Promise<{ outcome: DeductionOutcome; ruleCount: number }> => {
    const { data } = await axios.post(url(DEDUCTION_RULE.PREVIEW), payload);
    return data?.data;
};

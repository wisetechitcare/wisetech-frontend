import axios from "axios";
import { WORK_CALENDAR } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Work calendar API client.
 *
 * The server owns every rule about what a day MEANS (`@services/workCalendar` there);
 * this file only moves data. Nothing here interprets a weekday, a parity or a holiday —
 * re-deriving any of that in the browser is the exact mistake that produced red late
 * marks on a weekend the backend had already exempted.
 */

/** 'every' | 'nth:1'…'nth:5' | 'last' | 'odd' | 'even'. */
export type WeekParity = string;

/** The three explicit ways a day can be overridden — mirrors the server enum. */
export type ExceptionKind = 'holiday' | 'off_day' | 'working_day';

export interface WorkCalendarRule {
    id: string;
    calendarId: string;
    /** 0 = Sunday … 6 = Saturday. */
    weekday: number;
    isWorking: boolean;
    weekParity: WeekParity;
    checkIn: string | null;
    checkOut: string | null;
    breakMinutes: number | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
}

export interface WorkCalendar {
    id: string;
    name: string;
    timezone: string | null;
    companyId: string | null;
    branchId: string | null;
    isDefault: boolean;
    isActive: boolean;
    rules: WorkCalendarRule[];
    _count?: { exceptions: number };
}

export interface WorkCalendarException {
    id: string;
    calendarId: string | null;
    companyId: string;
    name: string;
    dateFrom: string;
    dateTo: string | null;
    kind: ExceptionKind;
    isOptional: boolean;
    isActive: boolean;
}

export interface CalendarImpact {
    dates: string[];
    employeeCount: number;
    lockedPeriods: Array<{ month: number; year: number }>;
    affectedLeaves: Array<{
        leaveId: string;
        employeeCode: string | null;
        dateFrom: string;
        dateTo: string;
        overlappingDates: string[];
    }>;
}

export interface BulkGenerateResult {
    candidates: string[];
    toCreate: string[];
    skipped: number;
    impact: CalendarImpact;
    created: number;
}

const url = (path: string, id?: string) =>
    `${API_BASE_URL}/${id ? path.replace(':id', id) : path}`;

export const fetchWorkCalendars = async (): Promise<WorkCalendar[]> => {
    const { data } = await axios.get(url(WORK_CALENDAR.LIST));
    return data?.data?.calendars ?? [];
};

export const replaceCalendarRules = async (
    calendarId: string,
    rules: Array<Pick<WorkCalendarRule, 'weekday' | 'isWorking'> & { weekParity?: WeekParity }>,
    effectiveFrom?: string | null,
): Promise<WorkCalendar | null> => {
    const { data } = await axios.put(url(WORK_CALENDAR.REPLACE_RULES, calendarId), {
        rules,
        ...(effectiveFrom ? { effectiveFrom } : {}),
    });
    return data?.data?.calendar ?? null;
};

export const fetchCalendarExceptions = async (params: {
    calendarId?: string | null; from?: string; to?: string;
}): Promise<WorkCalendarException[]> => {
    const query = new URLSearchParams();
    if (params.calendarId) query.set('calendarId', params.calendarId);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const { data } = await axios.get(`${url(WORK_CALENDAR.LIST_EXCEPTIONS)}${suffix}`);
    return data?.data?.exceptions ?? [];
};

export const createCalendarException = async (payload: {
    calendarId?: string | null;
    name: string;
    dateFrom: string;
    dateTo?: string | null;
    kind: ExceptionKind;
    isOptional?: boolean;
}): Promise<WorkCalendarException> => {
    const { data } = await axios.post(url(WORK_CALENDAR.CREATE_EXCEPTION), payload);
    return data?.data?.exception;
};

export const updateCalendarException = async (
    id: string,
    payload: Partial<Pick<WorkCalendarException, 'name' | 'dateFrom' | 'dateTo' | 'kind' | 'isOptional' | 'isActive'>>,
): Promise<WorkCalendarException> => {
    const { data } = await axios.put(url(WORK_CALENDAR.UPDATE_EXCEPTION, id), payload);
    return data?.data?.exception;
};

export const deleteCalendarException = async (id: string): Promise<void> => {
    await axios.delete(url(WORK_CALENDAR.DELETE_EXCEPTION, id));
};

/**
 * Generate a year of recurring off-days. Always call with `dryRun: true` first —
 * the result carries the impact the confirm dialog must show before anything is written.
 */
export const bulkGenerateExceptions = async (payload: {
    calendarId?: string | null;
    year: number;
    weekday: number;
    parities: WeekParity[];
    kind: ExceptionKind;
    name: string;
    dryRun?: boolean;
}): Promise<BulkGenerateResult> => {
    const { data } = await axios.post(url(WORK_CALENDAR.BULK_GENERATE), payload);
    return data?.data;
};

export const previewCalendarImpact = async (payload: {
    branchId?: string | null;
    dates: string[];
}): Promise<CalendarImpact> => {
    const { data } = await axios.post(url(WORK_CALENDAR.PREVIEW_IMPACT), payload);
    return data?.data?.impact;
};

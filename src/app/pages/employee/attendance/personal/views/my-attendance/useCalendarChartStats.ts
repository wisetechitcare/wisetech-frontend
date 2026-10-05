/**
 * Loads the server attendance calendar for every month covering [from, to] and
 * rolls it into My-Attendance chart stats. Shares the same React Query cache as
 * the personal Overview calendar (`attendance-calendar`), so navigating between
 * the two screens does not refetch.
 */

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { fetchAttendanceCalendar } from "@services/employee";
import type {
    AttendanceCalendarResponse,
    CalendarDay,
} from "@app/pages/employee/attendance/personal/views/overview/calendar/types";
import {
    chartStatsFromCalendarDays,
    monthsCoveringRange,
    type CalendarChartStats,
} from "./calendarChartStats";

async function loadMonth(employeeId: string, month: string): Promise<AttendanceCalendarResponse> {
    const res = await fetchAttendanceCalendar(employeeId, month);
    return (res?.data ?? res) as AttendanceCalendarResponse;
}

export function useCalendarChartStats(
    employeeId: string | undefined,
    from: Dayjs | null | undefined,
    to: Dayjs | null | undefined,
    opts: { throughToday?: boolean } = {},
): CalendarChartStats & { isLoading: boolean; isError: boolean } {
    const fromISO = from?.isValid() ? from.format("YYYY-MM-DD") : "";
    const toISO = to?.isValid() ? to.format("YYYY-MM-DD") : "";
    const months = useMemo(
        () => (fromISO && toISO ? monthsCoveringRange(fromISO, toISO) : []),
        [fromISO, toISO],
    );

    const queries = useQueries({
        queries: months.map((month) => ({
            queryKey: ["attendance-calendar", employeeId, month] as const,
            queryFn: () => loadMonth(employeeId!, month),
            enabled: Boolean(employeeId && month && fromISO && toISO),
            staleTime: 5 * 60 * 1000,
        })),
    });

    const isLoading = queries.some((q) => q.isPending);
    const isError = queries.some((q) => q.isError);
    // Stable key so we don't rebuild day arrays on every render (useQueries returns a fresh array).
    const dataUpdatedKey = queries.map((q) => `${q.dataUpdatedAt}:${q.fetchStatus}`).join("|");

    const days = useMemo(() => {
        const all: CalendarDay[] = [];
        for (const q of queries) {
            const monthDays = q.data?.days;
            if (monthDays?.length) all.push(...monthDays);
        }
        return all;
        // queries is closed over; dataUpdatedKey flips when any month lands or refetches.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataUpdatedKey]);

    const throughToday = opts.throughToday === true;
    const stats = useMemo(
        () => chartStatsFromCalendarDays(days, {
            fromISO: fromISO || undefined,
            toISO: toISO || undefined,
            throughToday,
        }),
        [days, fromISO, toISO, throughToday],
    );

    return {
        ...stats,
        isLoading,
        isError,
    };
}

/** Convenience for a single calendar month ending on `endDate`. */
export function useMonthlyCalendarChartStats(
    employeeId: string | undefined,
    month: Dayjs,
    endDate: Dayjs,
    dateSettingsEnabled: boolean,
) {
    const today = dayjs();
    const isCurrentMonth = today.isSame(month, "month");
    const from = month.startOf("month");
    const to = dateSettingsEnabled && isCurrentMonth ? endDate : month.endOf("month");
    return useCalendarChartStats(employeeId, from, to, {
        throughToday: dateSettingsEnabled && isCurrentMonth,
    });
}

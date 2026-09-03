/**
 * The calendar's data layer — one request, React Query, socket-invalidated.
 *
 * What it replaces: three `useEffect`s that between them called
 * `fetchCompanyOverview` two to three times, `fetchEmployeeLeaves` twice (with
 * no date range, so the employee's ENTIRE leave history came back to paint one
 * month), `fetchAllPublicHolidays` two to three times, and ran three of those
 * stages sequentially rather than in parallel — then derived day status in the
 * browser from the results.
 *
 * All of that is now `GET /api/employee/attendance/calendar?employeeId=&month=`,
 * which returns days already resolved by the same engine payroll and the admin
 * boards use (`annotateAttendanceVerdicts`). Nothing below this line decides
 * what a day means.
 */
import { useEffect, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchAttendanceCalendar } from '@services/employee';
import { getSocket } from '@utils/socketClient';
import type { AttendanceCalendarResponse } from './types';

export interface UseAttendanceCalendarResult {
    data?: AttendanceCalendarResponse;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
}

const calendarKey = (employeeId: string, month?: string) =>
    month ? (['attendance-calendar', employeeId, month] as const) : (['attendance-calendar', employeeId] as const);

async function loadMonth(employeeId: string, month: string): Promise<AttendanceCalendarResponse> {
    const res = await fetchAttendanceCalendar(employeeId, month);
    // `successHandler` wraps every payload in { message, statusCode, data }.
    return (res?.data ?? res) as AttendanceCalendarResponse;
}

export function useAttendanceCalendar(employeeId: string, month: string): UseAttendanceCalendarResult {
    const qc = useQueryClient();
    const enabled = Boolean(employeeId && month);

    const query = useQuery({
        queryKey: calendarKey(employeeId, month),
        enabled,
        placeholderData: keepPreviousData, // arrowing between months never flashes empty
        queryFn: () => loadMonth(employeeId, month),
    });

    /**
     * Realtime. The screen already listened for approval and leave events but
     * NOT for `attendance_updated` — so a biometric punch refreshed the card
     * beside the calendar and left the calendar itself stale.
     */
    useEffect(() => {
        if (!employeeId) return;
        const socket = getSocket();
        const invalidate = () => qc.invalidateQueries({ queryKey: calendarKey(employeeId) });
        const events = ['attendance_updated', 'approval:updated', 'approval:cancelled', 'leaveRequests:updated'];
        events.forEach((e) => socket.on(e, invalidate));
        return () => events.forEach((e) => socket.off(e, invalidate));
    }, [employeeId, qc]);

    /** Prefetch the neighbours — same fetcher, so the cache is never seeded with a stub. */
    useEffect(() => {
        if (!enabled) return;
        [-1, 1].forEach((delta) => {
            const adj = dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM');
            qc.prefetchQuery({
                queryKey: calendarKey(employeeId, adj),
                queryFn: () => loadMonth(employeeId, adj),
                staleTime: 5 * 60 * 1000,
            });
        });
    }, [enabled, employeeId, month, qc]);

    return useMemo(
        () => ({
            data: query.data,
            isLoading: query.isPending,
            isError: query.isError,
            refetch: () => void query.refetch(),
        }),
        [query.data, query.isPending, query.isError, query.refetch],
    );
}

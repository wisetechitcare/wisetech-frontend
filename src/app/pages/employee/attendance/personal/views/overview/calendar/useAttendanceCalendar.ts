/**
 * The calendar's data layer — React Query, which this screen already had
 * available and never used.
 *
 * What it replaces: three `useEffect`s that between them called
 * `fetchCompanyOverview` two to three times, `fetchEmployeeLeaves` twice (with
 * no date range, so the employee's ENTIRE leave history came back to paint one
 * month), `fetchAllPublicHolidays` two to three times, and ran three of those
 * stages sequentially rather than in parallel.
 *
 * Query-key dedup fixes most of that for free: `fetchCompanyOverview` becomes
 * one shared query no matter how many components ask for it.
 *
 * ⚠️ This hook composes the calendar CLIENT-side as a bridge. When
 * `GET /api/employee/attendance/calendar` ships, the body of `queryFn` becomes
 * a single call and `composeDays` moves to the server unchanged.
 */
import { useEffect, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import type { RootState } from '@redux/store';
import { fetchAttendanceDetails, fetchEmployeeLeaves, getAttendanceRequest } from '@services/employee';
import { fetchAllPublicHolidays, fetchCompanyOverview } from '@services/company';
import { resolveActiveOrgId } from '@utils/activeOrg';
import { parseWorkingDays } from '@utils/workingDays';
import { MUMBAI_TZ } from '@utils/date';
import { getSocket } from '@utils/socketClient';
import { composeDays, summarize } from './composeDays';
import { deriveLegend } from './AttendanceCalendarPanel';
import type { AttendanceCalendarResponse } from './types';

/**
 * The company id, as ONE shared query.
 *
 * `fetchCompanyOverview` is currently called from at least three places on this
 * screen alone. Behind a stable key it is fetched once and shared — the single
 * cheapest win in the whole migration.
 */
export function useCompanyId() {
  return useQuery({
    queryKey: ['company-overview'],
    queryFn: async () => {
      const { data: { companyOverview } } = await fetchCompanyOverview();
      return resolveActiveOrgId(companyOverview) ?? '';
    },
    staleTime: 30 * 60 * 1000, // org identity does not change mid-session
    gcTime: 60 * 60 * 1000,
  });
}

interface CalendarScope {
  employeeId: string;
  companyId: string;
  timezone: string;
  workingDays: Record<string, string> | null;
  dateOfJoining: string | null;
}

/**
 * One month, fetched and composed. Module-level so the live query and the
 * prefetch share it — a prefetch with a different fetcher is a cache poisoned
 * with a stub.
 *
 * When the endpoint ships this whole body collapses to a single GET.
 */
async function fetchCalendarMonth(month: string, scope: CalendarScope): Promise<AttendanceCalendarResponse> {
  const { employeeId, companyId, timezone, workingDays, dateOfJoining } = scope;
  const cursor = dayjs(`${month}-01`);
  const startDate = cursor.startOf('month').format('YYYY-MM-DD');
  const endDate = cursor.endOf('month').format('YYYY-MM-DD');

  // Parallel, not the sequential three-stage waterfall this screen runs today.
  const [attendanceRes, leavesRes, holidaysRes, requestsRes] = await Promise.all([
    fetchAttendanceDetails(employeeId, cursor.month() + 1, cursor.year()),
    fetchEmployeeLeaves(employeeId),
    fetchAllPublicHolidays('India', companyId),
    // A missing request list must not blank the month — the grid is still correct without it.
    getAttendanceRequest(employeeId, startDate, endDate).catch(() => ({ data: { attendanceRequests: [] } })),
  ]);

  const days = composeDays({
    month,
    timezone,
    attendance: attendanceRes?.data?.attendance ?? [],
    leaves: leavesRes?.data?.leaves ?? [],
    holidays: holidaysRes?.data?.publicHolidays ?? [],
    requests: requestsRes?.data?.attendanceRequests ?? [],
    workingDays,
    dateOfJoining,
  });

  return { month, timezone, employeeId, days, summary: summarize(days), legend: deriveLegend(days) };
}

export interface UseAttendanceCalendarResult {
  data?: AttendanceCalendarResponse;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useAttendanceCalendar(employeeId: string, month: string): UseAttendanceCalendarResult {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();

  // Branch scope comes from the employee already in Redux — no extra request.
  const { timezone, workingDays, dateOfJoining } = useSelector((s: RootState) => {
    const emp = s.employee?.currentEmployee;
    const wd = parseWorkingDays(emp?.branches?.workingAndOffDays);
    return {
      // The employee's OWN branch zone. `MUMBAI_TZ` is the last-resort fallback,
      // not the default the current code hardcodes for everyone.
      timezone: emp?.branches?.timezone || MUMBAI_TZ,
      workingDays: Object.keys(wd || {}).length ? wd : null,
      // Redux holds this as `string | Date` depending on which fetch populated
      // it; normalise once here so nothing downstream has to branch on it.
      dateOfJoining: emp?.dateOfJoining ? dayjs(emp.dateOfJoining).format('YYYY-MM-DD') : null,
    };
  });

  const enabled = Boolean(employeeId && month && companyId);

  const scope = useMemo(
    () => ({ employeeId, companyId: companyId as string, timezone, workingDays, dateOfJoining }),
    [employeeId, companyId, timezone, workingDays, dateOfJoining],
  );

  const query = useQuery({
    queryKey: ['attendance-calendar', employeeId, month, companyId],
    enabled,
    placeholderData: keepPreviousData, // arrowing between months never flashes empty
    queryFn: () => fetchCalendarMonth(month, scope),
  });

  /**
   * Realtime. The screen already listens for approval and leave events but NOT
   * for `attendance_updated` — so a biometric punch refreshed the card beside
   * the calendar and left the calendar stale.
   */
  useEffect(() => {
    if (!employeeId) return;
    const socket = getSocket();
    const invalidate = () => qc.invalidateQueries({ queryKey: ['attendance-calendar', employeeId] });
    const events = ['attendance_updated', 'approval:updated', 'approval:cancelled', 'leaveRequests:updated'];
    events.forEach((e) => socket.on(e, invalidate));
    return () => events.forEach((e) => socket.off(e, invalidate));
  }, [employeeId, qc]);

  /** Prefetch the neighbours — the SAME fetcher, so the cache is never seeded with a stub. */
  useEffect(() => {
    if (!enabled) return;
    [-1, 1].forEach((delta) => {
      const adj = dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM');
      qc.prefetchQuery({
        queryKey: ['attendance-calendar', employeeId, adj, companyId],
        queryFn: () => fetchCalendarMonth(adj, scope),
        staleTime: 5 * 60 * 1000,
      });
    });
  }, [enabled, employeeId, month, companyId, qc, scope]);

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

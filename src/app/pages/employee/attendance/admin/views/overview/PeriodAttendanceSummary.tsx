import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { Box, Typography } from "@mui/material";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import EmployeeIdentityCell from "@app/modules/common/components/EmployeeIdentityCell";
import { GlassDialog, GlassHeader, ToneChip, AutoGrid, GlassCard } from "@app/modules/common/components/ui";
import { KTIcon } from "@metronic/helpers";
import { RootState } from "@redux/store";
import { safeJsonParse } from "@utils/safeJson";
import { formatDateLong } from "@utils/dateFormats";
import { resourceNameMapWithCamelCase } from "@constants/statistics";
import { fetchAllEmployees, fetchEmployeesOnLeaveRange, fetchAttendanceClassificationBatch } from "@services/employee";
import { useTeamFilter } from "@/contexts/TeamFilterContext";
import { useAttendanceRealtime } from "@hooks/useAttendanceRealtime";
import Loader from "@app/modules/common/utils/Loader";
import { countWorkingDays } from "@utils/periodRange";
import { getEmployeeStatus } from "@utils/employeeStatus";
import { employeeIdSet } from "@utils/activeEmployee";
import { saveEmployeesAttendance } from "@redux/slices/attendance";
import type { PeriodRange } from "@app/modules/common/components/PeriodFilter";
import type { IEmployeesAttendance } from "@models/employee";
import { fetchEmpsAttendanceRange, transformAttendance } from "./DailyAttendance";
import {
    summarizeAttendanceByEmployee,
    formatWorkedMinutes,
    type EmployeePeriodSummary,
    type ClassificationCounts,
} from "./attendancePeriodSummary";

/**
 * PeriodAttendanceSummary — the Attendance table in Weekly/Monthly mode: one row per
 * employee with counts for the period, and a day-by-day drill-in.
 *
 * A separate component rather than a mode inside `DailyAttendance` on purpose. That file
 * is ~800 lines of single-day column definitions, status tinting and threshold config;
 * branching it two ways would make both shapes harder to reason about and put the daily
 * table — the one people use every day — at risk. Here it stays untouched, and this
 * component reuses its exported `transformAttendance` so the two can never disagree
 * about a day's status.
 */

interface PeriodAttendanceSummaryProps {
    /** Must be a multi-day range; the caller renders `DailyAttendance` for a single day. */
    range: PeriodRange;
}

/**
 * Small count cell — zero is muted so the non-zero numbers are what the eye lands on,
 * and `null` renders "—" because "not yet classified" is not the same claim as "zero".
 */
const CountCell = ({ value, tone }: { value: number | null; tone: 'success' | 'danger' | 'warning' | 'brand' }) => {
    if (value === null || value === undefined) {
        return <Typography component="span" sx={{ fontSize: '0.82rem', color: 'text.disabled' }} title="Not available for this employee">—</Typography>;
    }
    if (!value) return <Typography component="span" sx={{ fontSize: '0.82rem', color: 'text.disabled' }}>0</Typography>;
    return <ToneChip tone={tone} dense label={String(value)} />;
};

function PeriodAttendanceSummary({ range }: PeriodAttendanceSummaryProps) {
    const dispatch = useDispatch();
    const { filterIds } = useTeamFilter();
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const getAllWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);

    const [rows, setRows] = useState<IEmployeesAttendance[]>([]);
    const [roster, setRoster] = useState<any[]>([]);
    const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
    const [classifications, setClassifications] = useState<Map<string, ClassificationCounts>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [openEmployee, setOpenEmployee] = useState<string | null>(null);

    // Primitive bounds, not the PeriodRange object: PeriodFilter rebuilds it (with fresh
    // Dayjs instances) on every render, so depending on the object refetches forever.
    const startWire = range.start ? range.start.format('YYYY-MM-DD') : '';
    const endWire = range.end ? range.end.format('YYYY-MM-DD') : '';

    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const load = useCallback(async (silent = false) => {
        if (!startWire || !endWire) return;
        if (!silent) setIsLoading(true);
        try {
            // One round trip each, in parallel — the three are independent, and serialising
            // them would make the section's time-to-content the sum rather than the max.
            const [attendance, employeesRes, leaveResp] = await Promise.all([
                fetchEmpsAttendanceRange(startWire, endWire),
                // Scoped to the SAME window as the attendance and leave calls.
                // A summary for August must cover whoever was employed during
                // August — including someone who left on the 14th, for the days
                // they were there — which is how payroll already reads a period.
                fetchAllEmployees(true, startWire, endWire),
                fetchEmployeesOnLeaveRange(startWire, endWire),
            ]);
            if (!isMountedRef.current) return;
            setRows(attendance || []);
            /**
             * No `filterActiveEmployees` here any more.
             *
             * The server has already scoped this roster by the employment
             * TIMELINE for the window. Re-filtering on `isActive` would undo
             * that in both directions: it drops someone employed during the
             * period who has since left (the whole point of a historical
             * summary), and it drops anyone whose flag is stale-off — the
             * backfill found two people employed today flagged inactive, who
             * were therefore missing from boards entirely.
             *
             * The flag is a manual suspend switch. The dates are the authority.
             */
            setRoster(employeesRes?.data?.employees || []);
            setLeaveRecords(leaveResp?.data?.leaveRecords || []);
        } catch (error) {
            console.error('Error loading period attendance summary:', error);
            if (isMountedRef.current) { setRows([]); setRoster([]); setLeaveRecords([]); }
        } finally {
            if (isMountedRef.current && !silent) setIsLoading(false);
        }
    }, [startWire, endWire]);

    useEffect(() => { load(); }, [load]);
    // Silent so a biometric punch refreshes the numbers without flashing the loader.
    useAttendanceRealtime(() => load(true));

    // Roster ids as a primitive so this effect keys off the ACTUAL id set, not the array
    // identity — `roster` is a fresh array after every refetch, including silent ones.
    const rosterIdsKey = useMemo(
        () => roster.map((e: any) => e?.id).filter(Boolean).sort().join(','),
        [roster],
    );

    /**
     * Late / early-out come from the server's classification engine, which needs the
     * roster ids — so it can only start once the roster lands. Deliberately its own
     * effect rather than a step inside `load`: it is the slowest call by far (it scores
     * every employee against their shift and deadline override), and the other five
     * columns must not wait on it. The table renders, then these two fill in.
     */
    useEffect(() => {
        if (!rosterIdsKey || !startWire || !endWire) {
            setClassifications(new Map());
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const ids = rosterIdsKey.split(',');
                const { data } = await fetchAttendanceClassificationBatch(ids, startWire, endWire);
                if (cancelled) return;
                const next = new Map<string, ClassificationCounts>();
                for (const [employeeId, counts] of Object.entries(data?.classifications || {})) {
                    next.set(employeeId, {
                        lateCheckins: counts?.lateCheckins ?? 0,
                        earlyCheckouts: counts?.earlyCheckouts ?? 0,
                    });
                }
                setClassifications(next);
            } catch (error) {
                // Non-fatal: every other number is still correct, and the two columns
                // show "—" rather than a 0 that would read as "never late".
                console.error('Error loading attendance classifications:', error);
                if (!cancelled) setClassifications(new Map());
            }
        })();
        // Guards against a slow response for a previous period overwriting a newer one.
        return () => { cancelled = true; };
    }, [rosterIdsKey, startWire, endWire]);

    const weekends = useMemo(() => safeJsonParse(getAllWeekends), [getAllWeekends]);

    /** Non-weekend days in the window — the denominator for "absent". */
    const workingDays = useMemo(() => countWorkingDays(range, weekends), [range, weekends]);

    /**
     * Per-employee working-day denominator, clipped to their own employment
     * inside the period.
     *
     * The period figure above is the right number for a heading ("22 working
     * days in August") and the wrong one for an individual: someone who left on
     * the 14th had 10, and charging them 22 invented twelve absences for days
     * they were not employed. That is what the Absent drill-in was showing.
     *
     * Memoised as a Map rather than computed per row: the summary calls this
     * once per employee, and re-walking the month for each of ~210 people on
     * every render would be ~4,600 date steps per keystroke elsewhere on the page.
     *
     * `getEmployeeStatus` is the shared frontend twin of the backend's
     * employment-window predicate, and is rejoin-aware.
     */
    const workingDaysByEmployee = useMemo(() => {
        const map = new Map<string, number>();
        for (const e of roster as any[]) {
            if (!e?.id) continue;
            map.set(e.id, countWorkingDays(range, weekends, (day) => getEmployeeStatus(e, day) === 1));
        }
        return map;
    }, [roster, range, weekends]);

    const workingDaysFor = useCallback(
        // Falls back to the period figure only for someone absent from the roster
        // entirely (a row for a person the roster query did not return), where no
        // employment dates are available to clip with.
        (employeeId: string) => workingDaysByEmployee.get(employeeId) ?? workingDays,
        [workingDaysByEmployee, workingDays],
    );

    /**
     * employeeId → weighted leave days inside the window. A leave row is a SPAN, so it is
     * expanded day by day and clipped to the window and to working days — counting the
     * whole span would credit June days to a July total.
     */
    const leaveDaysByEmployee = useMemo(() => {
        const totals = new Map<string, number>();
        if (!range.start || !range.end) return totals;
        const rangeStart = range.start.startOf('day');
        const rangeEnd = range.end.startOf('day');

        for (const record of leaveRecords) {
            if (!record?.employeeId) continue;
            let cursor = dayjs(record.dateFrom).startOf('day');
            const last = dayjs(record.dateTo).startOf('day');
            if (!cursor.isValid() || !last.isValid()) continue;
            while (cursor.isBefore(last) || cursor.isSame(last, 'day')) {
                const inWindow = !cursor.isBefore(rangeStart) && !cursor.isAfter(rangeEnd);
                const isWorkingDay = weekends?.[cursor.format('dddd').toLowerCase()] !== '0';
                if (inWindow && isWorkingDay) {
                    totals.set(record.employeeId, (totals.get(record.employeeId) ?? 0) + (record.isHalfDay ? 0.5 : 1));
                }
                cursor = cursor.add(1, 'day');
            }
        }
        return totals;
    }, [leaveRecords, range.start, range.end, weekends]);

    /**
     * Attendance rows for the period, restricted to people still on the roster.
     *
     * The roster is already active-only, so this also drops historical rows belonging to
     * leavers. It matters twice over: `summarizeAttendanceByEmployee` deliberately keeps
     * rows whose employee it wasn't seeded with (so worked time is never silently lost),
     * which would otherwise re-introduce an inactive employee as a summary row; and these
     * same rows feed the Working Time chart via Redux.
     */
    const transformedRows = useMemo(() => {
        const transformed = transformAttendance(rows as any, weekends);
        // The roster is already server-scoped to this period, so take its ids as-is.
        // Re-applying the isActive flag here would drop exactly the leavers a
        // historical summary exists to include.
        const activeIds = employeeIdSet(roster as any);
        // No roster yet (first paint) — don't blank the table, the filter applies once it lands.
        if (!activeIds.size) return transformed;
        return transformed.filter((row) => !row.employeeId || activeIds.has(row.employeeId));
    }, [rows, weekends, roster]);

    // Publish the period's rows to the same Redux slice DailyAttendance fills for a
    // single day. The Working Time chart reads that slice, so it follows the period
    // without a second data path or a range-aware copy of its series builder.
    useEffect(() => {
        dispatch(saveEmployeesAttendance(transformedRows));
    }, [dispatch, transformedRows]);

    const summaries = useMemo(() => {
        const transformed = transformedRows;
        const scoped = filterIds
            ? roster.filter((e: any) => filterIds.includes(e.id))
            : roster;
        const result = summarizeAttendanceByEmployee(transformed, {
            roster: scoped.map((e: any) => ({
                _id: e.id,
                firstName: e.users?.firstName,
                lastName: e.users?.lastName,
                employeeCode: e.employeeCode,
                avatar: e.avatar ?? e.users?.avatar ?? null,
            })),
            workingDaysFor,
            leaveDaysByEmployee,
            classificationByEmployee: classifications,
        });
        // Most absences first — the reason an admin opens a month at all. Name breaks ties
        // so the order is deterministic across refetches.
        return result.sort((a, b) => b.absent - a.absent || a.name.localeCompare(b.name));
    }, [transformedRows, roster, workingDaysFor, leaveDaysByEmployee, classifications, filterIds]);

    const openSummary = useMemo(
        () => summaries.find((s) => s.employeeId === openEmployee) ?? null,
        [summaries, openEmployee],
    );

    const columns = useMemo(() => ([
        {
            accessorKey: 'name',
            header: 'Employee',
            size: 240,
            Cell: ({ row }: any) => (
                <EmployeeIdentityCell
                    name={row.original.name}
                    code={row.original.code}
                    avatarUrl={row.original.avatar}
                    dense
                />
            ),
        },
        {
            accessorKey: 'present',
            header: 'Present',
            size: 110,
            Cell: ({ row }: any) => <CountCell value={row.original.present} tone="success" />,
        },
        {
            accessorKey: 'absent',
            header: 'Absent',
            size: 110,
            Cell: ({ row }: any) => <CountCell value={row.original.absent} tone="danger" />,
        },
        {
            accessorKey: 'leave',
            header: 'Leave',
            size: 110,
            Cell: ({ row }: any) => <CountCell value={row.original.leave} tone="warning" />,
        },
        {
            accessorKey: 'lateCheckins',
            header: 'Late Check-in',
            size: 130,
            // Server-scored (countLateCheckins) — honours each employee's check-in
            // deadline override, so this agrees with salary and KPI by construction.
            Cell: ({ row }: any) => <CountCell value={row.original.lateCheckins} tone="danger" />,
        },
        {
            accessorKey: 'earlyCheckouts',
            header: 'Early Check-out',
            size: 140,
            Cell: ({ row }: any) => <CountCell value={row.original.earlyCheckouts} tone="warning" />,
        },
        {
            accessorKey: 'checkoutMissing',
            header: 'Check-out Missing',
            size: 150,
            Cell: ({ row }: any) => <CountCell value={row.original.checkoutMissing} tone="warning" />,
        },
        {
            accessorKey: 'workedMinutes',
            header: 'Total Hours',
            size: 130,
            // Sorts on the numeric accessor, renders the formatted string — sorting the
            // display text would order "9h 5m" after "142h 10m".
            Cell: ({ row }: any) => (
                <Typography component="span" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    {formatWorkedMinutes(row.original.workedMinutes)}
                </Typography>
            ),
        },
        {
            id: 'details',
            header: '',
            size: 90,
            enableSorting: false,
            Cell: ({ row }: any) => (
                <Box
                    component="button"
                    type="button"
                    onClick={() => setOpenEmployee(row.original.employeeId)}
                    aria-label={`View each day for ${row.original.name}`}
                    sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.25,
                        border: 0, background: 'none', p: 0, cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 700, color: 'primary.main',
                    }}
                >
                    Details
                    <KTIcon iconName="right" className="fs-7" />
                </Box>
            ),
        },
    ]), []);

    if (isLoading) return <Loader />;

    return (
        <>
            <div className="d-flex flex-row mt-8 justify-content-between align-items-center flex-wrap gap-2">
                <h3 className="fw-bold mb-0">Attendance Summary</h3>
                <Typography component="span" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {summaries.length} {summaries.length === 1 ? 'employee' : 'employees'} · {workingDays} working {workingDays === 1 ? 'day' : 'days'}
                </Typography>
            </div>

            <MaterialTable
                columns={columns as any}
                data={summaries}
                tableName="Attendance Summary"
                resource={resourceNameMapWithCamelCase.attendanceReport}
                viewOwn={true}
                viewOthers={true}
                employeeId={employeeIdCurrent}
                checkOwnWithOthers={true}
                manualPagination={false}
                persistPreferences={false}
            />

            <GlassDialog
                open={!!openSummary}
                onClose={() => setOpenEmployee(null)}
                maxWidth="lg"
                scroll="paper"
                header={
                    <GlassHeader
                        title={openSummary?.name || ''}
                        subtitle={`${formatDateLong(range.start)} → ${formatDateLong(range.end)}`}
                        onClose={() => setOpenEmployee(null)}
                        icon={<KTIcon iconName="people" className="fs-2 text-white" />}
                        closeIcon={<KTIcon iconName="cross" className="fs-3" />}
                    />
                }
            >
                <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 2.75 }, py: 2 }}>
                    {openSummary && <DayBreakdown summary={openSummary} />}
                </Box>
            </GlassDialog>
        </>
    );
}

/** Day-by-day rows for one employee — the drill-in behind a summary row. */
function DayBreakdown({ summary }: { summary: EmployeePeriodSummary }) {
    if (!summary.days.length) {
        return (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', textAlign: 'center', py: 4 }}>
                No attendance records in this period — {summary.absent} working {summary.absent === 1 ? 'day' : 'days'} unaccounted for.
            </Typography>
        );
    }

    return (
        <AutoGrid min={232} gap={10}>
            {summary.days.map((day) => (
                <GlassCard key={day.id} preset="row" sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
                        <Typography component="span" sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary' }}>
                            {formatDateLong(day.date)}
                        </Typography>
                        <ToneChip tone="brand" dense label={day.day} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
                        <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {day.checkIn} → {day.checkOut}
                        </Typography>
                        <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {day.duration}
                        </Typography>
                    </Box>
                </GlassCard>
            ))}
        </AutoGrid>
    );
}

export default PeriodAttendanceSummary;

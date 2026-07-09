import { resourseAndView } from '@models/company';
import { RootState } from '@redux/store';
import {
    fetchEmpWeeklyKpiStatistics
} from '@utils/statistics';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Col, Row, Container } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import LeaderBoardCore from './LeaderBoardCore';

import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
const iconMapping: Record<string, string> = {
    Attendance: AttendanceIcon,
    Leaves: LeavesIcon,
    Projects: AttendanceIcon,
    Tasks: AttendanceIcon,
    Sale: AttendanceIcon,
    Target: AttendanceIcon,
    Performance: AttendanceIcon,
    "Ratings & Reviews": AttendanceIcon,
};
const Weekly = ({
    startWeek,
    endWeek,
    fromAdmin = false,
    resourseAndView,
    dateSettingsEnabled = false
}: {
    startWeek: Dayjs,
    endWeek: Dayjs,
    fromAdmin?: boolean,
    resourseAndView: resourseAndView[],
    dateSettingsEnabled?: boolean
    
}) => {
    const dispatch = useDispatch();
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const selectedEmployeeId = useSelector((state: RootState) => state.employee.selectedEmployee?.id || state.employee.currentEmployee.id);
    const [dataLoaded, setDataLoaded] = useState(true)
    const [data, setData] = useState<any>(null);
    const [maxTotalScore, setMaxTotalScore] = useState<number>(0);
    // ── 1. Create STABLE effective dates ONLY ONCE ──
    const effectiveStartDate = useMemo(() => startWeek.startOf("week"), [startWeek.valueOf()]);
    const effectiveEndDate = useMemo(() => {
        return dateSettingsEnabled && dayjs().isSame(startWeek, "week")
            ? dayjs()
            : endWeek.endOf("week");
    }, [startWeek.valueOf(), endWeek.valueOf(), dateSettingsEnabled]);

    // ── 2. Data fetching effect ──
    useEffect(() => {
        if (!selectedEmployeeId) return;
        const controller = new AbortController();

        const loadData = async () => {
            setDataLoaded(false);
            try {
                const response = await fetchEmpWeeklyKpiStatistics(
                    effectiveStartDate,
                    effectiveEndDate,
                    fromAdmin,
                    controller.signal
                );
                if (response) {
                    setData(response.modules);
                    setMaxTotalScore(response.maxTotal || 0);
                }
            } catch (error) {
                if (axios.isCancel(error)) return;
                if (error instanceof Error && error.name === "AbortError") return;
                console.error("Error fetching Weekly KPI Statistics:", error);
            } finally {
                setDataLoaded(true);
            }
        };

        loadData();
        return () => controller.abort();
    }, [effectiveStartDate, effectiveEndDate, selectedEmployeeId, fromAdmin, toggleChange]);

    const overviewData = [
        {
            icon: iconMapping["Attendance"],
            label: "Attendance",
            score:
                data?.find((m: any) => m.moduleName === "Attendance")?.totalScore ?? 0,
        },
        {
            icon: iconMapping["Leaves"],
            label: "Leaves",
            score: data?.find((m: any) => m.moduleName === "Leaves")?.totalScore ?? 0,
        },
        {
            icon: iconMapping["Projects"],
            label: "Projects",
            score:
                data?.find((m: any) => m.moduleName === "Projects")?.totalScore ?? 0,
        },
        {
            icon: iconMapping["Tasks"],
            label: "Tasks",
            score: data?.find((m: any) => m.moduleName === "Tasks")?.totalScore ?? 0,
        },
        {
            icon: iconMapping["Sale"],
            label: "Sale",
            score: data?.find((m: any) => m.moduleName === "Sale")?.totalScore ?? 0,
        },
        {
            icon: iconMapping["Target"],
            label: "Target",
            score: data?.find((m: any) => m.moduleName === "Target")?.totalScore ?? 0,
        },
        {
            icon: iconMapping["Performance"],
            label: "Performance",
            score:
                data?.find((m: any) => m.moduleName === "Performance")?.totalScore ?? 0,
        },
        {
            icon: iconMapping["Ratings & Reviews"],
            label: "Ratings & Reviews",
            score:
                data?.find((m: any) => m.moduleName === "Ratings & Reviews")
                    ?.totalScore ?? 0,
        },
    ];

    return (
        <>
           <LeaderBoardCore period="weekly"
            overviewData={overviewData}
            startDate={effectiveStartDate}
            endDate={effectiveEndDate}
            fromAdmin={fromAdmin}
            resourseAndView={resourseAndView}
            finalMaxTotalScore={maxTotalScore}
            isLoading={!dataLoaded}
            />
        </>
    );
};

export default Weekly;
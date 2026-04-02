import { resourseAndView } from '@models/company';
import { RootState } from '@redux/store';
import {
    fetchEmpWeeklyKpiStatistics
} from '@utils/statistics';
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

    // Calculate effectiveEndDate outside useEffect so it can be used for LeaderBoardCore
    const today = dayjs();
    const isCurrentWeek =
        (today.isAfter(startWeek, "day") && today.isBefore(endWeek, "day")) ||
        today.isSame(startWeek, "day") ||
        today.isSame(endWeek, "day");

    const effectiveEndDate =
        dateSettingsEnabled && isCurrentWeek ? today : endWeek;

    // Data fetching effect
    useEffect(() => {
        if (!selectedEmployeeId || !effectiveEndDate) return;

        const loadData = async () => {
            setDataLoaded(false);

            try {
                const response = await fetchEmpWeeklyKpiStatistics(
                    startWeek,
                    effectiveEndDate,
                    fromAdmin
                );

                if (response) {
                    setData(response.modules); // This now contains the modules fetched
                }
            } catch (error) {
                console.error("Error fetching Weekly KPI Statistics:", error);
            } finally {
                setDataLoaded(true);
            }
        };

        loadData();
    }, [
        selectedEmployeeId,
        startWeek,
        fromAdmin,
        toggleChange,
        dateSettingsEnabled,
    ]);

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



    if (!dataLoaded) {
        return <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </Container>
    }

    return (
        <>
            <LeaderBoardCore overviewData={overviewData} startDate={dayjs(startWeek)} endDate={effectiveEndDate} fromAdmin={fromAdmin} resourseAndView={resourseAndView} />
        </>
    );
};

export default Weekly;
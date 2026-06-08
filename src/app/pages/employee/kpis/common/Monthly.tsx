import { RootState } from '@redux/store';
import { fetchEmpMonthlyKpiStatistics } from '@utils/statistics';
import { hasPermission } from '@utils/authAbac';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { useEffect, useMemo, useState } from 'react';
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
import { Container, Row } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { resourseAndView } from '@models/company';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import LeaderBoardCore from './LeaderBoardCore';
import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";

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

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
const Monthly = ({ month, endDate, fromAdmin = false, resourseAndView, dateSettingsEnabled = false }: {
    month: Dayjs,
    endDate: Dayjs,
    fromAdmin?: boolean,
    resourseAndView: resourseAndView[],
    dateSettingsEnabled?: boolean
}) => {
    const dispatch = useDispatch();
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const selectedEmployeeId = useSelector((state: RootState) => state.employee.selectedEmployee?.id || state.employee.currentEmployee.id);

    const [totalWorkingHours, setTotalWorkingHours] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const effectiveEndDate: Dayjs =
        dateSettingsEnabled && month.isSame(dayjs(), "month")
            ? endDate
            : month.endOf("month");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const response = await fetchEmpMonthlyKpiStatistics(month, fromAdmin, {
                    startDate: month.startOf("month"),
                    endDate: effectiveEndDate,
                });

                if (response) {
                    setData(response.modules);
                }
            } catch (error) {
                console.error("Error fetching Monthly KPI Statistics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [month, toggleChange]);

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


    if (loading) {
        return <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </Container>
    }

    return (
        <>
            <LeaderBoardCore overviewData={overviewData} startDate={dayjs(month.startOf('month'))} endDate={effectiveEndDate} fromAdmin={fromAdmin} resourseAndView={resourseAndView} />
        </>
    );
};

export default Monthly;
import { RootState } from '@redux/store';
import { fetchEmpYearlyKpiStatistics } from '@utils/statistics';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Container, Row } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { resourseAndView } from '@models/company';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
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

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);


const Custom = ({ startDate, endDate, fromAdmin = false, resourseAndView }: {
    startDate: Dayjs,
    endDate: Dayjs,
    fromAdmin?: boolean,
    resourseAndView: resourseAndView[],
}) => {
    const dispatch = useDispatch();
    const selectedEmployeeId = useSelector((state: RootState) => state.employee.selectedEmployee?.id || state.employee.currentEmployee.id);

    const [totalWorkingHours, setTotalWorkingHours] = useState(0);
    const [topEmployeeByEachModule , setTopEmployeeByEachModule ] = useState([])

    const toggleChange = useSelector(
        (state: RootState) => state.attendanceStats.toggleChange
    );
    const [data, setData] = useState<any[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const effectiveEndDate: Dayjs =
        endDate.isSame(dayjs(), "year")
            ? endDate
            : endDate.endOf("year");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const response = await fetchEmpYearlyKpiStatistics(startDate, fromAdmin, {
                    startDate: startDate,
                    endDate: effectiveEndDate,  
                });

                if (response) {
                    
                    setData(response.modules);
                }
            } catch (error) {
                console.error("Error fetching Yearly KPI Statistics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [startDate, endDate, toggleChange]);

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
            <LeaderBoardCore  overviewData={overviewData} startDate={dayjs(dayjs(startDate).format('YYYY-MM-DD'))} endDate={dayjs(dayjs(endDate).format('YYYY-MM-DD'))} fromAdmin={fromAdmin} resourseAndView={resourseAndView} />
        </>
    );
}

export default Custom;
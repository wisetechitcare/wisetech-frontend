import { resourseAndView } from '@models/company'
import React, { useEffect, useState } from 'react'
import LeaderBoardCore from './LeaderBoardCore';
import { Container } from 'react-bootstrap';
import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { fetchEmpAllTimeKpiStatistics } from '@utils/statistics';

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

function AllTime({ fromAdmin = false, resourseAndView, dateSettingsEnabled = false }: { fromAdmin?: boolean, resourseAndView: resourseAndView[], dateSettingsEnabled?: boolean }) {
    const toggleChange = useSelector(
        (state: RootState) => state.attendanceStats.toggleChange
    );
    const currentEmployee = useSelector((state: RootState) => state.employee.currentEmployee?.id);

    const [data, setData] = useState<any[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const response = await fetchEmpAllTimeKpiStatistics();
                if (response) {                    
                    setData(response.modules);
                }
            } catch (error) {
                console.error("Error fetching All Time KPI Statistics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [toggleChange]);

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
            <LeaderBoardCore overviewData={overviewData} fromAdmin={fromAdmin} resourseAndView={resourseAndView} />
        </>
    );
}

export default AllTime

import MaterialTable from "@app/modules/common/components/MaterialTable";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { IAttendance } from "@models/employee";
import { MRT_ColumnDef } from "material-react-table";
import { useEffect, useMemo, useState } from "react";
import { KTIcon } from "@metronic/helpers";
import Identifiers from "@app/modules/common/utils/Identifiers";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { ATTENDANCE_STATUS, WORKING_METHOD_TYPE, WorkingMethod } from "@constants/attendance";
import { fetchAttendanceDetails } from "@services/employee";
import { generateDatesForMonth } from "@utils/date";
import { savePersonalAttendance } from "@redux/slices/attendance";
import { transformAttendance } from "../../OverviewView";

const newAttendanceWizardBreadcrumb: Array<PageLink> = [
    {
        title: 'Employees',
        path: '/employees',
        isSeparator: false,
        isActive: false,
    },
    {
        title: '',
        path: '',
        isSeparator: true,
        isActive: false,
    },
];

function PersonalAttendance() {
    const dispatch = useDispatch();
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const { employeeId, attendance, activeMonth, openModal } = useSelector((state: RootState) => {
        const { attendance, employee } = state;
        return {
            openModal: attendance.openModal,
            employeeId: employee.currentEmployee.id,
            attendance: attendance.personalAttendance,
            activeMonth: attendance.activeMonth,
        }
    });
    const columns = useMemo<MRT_ColumnDef<IAttendance>[]>(() => [
        {
            accessorKey: "date",
            header: "Date",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "day",
            header: "Day",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "checkIn",
            header: "Check-In",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "checkOut",
            header: "Check-Out",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "duration",
            header: "Duration",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },

        {
            accessorKey: "status",
            header: "Status",
            Cell: ({ renderedCellValue }: any) => {
                const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WEEKEND, WORKING_WEEKEND } = ATTENDANCE_STATUS;
                switch (renderedCellValue) {
                    case PRESENT:
                        return <Identifiers text={renderedCellValue} cssClass="present" />
                    case ABSENT:
                        return <Identifiers text={renderedCellValue} cssClass="absent" />
                    case CHECK_IN_MISSING:
                        return <Identifiers text={renderedCellValue} cssClass="check-in-out" />
                    case CHECK_OUT_MISSING:
                        return <Identifiers text={renderedCellValue} cssClass="check-in-out" />
                    case LEAVE:
                        return <Identifiers text={renderedCellValue} cssClass="leave" />
                    case WEEKEND:
                        return <Identifiers text={renderedCellValue} cssClass="weekend" />
                    case WORKING_WEEKEND:
                        return <Identifiers text={renderedCellValue} cssClass="working-weekend" />
                }
            }
        },
        {
            accessorKey: "workingMethod",
            header: "Work",
            Cell: ({ renderedCellValue }: any) => {

                const { OFFICE, ON_SITE, REMOTE } = WORKING_METHOD_TYPE;
                switch (renderedCellValue) {
                    case OFFICE:
                        return <Identifiers text={renderedCellValue} cssClass="working-method-office" />
                    case ON_SITE:
                        return <Identifiers text={renderedCellValue} cssClass="working-method-on-site" />
                    case REMOTE:
                        return <Identifiers text={renderedCellValue} cssClass="working-method-remote" />
                    default:
                        return renderedCellValue;
                }
            }
        },
        ...(isAdmin
            ? [{
                accessorKey: "actions",
                header: "Actions",
                Cell: ({ row }: any) => (
                    <button
                        className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                    >
                        <KTIcon iconName='pencil' className='fs-3' />
                    </button>
                ),
            }]
            : []),
    ], []);

    useEffect(() => {
        if (!activeMonth) return;

        async function fetchAttendance() {
            const month = activeMonth.getMonth() + 1;
            const year = activeMonth.getFullYear();
            const { data: { attendance } } = await fetchAttendanceDetails(employeeId, month, year);

            const dates = generateDatesForMonth(`${year}-${month}-01`);
            const personalAttendance = transformAttendance(dates, attendance);

            dispatch(savePersonalAttendance(personalAttendance));
        }

        fetchAttendance();
    }, [activeMonth]);

    return (
        <>
            <PageTitle breadcrumbs={newAttendanceWizardBreadcrumb}>Attendance & Leaves</PageTitle>
            <h3 className='pt-5 fw-bold font-barlow'>My Attendance</h3>
            <MaterialTable
                columns={columns}
                data={attendance}
                tableName="Attendance" employeeId={employeeIdCurrent}/>
        </>
    );
}

export default PersonalAttendance;
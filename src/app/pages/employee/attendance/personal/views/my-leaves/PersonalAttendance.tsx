import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';

import { PageLink, PageTitle } from "@metronic/layout/core";
import { IAttendance } from "@models/employee";

import { useEffect, useMemo, useState } from "react";
import { KTIcon } from "@metronic/helpers";
import Identifiers from "@app/modules/common/utils/Identifiers";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { usePermission } from "@hooks/usePermission";
import { ATTENDANCE_STATUS, WORKING_METHOD_TYPE, WorkingMethod } from "@constants/attendance";
import { fetchAttendanceDetails } from "@services/employee";
import { generateDatesForMonth } from "@utils/date";
import { savePersonalAttendance } from "@redux/slices/attendance";
import { transformAttendance } from "../../OverviewView";
import { Button } from '@/ds/ui/button';

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
    const isAdmin = usePermission('attendance.manage.team');
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
    const columns = useMemo<ColumnDef<IAttendance>[]>(() => [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ cell }: any) => cell.getValue()
        },
        {
            accessorKey: "day",
            header: "Day",
            cell: ({ cell }: any) => cell.getValue()
        },
        {
            accessorKey: "checkIn",
            header: "Check-In",
            cell: ({ cell }: any) => cell.getValue()
        },
        {
            accessorKey: "checkOut",
            header: "Check-Out",
            cell: ({ cell }: any) => cell.getValue()
        },
        {
            accessorKey: "duration",
            header: "Duration",
            cell: ({ cell }: any) => cell.getValue()
        },

        {
            accessorKey: "status",
            header: "Status",
            cell: ({ cell }: any) => {
                const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WEEKEND, WORKING_WEEKEND } = ATTENDANCE_STATUS;
                switch (cell.getValue()) {
                    case PRESENT:
                        return <Identifiers text={cell.getValue()} cssClass="present" />
                    case ABSENT:
                        return <Identifiers text={cell.getValue()} cssClass="absent" />
                    case CHECK_IN_MISSING:
                        return <Identifiers text={cell.getValue()} cssClass="check-in-out" />
                    case CHECK_OUT_MISSING:
                        return <Identifiers text={cell.getValue()} cssClass="check-in-out" />
                    case LEAVE:
                        return <Identifiers text={cell.getValue()} cssClass="leave" />
                    case WEEKEND:
                        return <Identifiers text={cell.getValue()} cssClass="weekend" />
                    case WORKING_WEEKEND:
                        return <Identifiers text={cell.getValue()} cssClass="working-weekend" />
                }
            }
        },
        {
            accessorKey: "workingMethod",
            header: "Work",
            cell: ({ cell }: any) => {

                const { OFFICE, ON_SITE, REMOTE } = WORKING_METHOD_TYPE;
                switch (cell.getValue()) {
                    case OFFICE:
                        return <Identifiers text={cell.getValue()} cssClass="working-method-office" />
                    case ON_SITE:
                        return <Identifiers text={cell.getValue()} cssClass="working-method-on-site" />
                    case REMOTE:
                        return <Identifiers text={cell.getValue()} cssClass="working-method-remote" />
                    default:
                        return cell.getValue();
                }
            }
        },
        ...(isAdmin
            ? [{
                accessorKey: "actions",
                header: "Actions",
                cell: ({ row }: any) => (
                    <Button variant="ghost" size="icon-sm" type="submit" aria-label="Edit"
                    >
                        <KTIcon iconName='pencil' className='fs-3' />
                    </Button>
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
            <DataTable
                caption="Attendance"
                columns={columns as any}
                data={attendance}
                getRowId={(r: any) => String(r.id ?? r.date)}
                stateKey="attendance.personal"
                groupableColumns={false}
                searchPlaceholder="Search attendance…"
            />
        </>
    );
}

export default PersonalAttendance;
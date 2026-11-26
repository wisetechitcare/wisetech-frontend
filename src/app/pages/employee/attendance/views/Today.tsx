import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';

import Identifiers from "@app/modules/common/utils/Identifiers";
import { KTIcon } from "@metronic/helpers";
import { WtIconButton, TRIO } from "@app/modules/common/components/ui/tw";
import { ITodayAttendance } from "@models/employee";

import { useMemo, useState } from "react";
import { employeeTodayAttendanceData } from "../data";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";

function Today() {
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [tableData, setTableData] = useState<ITodayAttendance[]>(employeeTodayAttendanceData);
    const columns = useMemo<ColumnDef<ITodayAttendance>[]>(() => [
        {
            accessorKey: "id",
            header: "ID",
            cell: ({ cell }: any) => cell.getValue()
        },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ cell }: any) => cell.getValue()
        },
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
                switch (cell.getValue()) {
                    case 'Present':
                        return <Identifiers text={cell.getValue()} cssClass="present" />
                    case 'Absent':
                        return <Identifiers text={cell.getValue()} cssClass="absent" />
                    case 'Check in missing':
                        return <Identifiers text={cell.getValue()} cssClass="check-in-out" />
                    case 'Check out missing':
                        return <Identifiers text={cell.getValue()} cssClass="check-in-out" />
                    default:
                        return 'Weekend';
                }
            }
        },
        {
            accessorKey: "work",
            header: "Work",
            cell: ({ cell }: any) => cell.getValue()
        },
        {
            accessorKey: "location",
            header: "Location",
            cell: ({ cell }: any) => cell.getValue()
        },
        {
            accessorKey: "actions",
            header: "Actions",
            cell: ({ row }: any) =>
                <WtIconButton title="Edit" color={TRIO.blue.c} onClick={() => {}} size={34}>
                    <KTIcon iconName='pencil' className='fs-4' />
                </WtIconButton>
        }
    ], []);

    return (
        <>
            <DataTable
                caption="Today Attendance"
                columns={columns}
                data={tableData}
                getRowId={(_r, i) => String(i)}
                stateKey="attendance.today"
                groupableColumns={false}
                searchPlaceholder="Search…"
            />
        </>
    );
}

export default Today;
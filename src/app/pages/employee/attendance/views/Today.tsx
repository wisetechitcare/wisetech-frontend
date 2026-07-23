import MaterialTable from "@app/modules/common/components/MaterialTable";
import Identifiers from "@app/modules/common/utils/Identifiers";
import { KTIcon } from "@metronic/helpers";
import { WtIconButton, TRIO } from "@app/modules/common/components/ui/tw";
import { ITodayAttendance } from "@models/employee";
import { MRT_ColumnDef } from "material-react-table";
import { useMemo, useState } from "react";
import { employeeTodayAttendanceData } from "../data";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";

function Today() {
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [tableData, setTableData] = useState<ITodayAttendance[]>(employeeTodayAttendanceData);
    const columns = useMemo<MRT_ColumnDef<ITodayAttendance>[]>(() => [
        {
            accessorKey: "id",
            header: "ID",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "name",
            header: "Name",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
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
                switch (renderedCellValue) {
                    case 'Present':
                        return <Identifiers text={renderedCellValue} cssClass="present" />
                    case 'Absent':
                        return <Identifiers text={renderedCellValue} cssClass="absent" />
                    case 'Check in missing':
                        return <Identifiers text={renderedCellValue} cssClass="check-in-out" />
                    case 'Check out missing':
                        return <Identifiers text={renderedCellValue} cssClass="check-in-out" />
                    default:
                        return 'Weekend';
                }
            }
        },
        {
            accessorKey: "work",
            header: "Work",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "location",
            header: "Location",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "actions",
            header: "Actions",
            Cell: ({ row }: any) =>
                <WtIconButton title="Edit" color={TRIO.blue.c} onClick={() => {}} size={34}>
                    <KTIcon iconName='pencil' className='fs-4' />
                </WtIconButton>
        }
    ], []);

    return (
        <>
            <MaterialTable
                columns={columns}
                data={tableData}
                tableName="Today Attendance" employeeId={employeeIdCurrent}/>
        </>
    );
}

export default Today;
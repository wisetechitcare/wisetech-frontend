import { ILeaveBalance } from "@models/employee";
import { MRT_ColumnDef } from "material-react-table";
import { useMemo } from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { ILeaveSummary } from "@redux/slices/leaves";

function Balances() {
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const personalLeaveBalance = useSelector((state: RootState) => state.leaves.personalLeavesSummary);
    const mappedData = personalLeaveBalance.map((leave: ILeaveSummary) => ({
        types: leave.leaveType,
        total: leave.numberOfDays,
        remaining: leave.numberOfDays - leave.leaveTaken,
        used: leave.leaveTaken,
    }))
    const columns = useMemo<MRT_ColumnDef<ILeaveBalance>[]>(() => [
        {
            accessorKey: "types",
            header: "Types",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "total",
            header: "Total",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "used",
            header: "Used",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "remaining",
            header: "Remaining",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
    ], []);

    return (
        <>
            <MaterialTable
                columns={columns}
                data={mappedData}
                hideFilters={true}
                hideExportCenter={true}
                tableName="Leave Balances" employeeId={employeeIdCurrent}/>
        </>
    );
}

export default Balances;
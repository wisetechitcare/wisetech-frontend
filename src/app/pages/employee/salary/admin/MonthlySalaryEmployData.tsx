import React from "react";
import { DataTable } from '@/ds/patterns/data-table';
import { getCurrencyLocale, currencyPrefix } from '@utils/currency';

interface MonthlySalaryEmployDataProps {
  employeesData: any[];
  employeeId: string;
}

const columns = [
  { accessorKey: "id", header: "ID", cell: ({ cell }: any) => cell.getValue() || "N/A" },
  { accessorKey: "name", header: "Name", cell: ({ cell }: any) => cell.getValue() || "N/A" },
  { accessorKey: "department", header: "Department", cell: ({ cell }: any) => cell.getValue() || "N/A" },
  { accessorKey: "totalDays", header: "Total Days", cell: ({ cell }: any) => cell.getValue() ?? "0", meta: { exportType: "number" as const } },
  { accessorKey: "present", header: "Present", cell: ({ cell }: any) => cell.getValue() ?? "0", meta: { exportType: "number" as const } },
  { accessorKey: "absent", header: "Absent", cell: ({ cell }: any) => cell.getValue() ?? "0", meta: { exportType: "number" as const } },
  { accessorKey: "late", header: "Late", cell: ({ cell }: any) => cell.getValue() ?? "0", meta: { exportType: "number" as const } },
  { accessorKey: "paidLeave", header: "Paid Leave", cell: ({ cell }: any) => cell.getValue() ?? "0", meta: { exportType: "number" as const } },
  { accessorKey: "unpaidLeave", header: "Unpaid Leave", cell: ({ cell }: any) => cell.getValue() ?? "0", meta: { exportType: "number" as const } },
  { accessorKey: "extraDay", header: "Extra day", cell: ({ cell }: any) => cell.getValue() ?? "0", meta: { exportType: "number" as const } },
  { accessorKey: "workingTime", header: "Working Time", cell: ({ cell }: any) => cell.getValue() || "00:00:00" },
  { accessorKey: "overTime", header: "Over Time", cell: ({ cell }: any) => cell.getValue() || "00:00:00" },
  { accessorKey: "remainingMinutes", header: "Remaining Minutes", cell: ({ cell }: any) => cell.getValue() || "00:00:00" },
  {
    accessorKey: "salary",
    header: "Salary",
    meta: { exportType: "currency" as const },
    cell: ({ cell }: any) =>
      `${currencyPrefix()}${Math.round(Number(cell.getValue() || 0)).toLocaleString(getCurrencyLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
  },
];

const MonthlySalaryEmployData: React.FC<MonthlySalaryEmployDataProps> = ({
  employeesData,
}) => {
  return (
    <div className="mt-5">
      <h1>Monthly Salary</h1>
      <DataTable
        caption="Salary Employee Data"
        columns={columns as any}
        data={employeesData}
        getRowId={(r: any) => String(r.id ?? r.employeeId)}
        stateKey="salary.employeeData"
        groupableColumns={false}
        searchPlaceholder="Search employees…"
      />
    </div>
  );
};

export default MonthlySalaryEmployData;

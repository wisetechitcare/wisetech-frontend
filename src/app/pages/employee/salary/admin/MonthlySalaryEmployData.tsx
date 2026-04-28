import React from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";

interface MonthlySalaryEmployDataProps {
  employeesData: any[];
  employeeId: string;
}

const MonthlySalaryEmployData: React.FC<MonthlySalaryEmployDataProps> = ({
  employeesData,
  employeeId
}) => {
  return (
    <div className="mt-5">
      <h1>Monthly Salary</h1>
      <MaterialTable
        columns={[
          {
            accessorKey: "id",
            header: "ID",
            Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
          },
          {
            accessorKey: "name",
            header: "Name",
            Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
          },
          {
            accessorKey: "department",
            header: "Department",
            Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
          },
          {
            accessorKey: "totalDays",
            header: "Total Days",
            Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
          },
          {
            accessorKey: "present",
            header: "Present",
            Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
          },
          {
            accessorKey: "absent",
            header: "Absent",
            Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
          },
          {
            accessorKey: "late",
            header: "Late",
            Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
          },
          {
            accessorKey: "leaves",
            header: "Leaves",
            Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
          },
          {
            accessorKey: "extraDay",
            header: "Extra day",
            Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
          },
          {
            accessorKey: "workingTime",
            header: "Working Time",
            Cell: ({ renderedCellValue }: any) => renderedCellValue || "00:00:00"
          },
          {
            accessorKey: "overTime",
            header: "Over Time",
            Cell: ({ renderedCellValue }: any) => renderedCellValue || "00:00:00"
          },
          {
            accessorKey: "remainingMinutes",
            header: "Remaining Minutes",
            Cell: ({ renderedCellValue }: any) => renderedCellValue || "00:00:00"
          },
          {
            accessorKey: "salary",
            header: "Salary",
            Cell: ({ renderedCellValue }: any) => (
              `₹${(renderedCellValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )
          },
        ]}
        data={employeesData}
        tableName="SalaryEmployeeData"
        employeeId={employeeId}
        enableColumnSpecificSearch={true}
      />
    </div>
  );
};

export default MonthlySalaryEmployData;

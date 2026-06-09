import React, { useMemo } from "react";
import { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import SalarySummaryCard from "./SalarySummaryCard";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import ExportButton from "@app/modules/common/components/ExportButton";

interface YearlySalaryProps {
  year?: Dayjs;
  fiscalYear?: string;
  employeesData: any;
  isLoading?: boolean;
  title?: string;
}

interface SalarySummary {
  totalEmployeesPaid: number;
  totalPayableAmount: number;
  totalGrossAmount: number;
  totalDeductAmount: number;
  totalPaidAmount: number;
}

const YearlySalary: React.FC<YearlySalaryProps> = ({ year, fiscalYear, employeesData, isLoading = false, title }) => {
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
  // Memoized calculation for optimal performance
  const salarySummary = useMemo<SalarySummary>(() => {
    if (!employeesData?.message) {
      return {
        totalEmployeesPaid: 0,
        totalPayableAmount: 0,
        totalGrossAmount: 0,
        totalDeductAmount: 0,
        totalPaidAmount: 0,
      };
    }

    const { message } = employeesData;
    const totalEmployees = message.totalEmployees || 0;
    const employeeSummaries = message.employeeSummaries || [];

    // Use reduce for better performance
    const totals = employeeSummaries.reduce(
      (acc: any, summary: any) => {
        if (summary?.rawTotals) {
          const { netAmount = 0, paidAmount = 0, totalGrossPayAmount = 0, totalDeductedAmount = 0 } = summary.rawTotals;

          acc.totalPayableAmount += (netAmount - paidAmount);
          acc.totalGrossAmount += totalGrossPayAmount;
          acc.totalDeductAmount += totalDeductedAmount;
          acc.totalPaidAmount += paidAmount;
        }
        return acc;
      },
      {
        totalPayableAmount: 0,
        totalGrossAmount: 0,
        totalDeductAmount: 0,
        totalPaidAmount: 0,
      }
    );

    return {
      totalEmployeesPaid: totalEmployees,
      ...totals,
    };
  }, [employeesData]);

  // Transform employee data for table
  const tableData = useMemo(() => {
    if (!employeesData?.message?.employeeSummaries) {
      return [];
    }

    return employeesData.message.employeeSummaries.map((summary: any) => {
      const rawTotals = summary.rawTotals || {};

      return {
        id: summary.employeeCode || 'N/A',
        name: summary.fullName || 'N/A',
        department: summary.department || 'N/A',
        totalDays: rawTotals.workingDays ?? 0,
        present: rawTotals.presentDays ?? 0,
        absent: rawTotals.absentDays ?? 0,
        late: rawTotals.lateCheckinDays ?? 0,
        leaves: rawTotals.leavesDays ?? 0,
        extraDay: rawTotals.extraDaysWorked ?? 0,
        workingTime: rawTotals?.payableHours ? `${rawTotals?.payableHours?.toFixed(2)} hrs` : '-',
        overTime: rawTotals?.overTime ? `${rawTotals?.overTime?.toFixed(2)} hrs` : '-',
        remainingMinutes: rawTotals?.remainingMinutes ? `${rawTotals?.remainingMinutes?.toFixed(2)} hrs` : '-',
        salary: rawTotals.netAmount || '-',
        paidAmount: rawTotals.amountPaid || '-',
        basicSalary: rawTotals.basicSalary || '-',
        overTimeAmount: rawTotals?.overTimeAmount || '-',
        dueAmount: rawTotals.dueAmount || '-',
      };
    }); 
  }, [employeesData]);

  const exportColumns = useMemo(() => [
    { key: 'id',              header: 'ID',                 type: 'text'     as const },
    { key: 'name',            header: 'Name',               type: 'text'     as const },
    { key: 'department',      header: 'Department',         type: 'text'     as const },
    { key: 'basicSalary',     header: 'Basic Salary',       type: 'currency' as const, showTotal: true },
    { key: 'overTimeAmount',  header: 'Over Time Amount',   type: 'currency' as const, showTotal: true },
    { key: 'salary',          header: 'Net Payable',        type: 'currency' as const, showTotal: true },
    { key: 'paidAmount',      header: 'Paid Amount',        type: 'currency' as const, showTotal: true, color: '#1d4ed8' },
    {
      key: 'dueAmount', header: 'Due Amount', type: 'currency' as const, showTotal: true,
      color: (val: any) => {
        const n = Number(val);
        if (n < 0) return '#0369a1';
        if (n > 0) return '#dc2626';
        return '#16a34a';
      },
    },
    { key: 'totalDays',       header: 'Total Days',         type: 'number'   as const },
    { key: 'present',         header: 'Present',            type: 'number'   as const },
    { key: 'absent',          header: 'Absent',             type: 'number'   as const },
    { key: 'late',            header: 'Late',               type: 'number'   as const },
    { key: 'leaves',          header: 'Leaves',             type: 'number'   as const },
    { key: 'extraDay',        header: 'Extra Day',          type: 'number'   as const },
    { key: 'workingTime',     header: 'Working Time',       type: 'text'     as const },
    { key: 'overTime',        header: 'Over Time',          type: 'text'     as const },
    { key: 'remainingMinutes',header: 'Remaining Time',     type: 'text'     as const },
  ], []);

  const exportLabel = title || fiscalYear || (year ? year.format('YYYY') : 'All Time');

  return (
    <>
      {/* Salary Summary Card */}
      <SalarySummaryCard
        totalEmployeesPaid={salarySummary.totalEmployeesPaid}
        totalPayableAmount={salarySummary.totalPayableAmount}
        totalGrossAmount={salarySummary.totalGrossAmount}
        totalDeductAmount={salarySummary.totalDeductAmount}
        totalPaidAmount={salarySummary.totalPaidAmount}
        isLoading={isLoading}
      />

      {/* Employee Salary Table */}
      <div className="mt-5">
        <h1>{title || "Yearly Salary"}</h1>
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
              accessorKey: "branch",
              header: "Branch",
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
            },
            {
              accessorKey: "basicSalary",
              header: "Basic Salary",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            },
            {
              accessorKey: "overTimeAmount",
              header: "Over Time Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            },
            {
              accessorKey: "remainingMinutes",
              header: "Remaining Time",
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "-"
            },
            {
              accessorKey: "salary",
              header: "Net Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            },
            {
              accessorKey: "paidAmount",
              header: "Paid Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            },
            {
              accessorKey: "dueAmount",
              header: "Due Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
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
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "-"
            },
            {
              accessorKey: "overTime",
              header: "Over Time",
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "-"
            },
            
          ]}
          data={tableData}
          tableName="YearlySalaryEmployeeData"
          employeeId={employeeIdCurrent}
          enableColumnSpecificSearch={true}
          renderExportActions={() => (
            <ExportButton
              data={tableData}
              columns={exportColumns}
              filename={`salary-${exportLabel.replace(/\s+/g, '-').toLowerCase()}`}
              title={`${title || 'Yearly Salary'} — ${exportLabel}`}
              subtitle="Employee-wise salary, deductions and payment status"
              sheetName={exportLabel.slice(0, 31)}
              showTotals
              totalLabel="TOTAL"
              disabled={tableData.length === 0}
            />
          )}
        />
      </div>
    </>
  );
};

export default YearlySalary;

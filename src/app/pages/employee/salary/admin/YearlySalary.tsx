import React, { useMemo } from "react";
import { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import SalarySummaryCard from "./SalarySummaryCard";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import ExportButton from "@app/modules/common/components/ExportButton";
import { useSalaryFilters, SalaryFilterToolbar, StatusFilter } from "./SalaryTableFilters";

interface YearlySalaryProps {
  year?: Dayjs;
  fiscalYear?: string;
  employeesData: any;
  isLoading?: boolean;
  title?: string;
  // Notifies the parent so it can refetch — the API returns active employees
  // only by default, so inactive ones must be requested from the server.
  onStatusFilterChange?: (status: StatusFilter) => void;
}

interface SalarySummary {
  totalEmployeesPaid: number;
  totalPayableAmount: number;
  totalGrossAmount: number;
  totalDeductAmount: number;
  totalPaidAmount: number;
}

const YearlySalary: React.FC<YearlySalaryProps> = ({ year, fiscalYear, employeesData, isLoading = false, title, onStatusFilterChange }) => {
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const filters = useSalaryFilters(employeesData);
  const { filteredEmployeeSummaries } = filters;

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

    const employeeSummaries = filteredEmployeeSummaries;

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
      totalEmployeesPaid: filteredEmployeeSummaries.length,
      ...totals,
    };
  }, [employeesData, filteredEmployeeSummaries]);

  // Transform employee data for table
  const tableData = useMemo(() => {
    return filteredEmployeeSummaries.map((summary: any) => {
      const rawTotals = summary.rawTotals || {};

      return {
        id: summary.employeeCode || 'N/A',
        name: summary.fullName || 'N/A',
        subOrganization: summary.subOrganization || 'N/A',
        department: summary.department || 'N/A',
        branch: summary.branch || 'N/A',
        basicSalary: rawTotals.basicSalary ?? '-',
        overTimeAmount: rawTotals?.overTimeAmount ?? '-',
        netAmount: rawTotals.netAmount ?? '-',
        amountPaid: rawTotals.amountPaid ?? '-',
        dueAmount: rawTotals.dueAmount ?? '-',
        professionalFees: rawTotals.professionalFeesDeducted ?? 0,
        professionalTax: rawTotals.professionalTaxDeducted ?? 0,
        totalWorkingTime: rawTotals?.workingDays ? `${((rawTotals?.workingDays ?? 0) * 8).toFixed(2)} hrs` : '-',
        workedTime: rawTotals?.payableHours != null ? `${Number(rawTotals.payableHours).toFixed(2)} hrs` : '-',
        remainingMinutes: rawTotals?.remainingMinutes ? `${rawTotals?.remainingMinutes?.toFixed(2)} hrs` : '-',
        overTime: rawTotals?.overTime ? `${rawTotals?.overTime?.toFixed(2)} hrs` : '-',
        totalDays: rawTotals.workingDays ?? 0,
        present: rawTotals.presentDays ?? 0,
        absent: (rawTotals?.absentDays < 0 ? 0 : rawTotals?.absentDays) ?? 0,
        late: rawTotals.lateCheckinDays ?? 0,
        leaves: rawTotals.leavesDays ?? 0,
        extraDay: rawTotals.extraDaysWorked ?? 0,
      };
    });
  }, [filteredEmployeeSummaries]);

  const exportColumns = useMemo(() => [
    { key: 'id',              header: 'ID',                  type: 'text'     as const },
    { key: 'name',            header: 'Name',                type: 'text'     as const },
    { key: 'subOrganization', header: 'Sub Organization',    type: 'text'     as const },
    { key: 'department',      header: 'Department',          type: 'text'     as const },
    { key: 'branch',          header: 'Branch',              type: 'text'     as const },
    { key: 'basicSalary',     header: 'Basic Salary',        type: 'currency' as const, showTotal: true },
    { key: 'overTimeAmount',  header: 'Over Time Amount',    type: 'currency' as const, showTotal: true },
    { key: 'professionalFees',header: 'TDS',                 type: 'currency' as const, showTotal: true },
    { key: 'professionalTax', header: 'Prof. Tax',           type: 'currency' as const, showTotal: true },
    { key: 'netAmount',       header: 'Net Payable',         type: 'currency' as const, showTotal: true },
    { key: 'amountPaid',      header: 'Paid',                type: 'currency' as const, showTotal: true, color: '#1d4ed8' },
    {
      key: 'dueAmount', header: 'Due Amount', type: 'currency' as const, showTotal: true,
      color: (val: any) => {
        const n = Number(val);
        if (n < 0) return '#0369a1';
        if (n > 0) return '#dc2626';
        return '#16a34a';
      },
    },
    { key: 'totalWorkingTime',header: 'Total Working Time',  type: 'text'     as const },
    { key: 'workedTime',      header: 'Worked Time',         type: 'text'     as const },
    { key: 'overTime',        header: 'Over Time',           type: 'text'     as const },
    { key: 'totalDays',       header: 'Total Days',          type: 'number'   as const },
    { key: 'present',         header: 'Present',             type: 'number'   as const },
    { key: 'absent',          header: 'Absent',              type: 'number'   as const },
    { key: 'late',            header: 'Late',                type: 'number'   as const },
    { key: 'leaves',          header: 'Leaves',              type: 'number'   as const },
    { key: 'extraDay',        header: 'Extra Day',           type: 'number'   as const },
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
              accessorKey: "subOrganization",
              header: "Sub Organization",
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
              accessorKey: "professionalFees",
              header: "TDS",
              Cell: ({ renderedCellValue }: any) => {
                const val = Math.round(Number(renderedCellValue));
                if (!val || val === 0) return "-";
                return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            },
            {
              accessorKey: "professionalTax",
              header: "Prof. Tax",
              Cell: ({ renderedCellValue }: any) => {
                const val = Math.round(Number(renderedCellValue));
                if (!val || val === 0) return "-";
                return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            },
            {
              accessorKey: "netAmount",
              header: "Net Payable",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            },
            {
              accessorKey: "amountPaid",
              header: "Paid",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            },
            {
              accessorKey: "dueAmount",
              header: "Due Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || renderedCellValue === null || renderedCellValue === undefined) return "-";
                const amount = Math.round(Number(renderedCellValue));
                if (amount < 0) {
                    return <span className="text-info fw-bold">Paid Extra (₹{Math.abs(amount).toLocaleString('en-IN')})</span>;
                } else if (amount > 0) {
                    return <span className="text-danger fw-bold">₹{amount.toLocaleString('en-IN')}</span>;
                } else {
                    return <span className="text-success fw-bold">₹0</span>;
                }
              }
            },
            {
              accessorKey: "totalWorkingTime",
              header: "Total Working Time",
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "-"
            },
            {
              accessorKey: "workedTime",
              header: "Worked Time",
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "-"
            },
            {
              accessorKey: "overTime",
              header: "Over Time",
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "-"
            },
            {
              accessorKey: "remainingMinutes",
              header: "Remaining Time",
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "-"
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
          ]}
          data={tableData}
          tableName="YearlySalaryEmployeeData"
          employeeId={employeeIdCurrent}
          enableColumnSpecificSearch={true}
          renderTopToolbarRightActions={() => (
            <SalaryFilterToolbar filters={filters} onStatusChange={onStatusFilterChange} />
          )}
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

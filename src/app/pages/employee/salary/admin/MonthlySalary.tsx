import React, { useMemo } from "react";
import { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import SalarySummaryCard from "./SalarySummaryCard";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import ExportButton from "@app/modules/common/components/ExportButton";
import { useSalaryFilters, SalaryFilterToolbar, StatusFilter } from "./SalaryTableFilters";
import { useSalaryMaster } from "@modules/payroll/hooks/useSalaryComponentNames";

interface MonthlySalaryProps {
  month: Dayjs;
  employeesData: any;
  isLoading?: boolean;
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

const MonthlySalary: React.FC<MonthlySalaryProps> = ({ month, employeesData, isLoading = false, onStatusFilterChange }) => {

  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const filters = useSalaryFilters(employeesData);
  const { filteredEmployeeSummaries, statusFilter } = filters;

  const { resolveComponent } = useSalaryMaster();
  const tds1Comp = resolveComponent('Professional Fees');
  const tds2Comp = resolveComponent('TDS 2');
  const tds1Name = tds1Comp?.shortCode ? tds1Comp.shortCode.toUpperCase() : tds1Comp?.displayName ? tds1Comp.displayName.toUpperCase() : 'TDS';
  const tds2Name = tds2Comp?.shortCode ? tds2Comp.shortCode.toUpperCase() : tds2Comp?.displayName ? tds2Comp.displayName.toUpperCase() : 'TDS 2';

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
          const { netAmount = 0, amountPaid = 0, totalGrossPayAmount = 0, totalDeductedAmount = 0 } = summary.rawTotals;

          if (amountPaid > 0) {
            acc.totalEmployeesPaid += 1;
          }
          acc.totalPayableAmount += (netAmount - amountPaid);
          acc.totalGrossAmount += totalGrossPayAmount;
          acc.totalDeductAmount += totalDeductedAmount;
          acc.totalPaidAmount += amountPaid;
        }
        return acc;
      },
      {
        totalEmployeesPaid: 0,
        totalPayableAmount: 0,
        totalGrossAmount: 0,
        totalDeductAmount: 0,
        totalPaidAmount: 0,
      }
    );

    return {
      ...totals,
    };
  }, [filteredEmployeeSummaries]);

  const totalPayableAmountTillDate = useMemo(() => {
    return filteredEmployeeSummaries.reduce((sum: number, summary: any) => {
      const rawTotals = summary.rawTotals || {};
      const netAmount = Number(rawTotals.netAmount ?? 0);
      const amountPaid = Number(rawTotals.amountPaid ?? 0);
      return sum + Math.max(0, netAmount - amountPaid);
    }, 0);
  }, [filteredEmployeeSummaries]);

  // Transform employee data for table
  const tableData = useMemo(() => {
    const rows = filteredEmployeeSummaries.map((summary: any) => {
      const rawTotals = summary.rawTotals || {};

      return {
        id: summary.employeeCode || 'N/A',
        name: summary.fullName || 'N/A',
        subOrganization: summary.subOrganization || 'N/A',
        department: summary.department || 'N/A',
        branch: summary.branch || 'N/A',
        basicSalary: rawTotals.basicSalary ?? '-',
        overTimeAmount: rawTotals?.overTimeAmount ?? '-',
        totalSalaryAfterAttendance: (rawTotals.basicSalary ?? 0) + (rawTotals?.overTimeAmount ?? 0),
        netAmount: rawTotals.netAmount ?? '-',
        amountPaid: rawTotals.amountPaid ?? '-',
        dueAmount: rawTotals.dueAmount ?? '-',
        professionalFees: rawTotals.professionalFeesDeducted ?? 0,
        tds2: rawTotals.tds2Deducted ?? 0,
        professionalTax: rawTotals.professionalTaxDeducted ?? 0,
        totalWorkingTime: rawTotals?.workingDays ? `${((rawTotals?.workingDays ?? 0) * 8).toFixed(2)} hrs` : '-',
        workedTime: rawTotals?.payableHours != null ? `${Number(rawTotals.payableHours).toFixed(2)} hrs` : '-',
        remainingMinutes: rawTotals?.remainingMinutes ? `${rawTotals?.remainingMinutes?.toFixed(2)} hrs` : '-',
        overTime: rawTotals?.overTime ? `${rawTotals?.overTime?.toFixed(2)} hrs` : '-',
        totalDays: rawTotals.workingDays ?? 0,
        present: rawTotals.presentDays ?? 0,
        absent: (rawTotals?.absentDays < 0 ? 0 : rawTotals?.absentDays) ?? 0,
        late: rawTotals.lateCheckinDays ?? 0,
        paidLeave: rawTotals.leavesDays ?? 0,
        unpaidLeave: rawTotals.unpaidLeaveDays ?? 0,
        extraDay: rawTotals.extraDaysWorked ?? 0,
      };
    });

    const dataScore = (r: any) => {
      const numFields = ['basicSalary', 'overTimeAmount', 'totalSalaryAfterAttendance', 'netAmount', 'amountPaid',
        'professionalFees', 'tds2', 'professionalTax', 'totalDays', 'present'];
      return numFields.reduce((s, k) => {
        const v = Number(r[k]);
        return s + (Number.isFinite(v) && v > 0 ? 1 : 0);
      }, 0);
    };

    const byName = (a: any, b: any) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

    if (statusFilter === 'Deactive') {
      // Inactive view: most-data rows first, then A-Z by name within same score
      return rows.sort((a, b) => {
        const scoreDiff = dataScore(b) - dataScore(a);
        return scoreDiff !== 0 ? scoreDiff : byName(a, b);
      });
    }

    // Active / All: ascending by name (case-insensitive)
    return rows.sort(byName);
  }, [filteredEmployeeSummaries, statusFilter]);

  // Column totals across ALL filtered rows (matches the export totals).
  const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const columnTotals = useMemo(() => {
    const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
    return tableData.reduce(
      (acc: any, r: any) => {
        acc.basicSalary             += num(r.basicSalary);
        acc.overTimeAmount          += num(r.overTimeAmount);
        acc.totalSalaryAfterAttendance += num(r.totalSalaryAfterAttendance);
        acc.professionalFees        += num(r.professionalFees);
        acc.tds2                    += num(r.tds2);
        acc.professionalTax         += num(r.professionalTax);
        acc.netAmount               += num(r.netAmount);
        acc.amountPaid              += num(r.amountPaid);
        acc.dueAmount               += num(r.dueAmount);
        return acc;
      },
      { basicSalary: 0, overTimeAmount: 0, totalSalaryAfterAttendance: 0, professionalFees: 0, tds2: 0, professionalTax: 0, netAmount: 0, amountPaid: 0, dueAmount: 0 }
    );
  }, [tableData]);

  const exportColumns = useMemo(() => [
    { key: 'id',              header: 'ID',                  type: 'text'     as const },
    { key: 'name',            header: 'Name',                type: 'text'     as const },
    { key: 'subOrganization', header: 'Sub Organization',    type: 'text'     as const },
    { key: 'department',      header: 'Department',          type: 'text'     as const },
    { key: 'branch',          header: 'Branch',              type: 'text'     as const },
    { key: 'basicSalary',     header: 'Basic Salary',        type: 'currency' as const, showTotal: true },
    { key: 'overTimeAmount',  header: 'Over Time Amount',    type: 'currency' as const, showTotal: true },
    { key: 'totalSalaryAfterAttendance', header: 'Total Salary After Attendance Adjustments', type: 'currency' as const, showTotal: true },
    { key: 'professionalFees',header: tds1Name,              type: 'currency' as const, showTotal: true },
    { key: 'tds2',            header: tds2Name,              type: 'currency' as const, showTotal: true },
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
    { key: 'paidLeave',       header: 'Paid Leave',          type: 'number'   as const },
    { key: 'unpaidLeave',     header: 'Unpaid Leave',        type: 'number'   as const },
    { key: 'extraDay',        header: 'Extra Day',           type: 'number'   as const },
  ], [tds1Name, tds2Name]);

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
        totalPayableAmountTillDate={totalPayableAmountTillDate}
        isLoadingTillDate={isLoading}
      />

      {/* Employee Salary Table */}
      <div className="mt-5">
        <h1>Monthly Salary</h1>
        <MaterialTable
          renderTopToolbarRightActions={() => (
            <SalaryFilterToolbar filters={filters} onStatusChange={onStatusFilterChange} />
          )}
          renderExportActions={() => (
            <ExportButton
              data={tableData}
              columns={exportColumns}
              filename={`monthly-salary-${month.format('MMM-YYYY').toLowerCase()}`}
              title={`Monthly Salary — ${month.format('MMMM YYYY')}`}
              subtitle="Employee-wise salary, deductions and payment status"
              sheetName="Monthly Salary"
              showTotals
              totalLabel="TOTAL"
              disabled={tableData.length === 0}
            />
          )}
          columns={[
            {
              accessorKey: "id",
              header: "ID",
              Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A",
              Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
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
              },
              Footer: () => fmtINR(columnTotals.basicSalary),
            },
            {
              accessorKey: "overTimeAmount",
              header: "Over Time Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
              Footer: () => fmtINR(columnTotals.overTimeAmount),
            },
            {
              accessorKey: "totalSalaryAfterAttendance",
              header: "Total Salary After Attendance Adjustments",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
              Footer: () => fmtINR(columnTotals.totalSalaryAfterAttendance),
            },
            {
              accessorKey: "professionalFees",
              header: tds1Name,
              Cell: ({ renderedCellValue }: any) => {
                const val = Math.round(Number(renderedCellValue));
                if (!val || val === 0) return "-";
                return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
              Footer: () => fmtINR(columnTotals.professionalFees),
            },
            {
              accessorKey: "tds2",
              header: tds2Name,
              Cell: ({ renderedCellValue }: any) => {
                const val = Math.round(Number(renderedCellValue));
                if (!val || val === 0) return "-";
                return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
              Footer: () => fmtINR(columnTotals.tds2),
            },
            {
              accessorKey: "professionalTax",
              header: "Prof. Tax",
              Cell: ({ renderedCellValue }: any) => {
                const val = Math.round(Number(renderedCellValue));
                if (!val || val === 0) return "-";
                return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
              Footer: () => fmtINR(columnTotals.professionalTax),
            },
            {
              accessorKey: "netAmount",
              header: "Net Payable",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
              Footer: () => fmtINR(columnTotals.netAmount),
            },
            {
              accessorKey: "amountPaid",
              header: "Paid",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Math.round(Number(renderedCellValue))?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
              Footer: () => <span style={{ color: '#1d4ed8' }}>{fmtINR(columnTotals.amountPaid)}</span>,
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
              },
              Footer: () => {
                const t = Math.round(columnTotals.dueAmount);
                const color = t > 0 ? '#dc2626' : t < 0 ? '#0369a1' : '#16a34a';
                return <span style={{ color }}>{fmtINR(t)}</span>;
              },
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
              accessorKey: "paidLeave",
              header: "Paid Leave",
              Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
            },
            {
              accessorKey: "unpaidLeave",
              header: "Unpaid Leave",
              Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
            },
            {
              accessorKey: "extraDay",
              header: "Extra day",
              Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "0"
            },
          ]}
          data={tableData}
          tableName="MonthlySalaryEmployeeData"
          employeeId={employeeIdCurrent}
          enableColumnSpecificSearch={true}
          showColumnFooter={true}
        />
      </div>
    </>
  );
};

export default MonthlySalary;

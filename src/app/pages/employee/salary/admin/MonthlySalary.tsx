import React, { useMemo, useState, useEffect } from "react";
import { Dayjs } from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import SalarySummaryCard from "./SalarySummaryCard";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import ExportButton from "@app/modules/common/components/ExportButton";
import { useSalaryFilters, SalaryFilterToolbar, StatusFilter } from "./SalaryTableFilters";
import { useSalaryMaster } from "@modules/payroll/hooks/useSalaryComponentNames";
import QuickPayModal from "@modules/payroll/components/modals/QuickPayModal";
import { saveSelectedEmployee } from "@redux/slices/employee";
import { Dialog, DialogTitle, DialogContent, IconButton, Box, CircularProgress } from "@mui/material";
import { Close } from "@mui/icons-material";
import SalaryView from "../personal/SalaryView";
import { fetchCurrentEmployeeByEmpId } from "@services/employee";

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

/**
 * Sort order for the Action column: most outstanding first.
 *
 *   0 Pay        — salary still owed (govt may be owed too)
 *   1 Pay Govt   — salary settled, statutory dues left
 *   2 Paid ✓     — nothing left to pay
 *   3 —          — no employee on the row, so no action at all
 *
 * Must stay in step with the button the cell renders; both read the same two
 * fields, so a row can never sort into a bucket its label disagrees with.
 */
const payActionRank = (row: any): number => {
  if (!row?.employeeId) return 3;
  const salaryDue = Math.round(Number(row.dueAmount) || 0);
  const govtDue = Math.round(Number(row.govtPending) || 0);
  if (salaryDue > 0) return 0;
  if (govtDue > 0) return 1;
  return 2;
};

/** Cell value for the Action column — the words on the button, so the column's own
 *  search box matches what the reader sees rather than a rank number. */
const PAY_ACTION_LABEL = ['Pay', 'Pay Govt', 'Paid ✓', '-'];

const MonthlySalary: React.FC<MonthlySalaryProps> = ({ month, employeesData, isLoading = false, onStatusFilterChange }) => {

  const dispatch = useDispatch();
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

  // Employee selected via the Pay button — opens the payout dialog on this page
  const [payTarget, setPayTarget] = useState<{ employeeId: string; name: string; category?: 'SALARY' | 'GOVERNMENT' } | null>(null);
  // Employee details modal state
  const [selectedEmpForDetail, setSelectedEmpForDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filters = useSalaryFilters(employeesData);
  const { filteredEmployeeSummaries, statusFilter } = filters;

  // Fetch full employee data when a row is clicked
  const handleRowClick = async (employeeId: string, rowName?: string, rowId?: string) => {
    if (!employeeId) return;
    setLoadingDetail(true);
    try {
      const response = await fetchCurrentEmployeeByEmpId(employeeId);
      const fullEmployee = response?.data?.employee;

      if (!fullEmployee) {
        console.warn('Employee data not found in response');
        setSelectedEmpForDetail(null);
        return;
      }

      // Preserve the display name from the table row if available
      if (rowName && !fullEmployee.users?.firstName) {
        fullEmployee._displayName = rowName;
        fullEmployee._displayId = rowId;
      }

      console.log('📋 Loaded employee:', fullEmployee);
      dispatch(saveSelectedEmployee(fullEmployee));
      setSelectedEmpForDetail(fullEmployee);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      setSelectedEmpForDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

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
        employeeId: summary.employeeId || null,
        name: summary.fullName || 'N/A',
        subOrganization: summary.subOrganization || 'N/A',
        department: summary.department || 'N/A',
        branch: summary.branch || 'N/A',
        basicSalary: rawTotals.basicSalary ?? '-',
        overTimeAmount: rawTotals?.overTimeAmount ?? '-',
        totalSalaryAfterAttendance: rawTotals.totalSalaryAfterAttendance ?? '-',
        netAmount: rawTotals.netAmount ?? '-',
        amountPaid: rawTotals.amountPaid ?? '-',
        dueAmount: rawTotals.dueAmount ?? '-',
        // Statutory (govt) dues still unpaid — TDS/PT/TDS2 owed minus non-retention
        // challans paid. Falls back to governmentPaid for stale API responses.
        govtOwed: (Number(rawTotals.professionalFeesDeducted) || 0)
          + (Number(rawTotals.tds2Deducted) || 0)
          + (Number(rawTotals.professionalTaxDeducted) || 0),
        govtPending: Math.max(0,
          (Number(rawTotals.professionalFeesDeducted) || 0)
          + (Number(rawTotals.tds2Deducted) || 0)
          + (Number(rawTotals.professionalTaxDeducted) || 0)
          - (Number(rawTotals.statutoryPaid ?? rawTotals.governmentPaid) || 0)
        ),
        professionalFees: rawTotals.professionalFeesDeducted ?? 0,
        tds2: rawTotals.tds2Deducted ?? 0,
        professionalTax: rawTotals.professionalTaxDeducted ?? 0,
        retention: rawTotals.retentionDeducted ?? 0,
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
        'professionalFees', 'tds2', 'professionalTax', 'retention', 'totalDays', 'present'];
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
        acc.basicSalary += num(r.basicSalary);
        acc.overTimeAmount += num(r.overTimeAmount);
        acc.totalSalaryAfterAttendance += num(r.totalSalaryAfterAttendance);
        acc.professionalFees += num(r.professionalFees);
        acc.tds2 += num(r.tds2);
        acc.professionalTax += num(r.professionalTax);
        acc.retention += num(r.retention);
        acc.netAmount += num(r.netAmount);
        acc.amountPaid += num(r.amountPaid);
        acc.dueAmount += num(r.dueAmount);
        return acc;
      },
      { basicSalary: 0, overTimeAmount: 0, totalSalaryAfterAttendance: 0, professionalFees: 0, tds2: 0, professionalTax: 0, retention: 0, netAmount: 0, amountPaid: 0, dueAmount: 0 }
    );
  }, [tableData]);

  const exportColumns = useMemo(() => [
    { key: 'id', header: 'ID', type: 'text' as const },
    { key: 'name', header: 'Name', type: 'text' as const },
    { key: 'subOrganization', header: 'Sub Organization', type: 'text' as const },
    { key: 'department', header: 'Department', type: 'text' as const },
    { key: 'branch', header: 'Branch', type: 'text' as const },
    { key: 'basicSalary', header: 'Basic Salary', type: 'currency' as const, showTotal: true },
    { key: 'overTimeAmount', header: 'Over Time Amount', type: 'currency' as const, showTotal: true },
    { key: 'totalSalaryAfterAttendance', header: 'Total Salary After Attendance Adjustments', type: 'currency' as const, showTotal: true },
    { key: 'retention', header: 'Retention', type: 'currency' as const, showTotal: true },
    { key: 'professionalFees', header: tds1Name, type: 'currency' as const, showTotal: true },
    { key: 'tds2', header: tds2Name, type: 'currency' as const, showTotal: true },
    { key: 'professionalTax', header: 'Prof. Tax', type: 'currency' as const, showTotal: true },
    { key: 'netAmount', header: 'Net Payable', type: 'currency' as const, showTotal: true },
    { key: 'amountPaid', header: 'Paid', type: 'currency' as const, showTotal: true, color: '#1d4ed8' },
    {
      key: 'dueAmount', header: 'Due Amount', type: 'currency' as const, showTotal: true,
      color: (val: any) => {
        const n = Number(val);
        if (n < 0) return '#0369a1';
        if (n > 0) return '#dc2626';
        return '#16a34a';
      },
    },
    { key: 'totalWorkingTime', header: 'Total Working Time', type: 'text' as const },
    { key: 'workedTime', header: 'Worked Time', type: 'text' as const },
    { key: 'overTime', header: 'Over Time', type: 'text' as const },
    { key: 'totalDays', header: 'Total Days', type: 'number' as const },
    { key: 'present', header: 'Present', type: 'number' as const },
    { key: 'absent', header: 'Absent', type: 'number' as const },
    { key: 'late', header: 'Late', type: 'number' as const },
    { key: 'paidLeave', header: 'Paid Leave', type: 'number' as const },
    { key: 'unpaidLeave', header: 'Unpaid Leave', type: 'number' as const },
    { key: 'extraDay', header: 'Extra Day', type: 'number' as const },
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
              Footer: () => <span style={{ fontWeight: 900, color: '#1E3A8A', fontSize: '1.05rem', letterSpacing: '0.08em' }}>TOTAL</span>,
            },
            {
              accessorKey: "name",
              header: "Name",
              Cell: ({ renderedCellValue, row }: any) => (
                <span style={{ color: row.original.employeeId ? '#0369a1' : 'inherit', fontWeight: row.original.employeeId ? 500 : 400 }}>
                  {renderedCellValue || "N/A"}
                </span>
              ),
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
              accessorKey: "retention",
              header: "Retention",
              Cell: ({ renderedCellValue }: any) => {
                const val = Math.round(Number(renderedCellValue));
                if (!val || val === 0) return "-";
                return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
              Footer: () => fmtINR(columnTotals.retention),
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
              Footer: () => <span style={{ color: '#1d4ed8', fontWeight: 800 }}>{fmtINR(columnTotals.amountPaid)}</span>,
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
                return <span style={{ color, fontWeight: 800 }}>{fmtINR(t)}</span>;
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
            {
              // No row carries a `payAction` field, so an accessorKey sorted every
              // row on `undefined` — the header's sort arrow moved and nothing else
              // did. The state is derived from the dues, so derive the sort value
              // the same way the Cell derives the label.
              id: "payAction",
              accessorFn: (row: any) => PAY_ACTION_LABEL[payActionRank(row)],
              // Sort by how much is still owed, not alphabetically — "Paid ✓" would
              // otherwise land between "Pay" and "Pay Govt".
              sortingFn: (a: any, b: any) => payActionRank(a.original) - payActionRank(b.original),
              header: "Action",
              Cell: ({ row }: any) => {
                if (!row.original.employeeId) return "-";
                const salaryDue = Math.round(Number(row.original.dueAmount) || 0);
                const govtDue = Math.round(Number(row.original.govtPending) || 0);
                const openPay = (e: React.MouseEvent, category?: 'SALARY' | 'GOVERNMENT') => {
                  e.stopPropagation();
                  setPayTarget({ employeeId: row.original.employeeId, name: row.original.name, category });
                };

                // Two payment tracks, color-coded like the payout dialog:
                // navy = salary to employee, rose = statutory to government.
                const btnBase: React.CSSProperties = {
                  width: 92, height: 28, borderRadius: 8, fontSize: 12, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', lineHeight: 1,
                };
                const navyBtn: React.CSSProperties = {
                  ...btnBase, backgroundColor: '#1E3A8A', color: '#fff', border: '1px solid #1E3A8A',
                };
                const roseBtn: React.CSSProperties = {
                  ...btnBase, backgroundColor: '#FFF1F4', color: '#D9214E', border: '1px solid #F9C9D4',
                };
                // Salary and govt dues are paid separately — keep an action available
                // until BOTH are settled (salary paid alone must not hide it).
                // The label alone carries the state: "Pay Govt" = salary settled,
                // only the statutory dues remain. Tooltip has the detail.
                if (salaryDue > 0 || govtDue > 0) {
                  const salarySettled = salaryDue <= 0;
                  const govtSettled = Math.round(Number(row.original.govtOwed) || 0) > 0 && govtDue <= 0;
                  return (
                    <button
                      style={salarySettled ? roseBtn : navyBtn}
                      title={salarySettled ? 'Salary paid ✓ — govt. deduction pending' : govtDue > 0 ? 'Salary & govt. deduction pending' : govtSettled ? 'Govt. paid ✓ — salary pending' : 'Salary pending'}
                      onClick={(e) => openPay(e, salarySettled ? 'GOVERNMENT' : undefined)}
                    >
                      {salarySettled ? 'Pay Govt' : 'Pay'}
                    </button>
                  );
                }
                return (
                  <div className="d-flex align-items-center justify-content-center" style={{ gap: 6 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: '#0F8A5F', backgroundColor: '#E8FFF3',
                      borderRadius: 999, padding: '5px 12px', lineHeight: '14px', whiteSpace: 'nowrap',
                    }}>
                      Paid ✓
                    </span>
                    <button
                      style={{
                        width: 28, height: 28, borderRadius: 8, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        backgroundColor: '#fff', border: '1px solid #E1E3EA', color: '#5E6278',
                      }}
                      title="Edit payouts"
                      onClick={openPay}
                    >
                      <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                    </button>
                  </div>
                );
              }
            },
          ]}
          data={tableData}
          tableName="MonthlySalaryEmployeeData"
          employeeId={employeeIdCurrent}
          enableColumnSpecificSearch={true}
          showColumnFooter={true}
          // Bound the table's own height so rows scroll *inside* the table (not the page),
          // which lets the already-enabled sticky header stay pinned while scrolling.
          muiTableContainerProps={{ sx: { maxHeight: '60vh', overflowY: 'auto' } }}
          muiTableProps={{
            muiTableBodyRowProps: ({ row }: any) => ({
              onClick: () => {
                if (row.original.employeeId) {
                  handleRowClick(row.original.employeeId, row.original.name, row.original.id);
                }
              },
              sx: { cursor: row.original.employeeId ? 'pointer' : 'default' },
            }),
          }}
        />
      </div>

      {/* Record Payroll Payout — opened in place by the Pay button */}
      {payTarget && (
        <QuickPayModal
          employeeId={payTarget.employeeId}
          employeeName={payTarget.name}
          month={month}
          initialCategory={payTarget.category}
          onClose={() => setPayTarget(null)}
        />
      )}

      {/* Employee Salary Details Modal */}
      <Dialog
        open={!!selectedEmpForDetail}
        onClose={() => setSelectedEmpForDetail(null)}
        maxWidth="lg"
        fullWidth
        // Below react-bootstrap's modal layer (backdrop 1050 / modal 1055) so the
        // nested PaymentModal etc. inside SalaryReport stack above this dialog.
        // disableEnforceFocus: MUI's focus trap would steal focus back from them.
        sx={{ zIndex: 1040 }}
        disableEnforceFocus
        PaperProps={{
          sx: { maxHeight: '90vh', overflowY: 'auto' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            {selectedEmpForDetail?.users?.firstName || selectedEmpForDetail?._displayName} {selectedEmpForDetail?.users?.lastName && selectedEmpForDetail.users.lastName} {selectedEmpForDetail?.employeeCode && `(${selectedEmpForDetail.employeeCode})`}
          </Box>
          <IconButton
            onClick={() => setSelectedEmpForDetail(null)}
            size="small"
            sx={{ ml: 2 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : selectedEmpForDetail ? (
            <Box
              sx={{
                '& > *': { mb: 2 },
                '& .fw-bold': { fontWeight: 600 },
                '& .fs-1': { fontSize: '1.5rem' },
                '& .mt-5': { marginTop: '1rem' },
                '& .mt-8': { marginTop: '2rem' }
              }}
            >
              <SalaryView fromAdmin={true} />
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MonthlySalary;

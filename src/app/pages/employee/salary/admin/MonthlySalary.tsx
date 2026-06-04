import React, { useMemo, useState, useEffect } from "react";
import { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import SalarySummaryCard from "./SalarySummaryCard";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { fetchSalaryRecordsForAllActiveEmployees } from "@services/employee";
import { Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

interface MonthlySalaryProps {
  month: Dayjs;
  employeesData: any;
  isLoading?: boolean;
}

interface SalarySummary {
  totalEmployeesPaid: number;
  totalPayableAmount: number;
  totalGrossAmount: number;
  totalDeductAmount: number;
  totalPaidAmount: number;
}

const MonthlySalary: React.FC<MonthlySalaryProps> = ({ month, employeesData, isLoading = false }) => {

  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

  // State for all active employees total payable amount
  const [allActiveEmployeesData, setAllActiveEmployeesData] = useState<any>(null);
  const [isLoadingTillDate, setIsLoadingTillDate] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Deactive' | 'All'>('Active');

  const filteredEmployeeSummaries = useMemo(() => {
    if (!employeesData?.message?.employeeSummaries) return [];
    
    return employeesData.message.employeeSummaries.filter((summary: any) => {
      const isActive = summary.isActive !== false;
      if (statusFilter === 'Active') return isActive;
      if (statusFilter === 'Deactive') return !isActive;
      return true; // 'All'
    });
  }, [employeesData, statusFilter]);

  // Fetch all active employees salary data when month changes
  useEffect(() => {
    const fetchAllActiveData = async () => {
      setIsLoadingTillDate(true);
      try {
        const startDate = month.startOf('month').format('YYYY-MM-DD');
        const endDate = month.endOf('month').format('YYYY-MM-DD');
        const response = await fetchSalaryRecordsForAllActiveEmployees(startDate, endDate);
        setAllActiveEmployeesData(response);
      } catch (error) {
        console.error('Error fetching all active employees data:', error);
        setAllActiveEmployeesData(null);
      } finally {
        setIsLoadingTillDate(false);
      }
    };
    fetchAllActiveData();
  }, [month]);

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
    return filteredEmployeeSummaries.map((summary: any) => {
      const rawTotals = summary.rawTotals || {};

      return {
        id: summary.employeeCode || 'N/A',
        name: summary.fullName || 'N/A',
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
        workedTime: rawTotals?.payableHours ? `${rawTotals?.payableHours?.toFixed(2)} hrs` : '-',
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

  // Check if professional fees are applicable
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
        isLoadingTillDate={isLoadingTillDate}
      />

      {/* Employee Salary Table */}
      <div className="mt-5">
        <h1>Monthly Salary</h1>
        <MaterialTable
          renderTopToolbarRightActions={() => (
            <Box sx={{ display: 'flex', gap: '0.75rem', alignItems: 'center', px: 1 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="status-filter-label">Employee Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  id="status-filter"
                  value={statusFilter}
                  label="Employee Status"
                  onChange={(e) => setStatusFilter(e.target.value as 'Active' | 'Deactive' | 'All')}
                  sx={{
                    bgcolor: '#fff',
                    borderRadius: '10px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d9e1ec' },
                  }}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Deactive">Deactive</MenuItem>
                  <MenuItem value="All">All</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
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
          tableName="MonthlySalaryEmployeeData"
          employeeId={employeeIdCurrent}
          enableColumnSpecificSearch={true}
        />
      </div>
    </>
  );
};

export default MonthlySalary;

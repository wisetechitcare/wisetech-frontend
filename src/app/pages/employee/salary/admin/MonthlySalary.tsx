import React, { useMemo, useState, useEffect } from "react";
import { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import SalarySummaryCard from "./SalarySummaryCard";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { fetchSalaryRecordsForAllActiveEmployees } from "@services/employee";

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

  // Extract total payable amount till date from API response
  const totalPayableAmountTillDate = allActiveEmployeesData?.message?.totals?.totalPayableAmountTillDate;

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
        absent: (rawTotals?.absentDays < 0 ? 0 : rawTotals?.absentDays) ?? 0,
        late: rawTotals.lateCheckinDays ?? 0,
        leaves: rawTotals.leavesDays ?? 0,
        extraDay: rawTotals.extraDaysWorked ?? 0,
        workingTime: rawTotals?.payableHours ? `${rawTotals?.payableHours?.toFixed(2)} hrs` : '-',
        overTime: rawTotals?.overTime ? `${rawTotals?.overTime?.toFixed(2)} hrs` : '-',
        remainingMinutes: rawTotals?.remainingMinutes ? `${rawTotals?.remainingMinutes?.toFixed(2)} hrs` : '-',
        salary: rawTotals.netAmount || '-',
        paidAmount: rawTotals.paidAmount || '-',
        basicSalary: rawTotals.basicSalary || '-',
        overTimeAmount: rawTotals?.overTimeAmount || '-',
        dueAmount: rawTotals.dueAmount || '-',
      };
    });
  }, [employeesData]);

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
              accessorKey: "basicSalary",
              header: "Basic Salary",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Number(renderedCellValue)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            },
            {
              accessorKey: "overTimeAmount",
              header: "Over Time Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Number(renderedCellValue)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                return `₹${Number(renderedCellValue)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            },
            {
              accessorKey: "paidAmount",
              header: "Paid Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Number(renderedCellValue)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            },
            {
              accessorKey: "dueAmount",
              header: "Due Amount",
              Cell: ({ renderedCellValue }: any) => {
                if (renderedCellValue === "-" || !renderedCellValue) return "-";
                return `₹${Number(renderedCellValue)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          tableName="MonthlySalaryEmployeeData"
          employeeId={employeeIdCurrent}
          enableColumnSpecificSearch={true}
        />
      </div>
    </>
  );
};

export default MonthlySalary;

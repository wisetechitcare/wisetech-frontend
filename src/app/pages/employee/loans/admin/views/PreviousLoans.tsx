import React, { useMemo, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { MRT_ColumnDef } from "material-react-table";
import MaterialTable from "app/modules/common/components/MaterialTable";
import { RootState } from "@redux/store";
import { resourceNameMapWithCamelCase } from "@constants/statistics";
import { Link } from "react-router-dom";
import { formatNumber, getCompletionAmountOfLoanByLoanIdAndEndDate } from "@utils/statistics";

interface LoanSummary {
  // id: string;
  name: string;
  loanAmount: number;
  paidAmount: number;
  status: string;
  startDate: string;
  endDate: string | null;
  loanType: string;
  loanDuration: number;
}

interface MyComponentProps {
  resource: string;
  viewOthers: boolean;
  viewOwn: boolean;
}

const PreviousLoans: React.FC<MyComponentProps> = ({ resource, viewOthers, viewOwn }) => {
  const loans = useSelector((state: RootState) => state.loan.personalLoans);
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

  // 1. Filter only fully disbursed loans
  const previousLoans = useMemo(() => {
    const isApproved = loans.filter((loan) => loan.status === 1);
    return isApproved.filter((loan) =>
      loan.installments.every(
        (inst) =>
          parseFloat(inst.paidAmount) >= parseFloat(inst.installmentAmount) &&
          inst.status === 1 &&
          inst.installmentType !== "Upcoming"
      )
    );
  }, [loans]);

  const [endDates, setEndDates] = useState<(string | null)[]>([]);

  // Fetch endDates via async calls
  useEffect(() => {
    const fetchEndDates = async () => {
      const dates = await Promise.all(
        previousLoans.map((loan) => getCompletionAmountOfLoanByLoanIdAndEndDate(loan.id))
      );
      setEndDates(dates.map((date) => date?.endDate || null));
    };

    if (previousLoans.length > 0) fetchEndDates();
  }, [previousLoans]);

  // 2. Transform into table-compatible data
  const transformedLoans: LoanSummary[] = useMemo(() => {
    
    return previousLoans.map((loan, idx) => {
      const totalLoanAmount = loan.loanAmount;
      const firstInstallmentAmount = parseFloat(loan.installments[0]?.installmentAmount || "0");
      const paidAmount = loan.installmentSummary.paid * firstInstallmentAmount;
      
      return {
        id: loan.id,
        name: loan.name,
        employeeId: loan.employeeId,
        loanAmount: totalLoanAmount,
        paidAmount,
        status:
          loan.status === 0
            ? "Pending"
            : loan.status === 1
            ? "Approved"
            : "Rejected",
        startDate: new Date(loan.startDate).toLocaleDateString(),
        endDate: endDates[idx] ? new Date(endDates[idx]!).toLocaleDateString() : "N/A",
        loanType: loan.loanType,
        loanDuration: loan.loanDuration,
      };
    });
  }, [previousLoans, endDates]);

  // 3. Define columns
  const columns = useMemo<MRT_ColumnDef<LoanSummary>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "loanAmount",
        header: "Loan Amt",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
      {
        accessorKey: "paidAmount",
        header: "Paid Amt",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
      { accessorKey: "status", header: "Status" },
      {
        accessorKey: "startDate",
        header: "Start Date",
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "2-digit",
          }),
      },
      {
        accessorKey: "endDate",
        header: "End Date",
        Cell: ({ cell }) => {
          const val = cell.getValue<string>();
          return val === "N/A"
            ? "N/A"
            : new Date(val).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "2-digit",
              });
        },
      },
      { accessorKey: "loanType", header: "Loan Type" },
      {
        accessorKey: "loanDuration",
        header: "Duration",
        Cell: ({ cell }) => {
          const duration = cell.getValue<number>();
          return duration ? `${duration} Months` : "N/A";
        },
      },
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              Cell: ({ row }: { row: any }) => (
                <div style={commonButtonStyle}>
                  <Link to={`${row?.original?.id}`}>View</Link>
                </div>
              ),
            },
          ]
        : []),
    ],
    [isAdmin]
  );

  const commonButtonStyle = {
    fontSize: "14px",
    fontWeight: "400",
    color: "#9D4141",
    cursor: "pointer",
  };

  return (
    <div>
      <h3 className="pt-10 fw-bold">Previous Loans</h3>
      <MaterialTable
        data={transformedLoans}
        columns={columns}
        tableName="Previous Loans"
        resource={resource}
        viewOthers={viewOthers}
        viewOwn={viewOwn}
        employeeId={employeeIdCurrent}
      />
    </div>
  );
};

export default PreviousLoans;

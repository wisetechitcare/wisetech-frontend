import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import MaterialTable from "app/modules/common/components/MaterialTable";
import { resourceNameMapWithCamelCase } from "@constants/statistics";
import { Link } from "react-router-dom";
import { formatNumber } from "@utils/statistics";

interface LoanSummary {
  name: string;
  loanAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  startDate: string;
  endDate: string;
  loanType: string;
  loanDuration: number;
  installment: string;
}

interface MyComponentProps {
  resource: string;
  viewOthers: boolean;
  viewOwn: boolean;
}

const OngoingLoans: React.FC<MyComponentProps> = ({ resource, viewOthers, viewOwn }) => {
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const loans = useSelector((state: RootState) => state.loan.personalLoans);
  const isAdmin: boolean = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );
  const ongoingLoans = loans.filter(
    (loan) =>
      loan.status === 1 &&
      loan.installments.some(
        (inst) =>
          parseFloat(inst.paidAmount) < parseFloat(inst.installmentAmount) ||
          inst.status !== 1 ||
          inst.installmentType === "Upcoming"
      )
  );
  

  const tableData: LoanSummary[] = ongoingLoans.map((loan) => ({
    id: loan.id,
    employeeId: loan.employeeId,
    name: loan.name,
    loanAmount: loan.loanAmount,
    collectedAmount: loan.collectedAmount,
    pendingAmount: loan.pendingAmount,
    startDate: loan.startDate,
    endDate: loan.endDate ?? "N/A",
    loanType: loan.loanType,
    loanDuration: loan.loanDuration,
    installment: `${loan.installmentSummary.paid}/${loan.installmentSummary.total}`,
  }));
  

  // Table columns
  const columns = useMemo<MRT_ColumnDef<LoanSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "loanAmount",
        header: "Loan Amount",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
      {
        accessorKey: "collectedAmount",
        header: "Collected Amount",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
      {
        accessorKey: "pendingAmount",
        header: "Pending Amount",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
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
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "2-digit",
          }),
      },
      {
        accessorKey: "loanType",
        header: "Loan Type",
      },
      {
        accessorKey: "loanDuration",
        header: "loan Duration",
        Cell: ({ cell }) => {
          const duration = cell.getValue<number | null>();
          return duration ? `${duration} Months` : "N/A";
        }
      },
      {
        accessorKey: "installment",
        header: "Installments",
      },

      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              Cell: ({ row }: { row: any }) => (
                <div style={commonButtonStyle}>
                  <Link to={`${row?.original?.id}`}>
                    {" "}
                    View Details
                  </Link>
                </div>
              ),
            },
          ]
        : []),
    ],
    [isAdmin]
  );

  const commonButtonStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: "400",
    color: "#9D4141",
    cursor: "pointer",
  };

  return (
    <div>
      <h3 className="pt-10 fw-bold">Ongoing Loans</h3>
      <MaterialTable
        data={tableData}
        columns={columns}
        tableName="Ongoing Loans"
        resource={resource}
        viewOthers={viewOthers}
        viewOwn={viewOwn}
        employeeId={employeeIdCurrent}
      />
    </div>
  );
};

export default OngoingLoans;

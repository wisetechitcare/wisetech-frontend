import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";

import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';

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
  const columns = useMemo<ColumnDef<LoanSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "loanAmount",
        header: "Loan Amount",
        cell: ({ cell }:any) => formatNumber(cell.getValue()),
      },
      {
        accessorKey: "collectedAmount",
        header: "Collected Amount",
        cell: ({ cell }:any) => formatNumber(cell.getValue()),
      },
      {
        accessorKey: "pendingAmount",
        header: "Pending Amount",
        cell: ({ cell }:any) => formatNumber(cell.getValue()),
      },
      {
        accessorKey: "startDate",
        header: "Start Date",
        cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "2-digit",
          }),
      },
      {
        accessorKey: "endDate",
        header: "End Date",
        cell: ({ cell }) =>
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
        cell: ({ cell }) => {
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
              cell: ({ row }: { row: any }) => (
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
    color: "#1E3A8A",
    cursor: "pointer",
  };

  return (
    <div>
      <h3 className="pt-10 fw-bold">Ongoing Loans</h3>
      <DataTable
        caption="Ongoing Loans"
        columns={columns as any}
        data={tableData}
        getRowId={(r: any, i) => String(r.id ?? r.loanId ?? r.employeeId ?? i)}
        
        
        stateKey="loans.admin.ongoing"
        groupableColumns={false}
        searchPlaceholder="Search…"
      />
    </div>
  );
};

export default OngoingLoans;

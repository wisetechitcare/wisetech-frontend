import React, { useMemo, useState } from "react";
import { MRT_ColumnDef } from "material-react-table";
import MaterialTable from "app/modules/common/components/MaterialTable";
import { resourceNameMapWithCamelCase } from "@constants/statistics";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { RootState } from "@redux/store";
import { useSelector } from "react-redux";

interface InstallmentPayment {
  name: string;
  loanAmount: number;
  installment: string;
  loanType: string;
  dueDate: string;
  billDue: number;
  previousDue: number;
  dueThisMonth: number;
  paidAmount: number;
  status: string;
}

interface InstallmentPaymentsProps {
  payments: any[];
  isAdmin?: boolean;
  resource: string;
  viewOwn: boolean;
  viewOthers: boolean;
}

const InstallmentPayments: React.FC<InstallmentPaymentsProps> = ({
  payments,
  isAdmin = false,
  resource,
  viewOwn,
  viewOthers,
}) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const tableData: InstallmentPayment[] = payments.map((loan) => {
    
    return ({
      name: loan.name,
      loanAmount: Number(loan.loanAmount), 
      employeeId: loan?.employeeId,
      installment:
        loan.installmentSummary && loan.installmentSummary.total != null
          ? `${loan.installmentSummary.paid}/${loan.installmentSummary.total}`
          : "N/A",
      loanType: loan.loanType, 
      dueDate: loan.dueDate,
      billDue: parseFloat(loan.billDue) || 0,
      previousDue: parseFloat(loan.previousDue) || 0, 
      dueThisMonth: parseFloat(loan.dueThisMonth) || 0, 
      paidAmount: Number(loan.paidAmount) || 0, 
      status: loan.status,
    })
  });

  const columns = useMemo<MRT_ColumnDef<InstallmentPayment>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "loanAmount",
        header: "Loan Amount",
        Cell: ({ cell }) =>
          `₹ ${cell.getValue<number>()?.toLocaleString() || "0"}`,
      },
      { accessorKey: "installment", header: "Installment" },
      { accessorKey: "loanType", header: "Loan Type" }, 
      {
        accessorKey: "dueDate",
        header: "Due Date",
        Cell: ({ cell }) => {
          const raw = cell.getValue<string>();
          return raw
            ? new Date(raw).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "2-digit",
              })
            : "-";
        },
      },
      {
        accessorKey: "billDue",
        header: "Bill Due",
        Cell: ({ cell }) =>
          `₹ ${cell.getValue<number>()?.toLocaleString() || "0"}`,
      },
      {
        accessorKey: "previousDue",
        header: "Previous Due",
        Cell: ({ cell }) =>
          `₹ ${cell.getValue<number>()?.toLocaleString() || "0"}`,
      },
      {
        accessorKey: "dueThisMonth",
        header: "Due This Month",
        Cell: ({ cell }) =>
          `₹ ${cell.getValue<number>()?.toLocaleString() || "0"}`,
      },
      {
        accessorKey: "paidAmount",
        header: "Paid Amount",
        Cell: ({ cell }) =>
          `₹ ${cell.getValue<number>()?.toLocaleString() || "0"}`,
      },
      { accessorKey: "status", header: "Status" },
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              Cell: ({ row }: any) => <div style={commonButtonStyle} onClick={() => navigate(`/finance/loans/admin/loan-details/${row.original.id}`)}>View Details</div>,
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
      <h3 className="pt-10 fw-bold">Installment Payments</h3>
      <MaterialTable
        data={tableData}
        columns={columns}
        tableName="Installment and Payments"
        resource={resource}
        viewOthers={viewOthers}
        viewOwn={viewOwn}
        employeeId={employeeIdCurrent}
      />
    </div>
  );
};

export default InstallmentPayments;

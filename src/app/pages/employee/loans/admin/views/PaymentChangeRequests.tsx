import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import MaterialTable from "app/modules/common/components/MaterialTable";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { getAllLoanDetails } from "@services/company";
import { savePersonalLoans } from "@redux/slices/loans";
import { successConfirmation } from "@utils/modal";
import { updateLoanIntallmentById } from "@services/employee";
import { LoanStatus } from "@constants/statistics";
import { installmentStatusLabels } from "@constants/statistics";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { formatNumber } from "@utils/statistics";

interface ChangeRequests {
  id: string;
  name: string;
  loanAmount: number;
  payment: string;
  installment: string;
  dueDate?: string | null;
  dueAmount: number;
  payAmount: number;
  request: string;
  status: number;
  note: string;
}
interface MyComponentProps {
  resource: string,
  viewOwn: boolean,
  viewOthers: boolean
}
const PaymentChangeRequests: React.FC<MyComponentProps> = ({  
  resource,
  viewOwn,
  viewOthers,}) => {
  const [loading, setLoading] = useState(false);
  const loans = useSelector((state: RootState) => state.loan.personalLoans);
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  const dispatch = useDispatch();

  const fetchAllLoanDetails = async () => {
    setLoading(true);
    try {
      const {
        data: { loanDetails },
      } = await getAllLoanDetails();
      
      if (loanDetails) {
        dispatch(savePersonalLoans(loanDetails));
      }
    } catch (error) {
      console.error("Error fetching loans data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLoanDetails();
  }, []);

  const approveLoanIntallment = async (instId: string) => {


    await updateLoanIntallmentById({
      id: instId,
      status: LoanStatus.Approved,
      approvedById: employeeId,
    });
    successConfirmation("Loan request approved successfully");
    fetchAllLoanDetails();
  };

  const rejectLoanIntallment = async (instId: string) => {
    await updateLoanIntallmentById({ id: instId, status: LoanStatus.Rejected });
    successConfirmation("Loan request rejected successfully");
    fetchAllLoanDetails();
  };

  // Filter only loans where at least one matching installment exists
  const paymentChangeRequests = useMemo(
    () =>
      loans.filter((loan) =>
        loan.installments.some(
          (inst) =>
            (inst.installmentType === "Custom_Paid" ||
              inst.installmentType === "Skipped") &&
              inst.status === 0
        )
      ),
    [loans]
  );

  // Flatten filtered installments into table-ready rows
  const transformedData: ChangeRequests[] = useMemo(() => {
    return paymentChangeRequests.flatMap((loan: any) =>
      loan.installments
        .filter(
          (inst: any) =>
            (inst.installmentType === "Custom_Paid" ||
              inst.installmentType === "Skipped") &&
            inst.status === 0
        )
        .map((inst: any, index: number) => ({
          id: inst.id,
          employeeId: loan.employeeId,
          loanId: loan.id,
          name: loan.name ?? "N/A",
          loanAmount: loan.loanAmount ?? 0,
          payment: `Payment ${index + 1}`,
          installment: inst.installmentType,
          dueDate: inst.dueDate ?? null,
          dueAmount: Number(inst.installmentAmount) ?? 0,
          payAmount: Number(inst.paidAmount) ?? 0,
          request:
            inst.installmentType === "Skipped"
              ? "Skip Payment"
              : "Custom Payment",
          status: inst.status ?? 0,
          note: inst.note ?? "NA",
        }))
    );
  }, [paymentChangeRequests]);


  const columns = useMemo<MRT_ColumnDef<ChangeRequests>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "loanAmount",
        header: "Loan Amount",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
      { accessorKey: "payment", header: "Payment" },
      { accessorKey: "installment", header: "Installment" },
      {
        accessorKey: "dueDate",
        header: "Due Date",
        Cell: ({ cell }) =>
          cell.getValue()
            ? new Date(cell.getValue<string>()).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "2-digit",
              })
            : "N/A",
      },
      {
        accessorKey: "dueAmount",
        header: "Due Amount",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
      {
        accessorKey: "payAmount",
        header: "Pay Amount",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
      { accessorKey: "request", header: "Request Type" },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }) =>
          installmentStatusLabels[cell.getValue<number>()] ?? "Pending",
      },
      { accessorKey: "note", header: "Note" },
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              Cell: ({ row }: { row: any }) => {
                
                const allowEdit = hasPermission(
                  resourceNameMapWithCamelCase.loanInstallment,
                  permissionConstToUseWithHasPermission.editOthers
                );
                
                return (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={commonButtonStyle}>
                      <Link to={`${row.original.loanId}`}>
                        View
                      </Link>
                    </div>
                    {allowEdit && (
                      <span
                        style={commonButtonStyle}
                        onClick={() => approveLoanIntallment(row.original.id)}
                      >
                        Approve
                      </span>
                    )}
                    {allowEdit && (
                      <span
                        style={commonButtonStyle}
                        onClick={() => rejectLoanIntallment(row.original.id)}
                      >
                        Reject
                      </span>
                    )}
                    {!allowEdit && <span
                        style={commonButtonStyle}
                      >
                        NA
                      </span>}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [isAdmin]
  );

  const commonButtonStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 400,
    color: "#9D4141",
    cursor: "pointer",
  };

  return (
    <div>
      <h3 className="pt-10 fw-bold">Payment Change Requests</h3>
      <MaterialTable
        data={transformedData}
        columns={columns}
        tableName="Payment Requests"
        resource={resource}
        viewOthers={viewOthers}
        viewOwn={viewOwn}
        employeeId={employeeId}
      />
    </div>
  );
};

export default PaymentChangeRequests;

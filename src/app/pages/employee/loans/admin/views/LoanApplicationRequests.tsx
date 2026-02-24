import { useEffect, useState, useMemo } from "react";
import { getAllLoans } from "@services/company";
import { approveLoanById, updateLoanById } from "@services/employee";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import MaterialTable from "app/modules/common/components/MaterialTable";
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { successConfirmation } from "@utils/modal";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { LoanStatus } from "@constants/statistics";
import { formatNumber } from "@utils/statistics";


type ApplicationRequestData = {
  id: string;
  name: string;
  loanAmount: number;
  startDate: string;
  endDate: string;
  loanType: string;
  loanDuration: number | null;
  resion: string;
  status: number;
};

interface MyComponentProps {
  resource: string;
  viewOthers: boolean;
  viewOwn: boolean;
}


const LoanApplicationRequests: React.FC<MyComponentProps> = ({ resource, viewOthers, viewOwn }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [requestsData, setRequestsData] = useState<ApplicationRequestData[]>(
    []
  );
  const dispatch = useDispatch();
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );

  const fetchAllLoan = async () => {
    setLoading(true);
    try {
      const {
        data: { loans },
      } = await getAllLoans();
      
      const mapped = loans.map((loan: any) => ({
        id: loan.id,
        employeeId: loan?.employeeId,
        name: loan.name || "N/A",
        loanAmount: Number(loan.loanAmount),
        startDate: dayjs(loan.createdAt).format("DD-MMM-YYYY"),
        endDate: loan.approvedAt
          ? dayjs(loan.approvedAt).format("DD-MMM-YYYY")
          : "Pending",
        loanType: loan.loanType,
        loanDuration: loan.numberOfMonths,
        resion: loan.loanReason,
        status: loan.status,
      }));
      
      setRequestsData(mapped);
    } catch (error) {
      console.error("Error fetching loans data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLoan();
  }, []);

  const applicationRequests = requestsData.filter((loan) => loan.status === 0);

  const approveLoan = async (loanId: string) => {
    const res = await approveLoanById(loanId, employeeId, dayjs().format("YYYY-MM-DD"));
    console.log("approveLoanapproveLoan",res);
    successConfirmation("Loan request approved successfully");
    fetchAllLoan();
  };

  const rejectLoan = async (loanId: string) => {
    const reas = await updateLoanById({ id: loanId, status: LoanStatus.Rejected });
    successConfirmation("Loan request rejected successfully");
    fetchAllLoan();
  };

  const columns = useMemo<MRT_ColumnDef<ApplicationRequestData>[]>(() => {
    const baseColumns: MRT_ColumnDef<ApplicationRequestData>[] = [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "loanAmount",
        header: "Loan Amount",
        Cell: ({ renderedCellValue }:any) => formatNumber(renderedCellValue),
      },
      // {
      //   accessorKey: "startDate",
      //   header: "Start Date",
      //   Cell: ({ cell }) =>
      //     new Date(cell.getValue<string>()).toLocaleDateString("en-GB", {
      //       day: "numeric",
      //       month: "long",
      //       year: "2-digit",
      //     }),
      // },
      // {
      //   accessorKey: "endDate",
      //   header: "End Date",
      //   Cell: ({ cell }) =>
      //     new Date(cell.getValue<string>()).toLocaleDateString("en-GB", {
      //       day: "numeric",
      //       month: "long",
      //       year: "2-digit",
      //     }),
      // },
      { accessorKey: "loanType", header: "Loan Type" },
      { 
        accessorKey: "loanDuration", 
        header: "Loan Duration",
        Cell: ({ cell }) => {
          const duration = cell.getValue<number | null>();
          return duration ? `${duration} Months` : "N/A";
        }
      },
      { accessorKey: "resion", header: "Reason" },
    ];

    if (isAdmin) {
      baseColumns.push({
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }) => {
          const allowEdit = hasPermission(
            resourceNameMapWithCamelCase.loan,
            permissionConstToUseWithHasPermission.editOthers
          );
          
          return (
            <div className="d-flex flex-row gap-2 items-center justify-center space-x-4">
              <div style={commonButtonStyle}>
                <Link to={`${row.original.id}`}>View</Link>
              </div>
              {allowEdit ? (
                <div
                  onClick={() => approveLoan(row.original.id)}
                  style={commonButtonStyle}
                >
                  Approve
                </div>
              ):<div
              
              style={commonButtonStyle}
            >
              NA
            </div>}
              {allowEdit ? (
                <div
                  onClick={() => rejectLoan(row.original.id)}
                  style={commonButtonStyle}
                >
                  Reject
                </div>
              ):<div
              
              style={commonButtonStyle}
            >
              NA
            </div>}
            </div>
          );
        },
      });
    }

    return baseColumns;
  }, [isAdmin]);

  const commonButtonStyle = {
    fontSize: "14px",
    fontWeight: "400",
    color: "#9D4141",
    cursor: "pointer",
  };

  return (
    <div>
      <h3 className="pt-10 fw-bold">Loan Application Requests</h3>
      <MaterialTable
        data={applicationRequests}
        columns={columns}
        tableName="Application Requests"
        resource={resource}
        viewOthers={viewOthers}
        viewOwn={viewOwn}
        employeeId={employeeId}
      />
    </div>
  );
};

export default LoanApplicationRequests;

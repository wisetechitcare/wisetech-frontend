import { IReimbursements, IReimbursementsFetch } from "@models/employee";
import { RootState } from "@redux/store";
import {
  approveEmpReimbursementRequestById,
  fetchAllTimeReimbursementsOfAllEmp,
  fetchEmpAlltimeReimbursements,
  fetchEmpMonthlyReimbursements,
  fetchEmpYearlyReimbursements,
  fetchYearlyReimbursementsOfAllEmp,
  rejectEmpReimbursementRequestById,
} from "@utils/statistics";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Overview from "../common/Overview";
import MaterialToggleReimbursement, {
  ToggleItemsCallBackFunctions,
} from "../../MaterialToggleReimbursement";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { deleteConfirmation, errorConfirmation, rejectConfirmation, successConfirmation } from "@utils/modal";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { approveMultipleReimbursements } from "@services/employee";
import { toast } from "react-toastify";

function AllEmployee() {
  const [totalRequestedAmount, setTotalRequestedAmount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingRequestData, setPendingRequestData] = useState<
    IReimbursementsFetch[]
  >([]);
  const [reimbursementData, setReimbursementData] = useState<
    IReimbursementsFetch[]
  >([]);
  const [showEditDeleteOption, setShowEditDeleteOption] = useState(false);
  const [showIdCol, setShowIdCol] = useState(true);
  const [showName, setShowName] = useState(true);
  const [fetchAgain, setFetchAgain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | 'approveAll' | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (month: Dayjs): void {
      fetchEmpMonthlyReimbursements(month);
    },
    yearly: function (year: Dayjs): void {
      fetchEmpYearlyReimbursements(year);
    },
    allTime: function (year: Dayjs): void {
      fetchEmpAlltimeReimbursements();
    },
  };

  useEffect(() => {
    const currentYear = dayjs().startOf("year");
    fetchYearlyReimbursementsOfAllEmp(currentYear).then((data) => {
      let totalAmount = 0,
        totalRequest = 0,
        approvedCount = 0,
        rejectedCount = 0,
        pendingCount = 0;
      data.forEach((ele) => {
        if (ele.id) {
          totalAmount += parseInt(ele.amount ? ele.amount : "0");
          totalRequest += 1;
          if (ele.status == "Pending") {
            pendingCount += 1;
          } else if (ele.status == "Rejected") {
            rejectedCount += 1;
          } else {
            approvedCount += 1;
          }
        }
      });
      setApprovedRequests(approvedCount);
      setPendingRequests(pendingCount);
      setRejectedRequests(rejectedCount);
      setTotalRequests(totalRequest);
      setTotalRequestedAmount(totalAmount);
      setReimbursementData(data);
    });
  }, [fetchAgain]);

  useEffect(() => {
    setPendingRequestData([]);
    fetchAllTimeReimbursementsOfAllEmp().then((data) => {
      data.forEach((ele) => {
        if (ele.id) {
          if (ele.status == "Pending") {
            setPendingRequestData((prev) => [...prev, ele]);
          }
        }
      });
    });
  }, [fetchAgain]);

  const handleApprove = async (rowDetails: IReimbursementsFetch) => {

    if (!rowDetails || !rowDetails.id) {
      return;
    }
    try {
    setLoading(true);
    setProcessingRowId(rowDetails?.id);
    setProcessingAction("approve");
    const res = await approveEmpReimbursementRequestById(rowDetails?.id);
    successConfirmation("Reimbursement Approved Successfully!");
    setFetchAgain((prev) => !prev);
    } catch (error) {
      console.log("error in handleApprove",error);
    } finally{
      setLoading(false);
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };
 

  const handleReject = async (rowDetails: IReimbursementsFetch) => {
    if (!rowDetails || !rowDetails.id) {
      return;
    }
    try {
      setLoading(true);
      setProcessingRowId(rowDetails?.id);
      setProcessingAction("reject");
      const val = await deleteConfirmation("Reimbursement Rejected Successfully!", "Yes, reject it!","Rejected!");
      if(val){
        const res = await rejectEmpReimbursementRequestById(rowDetails?.id);
        setFetchAgain((prev) => !prev);
      }
    } catch (error) {
      console.log("error in handleReject",error);
    } finally{
      setLoading(false);
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleViewDocument = (documentUrl: string) => {
    window.open(documentUrl, '_blank');
  };

  const handleApproveAll = async () => {
    if (pendingRequestData.length === 0) {
      toast.info('No pending requests to approve');
      return;
    }

    try {
      setLoading(true);
      setIsApprovingAll(true);
      setProcessingAction('approveAll');
      
      const reimbursementIds = pendingRequestData.map(item => item.id).filter(Boolean) as string[];
      const response = await approveMultipleReimbursements({ reimbursementIds });
      if (response) {
        successConfirmation('All pending reimbursements have been approved successfully!');
        setFetchAgain(prev => !prev);
      }
    }
    catch (error) {
      console.error('Error approving all reimbursements:', error);
      errorConfirmation('Failed to approve all reimbursements. Please try again.');
    } finally {
      setLoading(false);
      setIsApprovingAll(false);
      setProcessingAction(null);
    }
  };

  const columns = useMemo<MRT_ColumnDef<IReimbursements>[]>(
    () => [
      {
        accessorKey: "expenseDate",
        header: "Date",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "day",
        header: "Day",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "ID",
        header: "ID",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "name",
        header: "Name",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "description",
        header: "Note",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "type",
        header: "Type",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey:'document',
        header:'Document',
        enableSorting:false,
        enableColumnActions:false,
        Cell:({renderedCellValue}:any)=>{
          return (
            <button className="btn btn-icon btn-active-color-primary btn-sm w-[20px]" onClick={() => handleViewDocument(renderedCellValue)} disabled={!renderedCellValue}>          
               {renderedCellValue ? <KTIcon iconName='eye' className='fs-3' /> : <i className="bi bi-file-earmark-x fs-3 text-danger"></i>}
            </button>
          )
        },
      },
      // ...(showEditDeleteOption ? [{
      //   accessorKey: "actions",
      //   header: "Actions",
      //   enableSorting: false,
      //   enableColumnActions: false,
      //   Cell: ({ row }: any) => (
      //     <div className="flex items-center justify-center space-x-4">
      //       {" "}
      //       <button
      //         className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
      //         onClick={() => handleApprove()} // handleApprove(row.original)
      //       >
      //         <KTIcon iconName="pencil" className=" inline fs-4 text-red-500" />
      //         {/* Edit */}
      //       </button>
      //       <button
      //         className="btn btn-icon btn-active-color-primary btn-sm w-4"
      //         onClick={() => handleReject()} // handleReject(row.original)
      //       >
      //         <KTIcon iconName="trash" className="inline fs-4 text-red-500" />
      //         {/* Delete */}
      //       </button>
      //     </div>
      //   ),
      // }]:[]),
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              enableSorting: false,
              enableColumnActions: false,
              Cell: ({ row }: any) => {
                const resEdit = hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.editOthers, row?.original);
            
                return (
                  resEdit ? (<div className="flex items-center justify-center space-x-4">
                    {" "}
                    <button
                      className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                      onClick={() => handleApprove(row.original)}
                      disabled={loading || processingRowId === row.original.id}
                    >
                      {processingRowId === row.original.id && processingAction === 'approve' ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                            <img src={toAbsoluteUrl("media/svg/misc/tick.svg")} />
                        )}
                    </button>
                    <button
                      className="btn btn-icon btn-active-color-primary btn-sm w-4"
                      onClick={() => handleReject(row.original)}
                      disabled={loading || processingRowId === row.original.id}
                    >
                      {processingRowId === row.original.id && processingAction === 'reject' ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                            <img src={toAbsoluteUrl("media/svg/misc/cross.svg")} />
                        )}
                    </button>
                  </div>): "Not Allowed"
                )
              }
            },
          ]
        : []),
    ],
    [processingRowId, processingAction]
  );

  return (
    <>
      <Overview
        totalRequestedAmount={totalRequestedAmount}
        totalRequests={totalRequests}
        approvedRequests={approvedRequests}
        rejectedRequests={rejectedRequests}
        pendingRequests={pendingRequests}
      />
      <>
        <div className="mt-6 d-flex justify-content-between align-items-center">
          <h2>Requests</h2>
          {pendingRequestData.length > 0 && (
            <button 
              className={`btn btn-primary ${isApprovingAll ? 'disabled' : ''}`}
              onClick={handleApproveAll}
              disabled={isApprovingAll}
            >
              {isApprovingAll ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Approving...
                </>
              ) : (
                'Approve All Pending'
              )}
            </button>
          )}
        </div>
        <MaterialTable
          columns={columns}
          data={pendingRequestData}
          employeeId={employeeId}
          hideExportCenter={false}
          tableName="All Reimbursements"
          resource={resourceNameMapWithCamelCase.reimbursement}
          viewOthers={true}
          viewOwn={true}
        />
      </>
      <div className="my-10">
        <h2>Reimbursement Records</h2>
      </div>
      <MaterialToggleReimbursement
        toggleItemsActions={toggleItemsActions}
        showIdCol={showIdCol}
        showName={showName}
        resource={resourceNameMapWithCamelCase.reimbursement}
        viewOthers={true}
        viewOwn={true}
        checkOwnWithOthers={true}
      />
    </>
  );
}

export default AllEmployee;

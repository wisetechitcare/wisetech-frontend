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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useSelector } from "react-redux";
import Overview from "../common/Overview";
import MaterialToggleReimbursement, {
  ToggleItemsCallBackFunctions,
} from "../../MaterialToggleReimbursement";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { deleteConfirmation, errorConfirmation, successConfirmation } from "@utils/modal";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { approveMultipleReimbursements } from "@services/employee";
import { toast } from "react-toastify";
import { useReimbursementLookups } from "@hooks/useReimbursementLookups";

// ---------------------------------------------------------------------------
// DocumentPreviewModal
// ---------------------------------------------------------------------------

interface DocumentPreviewModalProps {
  url: string;
  onClose: () => void;
}

function DocumentPreviewModal({ url, onClose }: DocumentPreviewModalProps) {
  const cleanUrl = url.split("?")[0].toLowerCase();
  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(cleanUrl);
  const isPdf = cleanUrl.endsWith(".pdf");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.65)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Document preview"
    >
      <div
        className="d-flex flex-column bg-white rounded shadow overflow-hidden"
        style={{ width: "min(75vw, 900px)", height: "min(78vh, 710px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light flex-shrink-0">
          <div className="d-flex align-items-center gap-2 text-gray-700 fw-semibold fs-7 text-truncate">
            <KTIcon iconName="document" className="fs-4 text-primary" />
            <span className="text-truncate" style={{ maxWidth: 560 }}>
              {url.split("/").pop()?.split("?")[0] ?? "Document"}
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-light btn-active-light-primary d-flex align-items-center gap-1"
              title="Open in new tab"
            >
              <KTIcon iconName="exit-right-corner" className="fs-5" />
              <span className="d-none d-sm-inline">Open in tab</span>
            </a>

            <button
              className="btn btn-sm btn-icon btn-light btn-active-light-danger"
              onClick={onClose}
              title="Close preview (Esc)"
            >
              <KTIcon iconName="cross" className="fs-2" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div
          className="flex-grow-1 overflow-hidden bg-light d-flex align-items-center justify-content-center"
          style={{ minHeight: 0 }}
        >
          {isImage ? (
            <img
              src={url}
              alt="Document preview"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: "1rem", userSelect: "none" }}
            />
          ) : isPdf ? (
            <iframe
              src={url}
              title="PDF preview"
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="fullscreen"
            />
          ) : (
            <div className="d-flex flex-column align-items-center gap-3 p-5 text-center w-100 h-100">
              <iframe
                src={url}
                title="Document preview"
                style={{ width: "100%", flex: 1, border: "none", borderRadius: 8, minHeight: 0 }}
                allow="fullscreen"
              />
              <p className="text-muted fs-7 mb-0">
                If the document does not display,{" "}
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary">
                  open it in a new tab
                </a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ---------------------------------------------------------------------------
// AllEmployee
// ---------------------------------------------------------------------------

function AllEmployee() {
  const [totalRequestedAmount, setTotalRequestedAmount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingRequestData, setPendingRequestData] = useState<IReimbursementsFetch[]>([]);
  const [reimbursementData, setReimbursementData] = useState<IReimbursementsFetch[]>([]);
  const [showIdCol] = useState(true);
  const [showName] = useState(true);
  const [fetchAgain, setFetchAgain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"approve" | "reject" | "approveAll" | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  /** URL of the document currently being previewed; null = modal closed */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);

  // Resolvers for the pending requests table (uses pendingRequestData for project prefetch)
  const { resolveClientType, resolveClientCompany, resolveProject } =
    useReimbursementLookups(pendingRequestData);

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (month: Dayjs): void {
      fetchEmpMonthlyReimbursements(month);
    },
    yearly: function (year: Dayjs): void {
      fetchEmpYearlyReimbursements(year);
    },
    allTime: function (): void {
      fetchEmpAlltimeReimbursements();
    },
  };

  // ── Stats + yearly data ───────────────────────────────────────────────────
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
          totalAmount += parseInt(ele.amount ?? "0");
          totalRequest += 1;
          if (ele.status === "Pending") pendingCount += 1;
          else if (ele.status === "Rejected") rejectedCount += 1;
          else approvedCount += 1;
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

  // ── Pending requests (all-time) ───────────────────────────────────────────
  useEffect(() => {
    setPendingRequestData([]);
    fetchAllTimeReimbursementsOfAllEmp().then((data) => {
      const pending = data.filter((ele) => ele.id && ele.status === "Pending");
      setPendingRequestData(pending);
    });
  }, [fetchAgain]);

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleApprove = async (rowDetails: IReimbursementsFetch) => {
    if (!rowDetails?.id) return;
    try {
      setLoading(true);
      setProcessingRowId(rowDetails.id);
      setProcessingAction("approve");
      await approveEmpReimbursementRequestById(rowDetails.id);
      successConfirmation("Reimbursement Approved Successfully!");
      setFetchAgain((prev) => !prev);
    } catch (error) {
      console.error("error in handleApprove", error);
    } finally {
      setLoading(false);
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (rowDetails: IReimbursementsFetch) => {
    if (!rowDetails?.id) return;
    try {
      setLoading(true);
      setProcessingRowId(rowDetails.id);
      setProcessingAction("reject");
      const val = await deleteConfirmation("Reimbursement Rejected Successfully!", "Yes, reject it!", "Rejected!");
      if (val) {
        await rejectEmpReimbursementRequestById(rowDetails.id);
        setFetchAgain((prev) => !prev);
      }
    } catch (error) {
      console.error("error in handleReject", error);
    } finally {
      setLoading(false);
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  /** Open the in-app preview modal instead of navigating away */
  const handleViewDocument = useCallback((documentUrl: string) => {
    setPreviewUrl(documentUrl);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  const handleApproveAll = async () => {
    if (pendingRequestData.length === 0) {
      toast.info("No pending requests to approve");
      return;
    }
    try {
      setLoading(true);
      setIsApprovingAll(true);
      setProcessingAction("approveAll");
      const reimbursementIds = pendingRequestData.map((item) => item.id).filter(Boolean) as string[];
      const response = await approveMultipleReimbursements({ reimbursementIds });
      if (response) {
        successConfirmation("All pending reimbursements have been approved successfully!");
        setFetchAgain((prev) => !prev);
      }
    } catch (error) {
      console.error("Error approving all reimbursements:", error);
      errorConfirmation("Failed to approve all reimbursements. Please try again.");
    } finally {
      setLoading(false);
      setIsApprovingAll(false);
      setProcessingAction(null);
    }
  };

  // ── Pending-requests table columns ───────────────────────────────────────
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
        accessorKey: "clientTypeId",
        header: "Client Type",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => resolveClientType(row.original.clientTypeId),
      },
      {
        accessorKey: "clientCompanyId",
        header: "Client Name",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => resolveClientCompany(row.original.clientCompanyId),
      },
      {
        accessorKey: "projectId",
        header: "Project Name",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => resolveProject(row.original.projectId),
      },
      {
        accessorKey: "fromLocation",
        header: "From Location",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "NA",
      },
      {
        accessorKey: "toLocation",
        header: "To Location",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "NA",
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
        accessorKey: "document",
        header: "Document",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => (
          <button
            className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
            onClick={() => handleViewDocument(renderedCellValue)}
            disabled={!renderedCellValue}
            title={renderedCellValue ? "Preview document" : "No document attached"}
          >
            {renderedCellValue
              ? <KTIcon iconName='eye' className='fs-3' />
              : <i className="bi bi-file-earmark-x fs-3 text-danger"></i>}
          </button>
        ),
      },
      ...(isAdmin ? [{
        accessorKey: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const resEdit = hasPermission(
            resourceNameMapWithCamelCase.reimbursement,
            permissionConstToUseWithHasPermission.editOthers,
            row?.original
          );

          return resEdit ? (
            <div className="flex items-center justify-center space-x-4">
              <button
                className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                onClick={() => handleApprove(row.original)}
                disabled={loading || processingRowId === row.original.id}
              >
                {processingRowId === row.original.id && processingAction === "approve" ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <img src={toAbsoluteUrl("media/svg/misc/tick.svg")} alt="Approve" />
                )}
              </button>
              <button
                className="btn btn-icon btn-active-color-primary btn-sm w-4"
                onClick={() => handleReject(row.original)}
                disabled={loading || processingRowId === row.original.id}
              >
                {processingRowId === row.original.id && processingAction === "reject" ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <img src={toAbsoluteUrl("media/svg/misc/cross.svg")} alt="Reject" />
                )}
              </button>
            </div>
          ) : (
            "Not Allowed"
          );
        },
      }] : []),
    ],
    [resolveClientType, resolveClientCompany, resolveProject, processingRowId, processingAction, loading, isAdmin, handleViewDocument]
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
              className={`btn btn-primary ${isApprovingAll ? "disabled" : ""}`}
              onClick={handleApproveAll}
              disabled={isApprovingAll}
            >
              {isApprovingAll ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Approving...
                </>
              ) : (
                "Approve All Pending"
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

      {/* In-app document preview modal */}
      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={handleClosePreview} />
      )}
    </>
  );
}

export default AllEmployee;

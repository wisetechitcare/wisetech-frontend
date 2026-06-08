import MaterialTable from "@app/modules/common/components/MaterialTable";
import { KTIcon } from "@metronic/helpers";
import { useMemo, useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { MRT_ColumnDef } from "material-react-table";
import { IReimbursements, IReimbursementsFetch, IReimbursementsUpdate } from "@models/employee";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import {
  fetchAllTimeReimbursementsOfAllEmp,
  fetchEmpAlltimeReimbursements,
} from "@utils/statistics";
import { deleteEmployeeReimbursement } from "@services/employee";
import { deleteConfirmation } from "@utils/modal";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { useEventBus } from "@hooks/useEventBus";
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
// AllTime
// ---------------------------------------------------------------------------

function AllTime({
  showEditDeleteOption = false,
  showIdCol = false,
  showName = false,
  onEdit,
  selectedEmployeeId,
  resource = "",
  viewOwn = false,
  viewOthers = false,
  checkOwnWithOthers = false,
}: {
  showEditDeleteOption: boolean;
  showIdCol: boolean;
  showName: boolean;
  onEdit: (row: IReimbursementsUpdate) => void;
  selectedEmployeeId?: string;
  resource: string;
  viewOwn: boolean;
  viewOthers: boolean;
  checkOwnWithOthers: boolean;
}) {
  const [fetchAgain, setFetchAgain] = useState(true);
  const [reimbursementData, setReimbursementData] = useState<IReimbursementsFetch[]>([]);

  /** URL of the document currently being previewed; null = modal closed */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const { resolveClientType, resolveClientCompany, resolveProject } =
    useReimbursementLookups(reimbursementData);

  const handleEdit = async (row: IReimbursementsUpdate) => {
    const finalRow = Object.fromEntries(
      Object.entries(row).filter(([, value]) => value != null)
    );
    onEdit(finalRow);
  };

  const handleDelete = async (row: IReimbursements) => {
    const val = await deleteConfirmation("Reimbursement Deleted Successfully!");
    if (val) {
      await deleteEmployeeReimbursement(row.id.toString());
      setFetchAgain((prev) => !prev);
    }
  };

  /** Open the in-app preview modal instead of navigating away */
  const handleViewDocument = useCallback((document: string) => {
    setPreviewUrl(document);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewUrl(null);
  }, []);

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
      ...(showIdCol ? [{
        accessorKey: "ID",
        header: "ID",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      }] : []),
      ...(showName ? [{
        accessorKey: "name",
        header: "Name",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      }] : []),
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
      ...(showEditDeleteOption ? [{
        accessorKey: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const isApproved = row.original.status === "Approved";
          const resEdit = !isApproved && hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.editOwn, row?.original);
          const resDelete = !isApproved && hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.deleteOwn, row?.original);

          if (isApproved) {
            return <span className="text-muted">No actions available</span>;
          }

          return (
            <div className="flex items-center justify-center space-x-4">
              {resEdit && (
                <button
                  className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                  onClick={() => handleEdit(row.original)}
                >
                  <KTIcon iconName="pencil" className="inline fs-4 text-red-500" />
                </button>
              )}
              {resDelete && (
                <button
                  className="btn btn-icon btn-active-color-primary btn-sm w-4"
                  onClick={() => handleDelete(row.original)}
                >
                  <KTIcon iconName="trash" className="inline fs-4 text-red-500" />
                </button>
              )}
              {!resEdit && !resDelete && "Not Allowed"}
            </div>
          );
        },
      }] : []),
    ],
    [resolveClientType, resolveClientCompany, resolveProject, showEditDeleteOption, showIdCol, showName, handleViewDocument]
  );

  useEffect(() => {
    if (showIdCol) {
      fetchAllTimeReimbursementsOfAllEmp().then((data) => {
        setReimbursementData(data);
      });
    } else {
      if (selectedEmployeeId) {
        fetchEmpAlltimeReimbursements(selectedEmployeeId).then((data) => {
          setReimbursementData(data);
        });
      } else {
        fetchEmpAlltimeReimbursements().then((data) => {
          setReimbursementData(data);
        });
      }
    }
  }, [fetchAgain, showIdCol, selectedEmployeeId]);

  useEventBus("reimbursementRecords", () => {
    setFetchAgain((prev) => !prev);
  });

  return (
    <>
      <MaterialTable
        columns={columns}
        data={reimbursementData}
        muiTableProps={{
          sx: {
            "& .MuiTableBody-root .MuiTableCell-root": {
              borderBottom: "none",
              paddingY: "5px",
            },
          },
        }}
        tableName="All Time Reimbursements"
        resource={resource}
        viewOwn={viewOwn}
        viewOthers={viewOthers}
        checkOwnWithOthers={checkOwnWithOthers}
        employeeId={employeeId}
      />

      {/* In-app document preview modal */}
      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={handleClosePreview} />
      )}
    </>
  );
}

export default AllTime;

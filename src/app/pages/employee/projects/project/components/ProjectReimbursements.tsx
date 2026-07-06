import { useMemo, useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { IReimbursements, IReimbursementsFetch } from "@models/employee";
import { fetchReimbursementsByProjectId } from "@services/employee";
import { useEventBus } from "@hooks/useEventBus";
import { Box, Paper, Stack, Typography } from "@mui/material";

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
// ProjectReimbursements
// ---------------------------------------------------------------------------

interface ProjectReimbursementsProps {
  projectId: string;
}

function ProjectReimbursements({ projectId }: ProjectReimbursementsProps) {
  const [reimbursementData, setReimbursementData] = useState<IReimbursementsFetch[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  /** URL of the document currently being previewed; null = modal closed */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadReimbursements = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetchReimbursementsByProjectId(projectId);
      const raw: IReimbursementsFetch[] = res?.data?.reimbursements ?? [];

      const mapped = raw.map((r) => {
        const date = new Date(r.expenseDate as string);
        const formattedDate = new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(date);

        return {
          ...r,
          expenseDate: formattedDate,
          day: date.toLocaleDateString("en-GB", { weekday: "long" }),
          name: `${r.employee?.users?.firstName ?? ""} ${r.employee?.users?.lastName ?? ""}`.trim(),
          type: r.reimbursementType?.type ?? "N/A",
          status:
            r.status == 0
              ? "Pending"
              : r.status == 1
              ? "Approved"
              : r.status == 2
              ? "Rejected"
              : "-",
        };
      });

      setReimbursementData(mapped);
    } catch (err) {
      console.error("Failed to load project reimbursements:", err);
      setReimbursementData([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadReimbursements();
  }, [loadReimbursements, fetchTrigger]);

  // Auto-refresh whenever a reimbursement is created or updated anywhere in the app
  useEventBus("reimbursementRecords", () => {
    setFetchTrigger((prev) => prev + 1);
  });

  /** Open the in-app preview modal instead of navigating away */
  const handleViewDocument = useCallback((doc: string) => {
    if (doc) setPreviewUrl(doc);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  const totalAmount = useMemo(
    () => reimbursementData.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [reimbursementData]
  );

  const totalVisits = useMemo(
    () => new Set(reimbursementData.map((r) => r.expenseDate)).size,
    [reimbursementData]
  );

  const fmtAmount = (n: number) =>
    Math.round(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const columns = useMemo<MRT_ColumnDef<IReimbursements>[]>(
    () => [
      {
        accessorKey: "expenseDate",
        header: "Date",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "day",
        header: "Day",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "name",
        header: "Name",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "description",
        header: "Note",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A",
      },
      {
        accessorKey: "fromLocation",
        header: "From Location",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "N/A",
      },
      {
        accessorKey: "toLocation",
        header: "To Location",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue ?? "N/A",
      },
      {
        accessorKey: "type",
        header: "Type",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => {
          const colorMap: Record<string, string> = {
            Approved: "success",
            Rejected: "danger",
            Pending: "warning",
          };
          const color = colorMap[renderedCellValue as string] ?? "secondary";
          return (
            <span className={`badge badge-light-${color} fs-7 fw-bold`}>
              {renderedCellValue}
            </span>
          );
        },
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
            {renderedCellValue ? (
              <KTIcon iconName="eye" className="fs-3" />
            ) : (
              <i className="bi bi-file-earmark-x fs-3 text-danger" />
            )}
          </button>
        ),
      },
    ],
    [handleViewDocument]
  );

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "300px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (reimbursementData.length === 0) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center text-center"
        style={{ minHeight: "300px" }}
      >
        <i className="bi bi-receipt fs-2x text-muted mb-4" style={{ fontSize: "3rem" }} />
        <h4 className="text-muted fw-semibold mb-2">No Reimbursements Found</h4>
        <p className="text-gray-500 fs-6 mb-0">
          No reimbursements have been linked to this project yet.
        </p>
        <p className="text-gray-400 fs-7 mt-1">
          When creating a reimbursement request, select this project to link it here.
        </p>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Total Requested Amount",
      sublabel: "Sum of all requests",
      accent: "#2563eb",
      iconBg: "#eff6ff",
      value: fmtAmount(totalAmount),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: "Total Visit",
      sublabel: "Total Visits Recorded",
      accent: "#7c3aed",
      iconBg: "#f5f3ff",
      value: totalVisits,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h4 className="fw-bold text-gray-800">Project Reimbursements</h4>
        <span className="text-muted fs-6">
          {reimbursementData.length} reimbursement
          {reimbursementData.length !== 1 ? "s" : ""} linked to this project
        </span>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
        {kpiCards.map((card) => (
          <Paper
            key={card.label}
            elevation={0}
            sx={{
              flex: "0 0 auto",
              width: 260,
              borderRadius: "16px",
              border: "1px solid #f0f0f0",
              background: "#ffffff",
              overflow: "hidden",
              position: "relative",
              transition: "box-shadow 220ms ease, transform 220ms ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: "0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.08)",
              },
            }}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "4px",
                background: card.accent,
                borderRadius: "16px 0 0 16px",
              }}
            />
            <Box sx={{ p: "18px 20px 18px 24px" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#94a3b8",
                      lineHeight: 1.2,
                      mb: 0.3,
                    }}
                  >
                    {card.label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#b0bec5", fontWeight: 500, lineHeight: 1.2 }}>
                    {card.sublabel}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: card.iconBg,
                    color: card.accent,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </Box>
              </Stack>
              <Typography
                sx={{
                  fontSize: typeof card.value === "number" ? "2rem" : "1.6rem",
                  fontWeight: 800,
                  color: card.accent,
                  lineHeight: 1.1,
                  letterSpacing: "-0.5px",
                  wordBreak: "break-word",
                }}
              >
                {card.value}
              </Typography>
            </Box>
          </Paper>
        ))}
      </div>

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
        tableName="Project Reimbursements"
        resource=""
        viewOwn={false}
        viewOthers={true}
        checkOwnWithOthers={false}
        employeeId=""
      />

      {/* In-app document preview modal */}
      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={handleClosePreview} />
      )}
    </>
  );
}

export default ProjectReimbursements;

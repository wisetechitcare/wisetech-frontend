import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDMS } from "../store/DmsContext";
import {
  generateRevisionFileName,
  getExportTypeConfig,
} from "../utils/dmsUtils";
import type {
  ExportType,
  ExportDestination,
  ExportProgress,
  ExportStep,
} from "../types/dms.types";
import { KTIcon } from "@metronic/helpers";

type ExportFormat = "docx" | "pdf";

interface ExportCenterModalProps {
  show: boolean;
  onHide: () => void;
  leadData: any;
  templateId?: string;
  isDataModified?: boolean;
  onExport: (config: any) => Promise<void>;
}

export const ExportCenterModal: React.FC<ExportCenterModalProps> = ({
  show,
  onHide,
  leadData,
  templateId = "",
  isDataModified = false,
  onExport,
}) => {
  const { state, getLatestTempNumber } = useDMS();

  const [format, setFormat] = useState<ExportFormat | null>(null);
  const [exportType, setExportType] = useState<ExportType>("revision");
  const [destination, setDestination] = useState<ExportDestination>("cloud");
  const [fileName, setFileName] = useState("");
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [tempNumber, setTempNumber] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  useEffect(() => {
    if (show) {
      setFormat(null);
      setExportType(isDataModified ? "temporary" : "revision");
    }
  }, [show, isDataModified]);

  const currentLeadRev = parseInt(String(leadData?.revisionCount || 0));

  useEffect(() => {
    if (show && templateId) {
      const latest = getLatestTempNumber(templateId, currentLeadRev);
      setTempNumber(latest > 0 ? latest : currentLeadRev);
    }
  }, [show, templateId, currentLeadRev, getLatestTempNumber]);

  useEffect(() => {
    if (show) {
      const name = generateRevisionFileName(
        leadData?.inquiryNo || leadData?.prefix || "INQ",
        currentLeadRev,
        exportType,
        leadData?.name || leadData?.projectName,
      );
      setFileName(name);
    }
  }, [show, exportType, leadData, currentLeadRev, tempNumber]);

  const handleStartExport = async (force: boolean = false) => {
    if (!format) return;

    if (!force) {
      const existingFile = state.files.find(
        (f) =>
          f.templateId === templateId &&
          f.revisionNumber === currentLeadRev &&
          f.tempNumber === tempNumber &&
          f.exportType === exportType,
      );

      if (
        existingFile &&
        destination !== "device" &&
        exportType !== "temporary"
      ) {
        setShowConfirmReplace(true);
        return;
      }
    }

    setShowConfirmReplace(false);
    setIsExporting(true);

    const allSteps: ExportStep[] = [
      { id: "1", label: "Resolving placeholders...", status: "running" },
      { id: "2", label: "Injecting metadata...", status: "pending" },
      {
        id: "3",
        label:
          format === "pdf"
            ? "Generating DOCX and converting to PDF..."
            : "Generating document...",
        status: "pending",
      },
      { id: "4", label: "Uploading to AWS S3...", status: "pending" },
      { id: "5", label: "Synchronizing with database...", status: "pending" },
    ];

    const steps =
      destination === "device"
        ? allSteps.filter((s) => !["4", "5"].includes(s.id))
        : allSteps;

    setProgress({
      steps,
      uploadProgress: 0,
      exportProgress: 0,
      isComplete: false,
      hasError: false,
    });

    try {
      await onExport({
        format,
        exportType,
        destination,
        fileName: format === "pdf"
          ? fileName.replace(/\.docx$/, ".pdf")
          : fileName.replace(/\.pdf$/, ".docx"),
        revisionNumber: currentLeadRev,
        tempNumber,
      });

      for (let i = 0; i < steps.length; i++) {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                steps: prev.steps.map((s, idx) => ({
                  ...s,
                  status:
                    idx === i ? "running" : idx < i ? "success" : "pending",
                })),
              }
            : null,
        );
        await new Promise((r) => setTimeout(r, 400));
      }

      setProgress((prev) =>
        prev
          ? {
              ...prev,
              steps: prev.steps.map((s) => ({ ...s, status: "success" })),
              isComplete: true,
            }
          : null,
      );

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("dms-refresh"));
        onHide();
        setIsExporting(false);
        setProgress(null);
      }, 1000);
    } catch (error: any) {
      setProgress((prev) =>
        prev ? { ...prev, hasError: true, errorMessage: error.message } : null,
      );
      setIsExporting(false);
    }
  };

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(12px)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onHide}
    >
      <motion.div
        initial={{ scale: 0.92, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "28px",
          width: "680px",
          maxWidth: "100%",
          boxShadow:
            "0 50px 100px -20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
          position: "relative",
        }}
      >
        {/* Replace Confirmation Overlay */}
        <AnimatePresence>
          {showConfirmReplace && (
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.98)",
                backdropFilter: "blur(8px)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px",
                textAlign: "center",
                borderRadius: "28px",
              }}
            >
              <div style={{ maxWidth: "380px" }}>
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "2px solid rgba(239,68,68,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                  }}
                >
                  <KTIcon
                    iconName="information-5"
                    className="fs-2x text-danger"
                  />
                </div>
                <h3
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#1e293b",
                    marginBottom: "12px",
                    fontFamily: "Barlow",
                  }}
                >
                  File Already Exists
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    marginBottom: "36px",
                    lineHeight: 1.6,
                    fontSize: "14px",
                  }}
                >
                  A file with this revision already exists. Do you want to
                  replace it?
                </p>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setShowConfirmReplace(false)}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "14px",
                      border: "1.5px solid #e2e8f0",
                      background: "white",
                      color: "#475569",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "white")
                    }
                  >
                    No
                  </button>
                  <button
                    onClick={() => handleStartExport(true)}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "14px",
                      border: "none",
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 8px 20px rgba(239,68,68,0.25)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "translateY(-2px)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "translateY(0)")
                    }
                  >
                    Yes
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div
          style={{
            padding: "28px 36px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "13px",
                background: "rgba(157, 65, 65, 0.08)",
                border: "1px solid rgba(157,65,65,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KTIcon iconName="send" className="fs-2 text-primary" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#1e293b",
                  fontFamily: "Barlow",
                  lineHeight: 1.2,
                }}
              >
                Export Revision
              </h2>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: "13px",
                  color: "#94a3b8",
                  fontWeight: 500,
                }}
              >
                Choose the export format for this revision.
              </p>
            </div>
          </div>
          <button
            onClick={onHide}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "10px",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e2e8f0";
              e.currentTarget.style.color = "#475569";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <KTIcon iconName="cross" className="fs-3" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 36px", overflowY: "auto" }}>
          {isExporting ? (
            /* ── Export Progress ── */
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: progress?.isComplete
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(157,65,65,0.08)",
                  border: `2px solid ${progress?.isComplete ? "rgba(34,197,94,0.2)" : "rgba(157,65,65,0.15)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                {progress?.isComplete ? (
                  <KTIcon iconName="check" className="fs-2 text-success" />
                ) : (
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      border: "3px solid rgba(157,65,65,0.2)",
                      borderTop: "3px solid #9d4141",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                )}
              </div>
              <h3 style={{ 
                fontSize: "20px", 
                fontWeight: 800, 
                color: "#1e293b", 
                marginBottom: "8px",
                fontFamily: "Barlow",
              }}>
                {progress?.isComplete
                  ? "Export Complete"
                  : format === "pdf"
                    ? "Generating PDF"
                    : "Generating DOCX"}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "36px",
                }}
              >
                {progress?.isComplete
                  ? "Your document is ready in the DMS Repository."
                  : progress?.steps.find((s) => s.status === "running")
                      ?.label || "Preparing your files..."}
              </p>
              <div
                style={{
                  height: "5px",
                  width: "280px",
                  background: "#f1f5f9",
                  borderRadius: "10px",
                  margin: "0 auto",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: progress?.isComplete ? "100%" : "65%" }}
                  transition={{ duration: 1.4, ease: "easeInOut" }}
                  style={{
                    height: "100%",
                    background: progress?.isComplete
                      ? "linear-gradient(90deg,#22c55e,#16a34a)"
                      : "linear-gradient(90deg,#9d4141,#bd4b4b)",
                    borderRadius: "10px",
                  }}
                />
              </div>
              {progress?.hasError && (
                <div
                  style={{
                    marginTop: "24px",
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#fef2f2",
                    border: "1px solid #fee2e2",
                    color: "#dc2626",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {progress.errorMessage || "Export failed. Please try again."}
                </div>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* ── Section 1: Format Selection ── */}
              <div>
                <SectionLabel>Export Format</SectionLabel>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                    marginTop: "12px",
                  }}
                >
                   <FormatCard
                    selected={format === "docx"}
                    onClick={() => setFormat("docx")}
                    iconName="document"
                    title="Export as DOCX"
                    description="Download editable Word document."
                    accentColor="#2563eb"
                    accentBg="rgba(37,99,235,0.06)"
                  />
                  <FormatCard
                    selected={format === "pdf"}
                    onClick={() => setFormat("pdf")}
                    iconName="file"
                    title="Export as PDF"
                    description="Generate and download PDF version."
                    accentColor="#dc2626"
                    accentBg="rgba(220,38,38,0.06)"
                  />
                </div>
              </div>

              {/* ── Section 2: Document Type ── */}
              <div>
                <SectionLabel>Document Type</SectionLabel>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginTop: "12px",
                  }}
                >
                  {(["revision", "temporary"] as ExportType[]).map((type) => {
                    const cfg = getExportTypeConfig(type);
                    const active = exportType === type;
                    return (
                      <div
                        key={type}
                        onClick={() => setExportType(type)}
                        style={{
                          padding: "18px 20px",
                          borderRadius: "16px",
                          border: `2px solid ${active ? "#9d4141" : "#f1f5f9"}`,
                          background: active ? "rgba(157,65,65,0.03)" : "#fafafa",
                          cursor: "pointer",
                          transition: "all 0.22s",
                          boxShadow: active
                            ? "0 8px 20px -8px rgba(157,65,65,0.15)"
                            : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "9px",
                            background: active ? "#9d4141" : "#f1f5f9",
                            color: active ? "white" : "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.2s",
                          }}
                        >
                          <KTIcon iconName={cfg.iconName} className="fs-3" />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: active ? "#1e293b" : "#475569",
                            }}
                          >
                            {cfg.label}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                            {cfg.description}
                          </div>
                        </div>
                        {active && (
                          <div style={{ marginLeft: "auto" }}>
                            <KTIcon iconName="check-circle" className="fs-4 text-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Section 3: Destination + Revision ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24px",
                }}
              >
                <div>
                  <SectionLabel>Destination</SectionLabel>
                  <div
                    style={{
                      display: "flex",
                      gap: "3px",
                      marginTop: "12px",
                      background: "#f1f5f9",
                      padding: "3px",
                      borderRadius: "10px",
                    }}
                  >
                    {(["device", "cloud", "both"] as ExportDestination[]).map(
                      (dest) => (
                        <div
                          key={dest}
                          onClick={() => setDestination(dest)}
                          style={{
                            flex: 1,
                            padding: "8px 4px",
                            borderRadius: "7px",
                            textAlign: "center",
                            background:
                              destination === dest ? "white" : "transparent",
                            color:
                              destination === dest ? "#1e293b" : "#64748b",
                            boxShadow:
                              destination === dest
                                ? "0 2px 6px rgba(0,0,0,0.08)"
                                : "none",
                            fontSize: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "0.18s",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {dest}
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <SectionLabel>Revision Context</SectionLabel>
                  <div
                    style={{
                      marginTop: "12px",
                      background: "#f8fafc",
                      padding: "11px 16px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      REV {String(currentLeadRev).padStart(2, "0")}
                    </span>
                    <div
                      style={{
                        background: "#9d4141",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "5px",
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                      }}
                    >
                      VER {tempNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 4: File Name ── */}
              <div>
                <SectionLabel>Generated File Name</SectionLabel>
                <div style={{ position: "relative", marginTop: "12px" }}>
                  <input
                    value={
                      format === "pdf"
                        ? fileName.replace(/\.docx$/, ".pdf")
                        : fileName.replace(/\.pdf$/, ".docx")
                    }
                    onChange={(e) => setFileName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 44px 13px 14px",
                      borderRadius: "12px",
                      border: "1.5px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1e293b",
                      outline: "none",
                      transition: "border-color 0.18s",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#9d4141")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#e2e8f0")
                    }
                  />
                  <div
                    style={{ position: "absolute", right: "14px", top: "13px" }}
                  >
                    <KTIcon
                      iconName="document"
                      className="fs-3 text-gray-400"
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "8px",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "5px" }}
                  >
                    <KTIcon
                      iconName="shield-tick"
                      className="fs-7 text-gray-400"
                    />
                    <p
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        color: "#94a3b8",
                        fontWeight: 500,
                      }}
                    >
                      Controlled by lead revision status.
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setTempNumber((prev) => prev + 1);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#9d4141",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <KTIcon iconName="plus" className="fs-6" />
                    New Version
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isExporting && (
          <div
            style={{
              padding: "20px 36px 28px",
              display: "flex",
              gap: "12px",
              borderTop: "1px solid #f1f5f9",
              background: "#fafafa",
            }}
          >
            <button
              onClick={onHide}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: "12px",
                border: "1.5px solid #e2e8f0",
                background: "white",
                color: "#64748b",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.18s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f8fafc")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              Cancel
            </button>
            <motion.button
              whileHover={format ? { y: -2, boxShadow: "0 15px 35px rgba(157, 65, 65, 0.3)" } : {}}
              whileTap={format ? { y: 0 } : {}}
              disabled={!format || isExporting}
              onClick={() => handleStartExport(false)}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "12px",
                background: format
                  ? "linear-gradient(135deg, #9d4141 0%, #bd4b4b 100%)"
                  : "#e2e8f0",
                color: format ? "white" : "#94a3b8",
                border: "none",
                fontSize: "14px",
                fontWeight: 800,
                cursor: format ? "pointer" : "not-allowed",
                transition: "all 0.25s",
                fontFamily: "Barlow",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {format
                ? `Export as ${format === "pdf" ? "PDF" : "DOCX"}`
                : "Select a format to export"}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

/* ── Sub-components ── */

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <label
    style={{
      fontSize: "10px",
      fontWeight: 800,
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      display: "block",
    }}
  >
    {children}
  </label>
);

interface FormatCardProps {
  selected: boolean;
  onClick: () => void;
  iconName: string;
  title: string;
  description: string;
  accentColor: string;
  accentBg: string;
}

const FormatCard: React.FC<FormatCardProps> = ({
  selected,
  onClick,
  iconName,
  title,
  description,
  accentColor,
  accentBg,
}) => (
  <motion.div
    onClick={onClick}
    whileHover={{ y: -3, boxShadow: `0 16px 32px -8px ${accentColor}25` }}
    whileTap={{ y: 0 }}
    style={{
      padding: "22px 20px",
      borderRadius: "18px",
      border: `2px solid ${selected ? accentColor : "#f0f0f0"}`,
      background: selected ? accentBg : "white",
      cursor: "pointer",
      transition: "border-color 0.22s, background 0.22s",
      boxShadow: selected
        ? `0 12px 28px -8px ${accentColor}20`
        : "0 2px 8px rgba(0,0,0,0.04)",
      position: "relative",
      userSelect: "none",
    }}
  >
    {selected && (
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: accentColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )}
    <div style={{ 
      width: '42px', 
      height: '42px', 
      borderRadius: '12px',
      background: selected ? accentColor : '#f1f5f9',
      color: selected ? 'white' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
      transition: 'all 0.2s'
    }}>
      <KTIcon iconName={iconName} className="fs-2x" />
    </div>
    <div
      style={{
        fontSize: "14px",
        fontWeight: 800,
        color: selected ? accentColor : "#1e293b",
        marginBottom: "6px",
        fontFamily: "Barlow",
        transition: "color 0.2s",
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
      {description}
    </div>
  </motion.div>
);

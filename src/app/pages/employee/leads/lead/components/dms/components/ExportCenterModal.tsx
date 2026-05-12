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

  const [exportType, setExportType] = useState<ExportType>("revision");
  const [destination, setDestination] = useState<ExportDestination>("cloud");
  const [fileName, setFileName] = useState("");
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [tempNumber, setTempNumber] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  useEffect(() => {
    if (show) {
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
      const finalName = name;
      setFileName(finalName);
    }
  }, [show, exportType, leadData, currentLeadRev, tempNumber]);

  const handleStartExport = async (force: boolean = false) => {
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
      { id: "3", label: "Generating document...", status: "pending" },
      { id: "4", label: "Uploading to AWS S3...", status: "pending" },
      { id: "5", label: "Synchronizing with database...", status: "pending" },
    ];

    // Show cloud steps only if destination is Cloud or Both
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
        exportType,
        destination,
        fileName,
        revisionNumber: currentLeadRev,
        tempNumber: tempNumber,
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
        initial={{ scale: 0.9, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "32px",
          width: "680px",
          maxWidth: "100%",
          boxShadow: "0 50px 100px -20px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
          position: "relative",
        }}
      >
        <AnimatePresence>
          {showConfirmReplace && (
            <motion.div
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.98)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px",
                textAlign: "center",
              }}
            >
              <div style={{ maxWidth: "420px" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                  }}
                >
                  <KTIcon
                    iconName="information-5"
                    className="fs-3x text-danger"
                  />
                </div>
                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#1e293b",
                    marginBottom: "16px",
                    fontFamily: "Barlow",
                  }}
                >
                  Revision {String(currentLeadRev).padStart(2, "0")} Exists
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    marginBottom: "40px",
                    lineHeight: 1.6,
                    fontSize: "15px",
                  }}
                >
                  A file with this revision already exists. Do you want to
                  replace it?
                </p>
                <div style={{ display: "flex", gap: "16px" }}>
                  <button
                    onClick={() => setShowConfirmReplace(false)}
                    style={{
                      flex: 1,
                      padding: "16px",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      background: "white",
                      color: "#64748b",
                      fontWeight: 700,
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
                      padding: "16px",
                      borderRadius: "16px",
                      border: "none",
                      background: "#9d4141",
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 10px 25px rgba(157,65,65,0.25)",
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

        <div
          style={{
            padding: "32px 40px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, #ffffff 0%, #f9fafb 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(157, 65, 65, 0.08)",
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
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#1e293b",
                  fontFamily: "Barlow",
                }}
              >
                Export Center
              </h2>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                Lead-Controlled Revision Workflow
              </p>
            </div>
          </div>
          <button
            onClick={onHide}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "12px",
              width: "40px",
              height: "40px",
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
            <KTIcon iconName="cross" className="fs-2" />
          </button>
        </div>

        <div style={{ padding: "60px 40px" }}>
          {isExporting ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <h3 style={{ 
                fontSize: "22px", 
                fontWeight: 800, 
                color: "#1e293b", 
                marginBottom: "12px",
                fontFamily: "Barlow" 
              }}>
                {progress?.isComplete ? "Export Complete" : "Exporting Document..."}
              </h3>
              
              <p style={{ 
                fontSize: "14px", 
                color: "#64748b", 
                fontFamily: "Inter",
                marginBottom: "48px"
              }}>
                {progress?.isComplete 
                  ? "Your document is ready in the DMS Global Repository." 
                  : progress?.steps.find(s => s.status === 'running')?.label || "Preparing your files..."}
              </p>

              {/* Only one line bar */}
              <div style={{ 
                height: "6px", 
                width: "320px", 
                background: "#f1f5f9", 
                borderRadius: "10px", 
                margin: "0 auto",
                overflow: "hidden"
              }}>
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{
                    width: progress?.isComplete ? "100%" : "60%" 
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  style={{
                    height: "100%",
                    background: "#9d4141",
                    borderRadius: "10px",
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "32px" }}
            >
              <div>
                <Label>Document Type</Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
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
                          padding: "24px",
                          borderRadius: "20px",
                          border: `2px solid ${active ? "#9d4141" : "#f1f5f9"}`,
                          background: active
                            ? "rgba(157, 65, 65, 0.03)"
                            : "white",
                          cursor: "pointer",
                          transition: "all 0.25s",
                          boxShadow: active
                            ? "0 10px 25px -10px rgba(157, 65, 65, 0.15)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: active ? "#9d4141" : "#f1f5f9",
                            color: active ? "white" : "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "16px",
                            transition: "all 0.2s",
                          }}
                        >
                          <KTIcon iconName={cfg.iconName} className="fs-1" />
                        </div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 800,
                            color: active ? "#1e293b" : "#475569",
                            marginBottom: "4px",
                          }}
                        >
                          {cfg.label}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            lineHeight: 1.4,
                          }}
                        >
                          {cfg.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "32px",
                }}
              >
                <div>
                  <Label>Destination</Label>
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      marginTop: "12px",
                      background: "#f1f5f9",
                      padding: "4px",
                      borderRadius: "12px",
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
                            borderRadius: "8px",
                            textAlign: "center",
                            background:
                              destination === dest ? "white" : "transparent",
                            color: destination === dest ? "#1e293b" : "#64748b",
                            boxShadow:
                              destination === dest
                                ? "0 4px 6px -1px rgba(0,0,0,0.1)"
                                : "none",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "0.2s",
                            textTransform: "uppercase",
                          }}
                        >
                          {dest}
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <Label>Revision Context</Label>
                  <div
                    style={{
                      marginTop: "12px",
                      background: "#f8fafc",
                      padding: "10px 16px",
                      borderRadius: "12px",
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
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: 800,
                      }}
                    >
                      VER {tempNumber}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Generated File Name</Label>
                <div style={{ position: "relative", marginTop: "12px" }}>
                  <input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "16px 48px 16px 16px",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1e293b",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#9d4141")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#e2e8f0")
                    }
                  />
                  <div
                    style={{ position: "absolute", right: "16px", top: "16px" }}
                  >
                    <KTIcon
                      iconName="document"
                      className="fs-2 text-gray-400"
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <KTIcon
                      iconName="shield-tick"
                      className="fs-6 text-gray-400"
                    />
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#94a3b8",
                        fontWeight: 500,
                      }}
                    >
                      Controlled by Lead Revision status.
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
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <KTIcon iconName="plus" className="fs-6" />
                    New Version
                  </button>
                </div>
              </div>

              <div style={{ marginTop: "8px" }}>
                <motion.button
                  whileHover={{
                    y: -2,
                    boxShadow: "0 15px 35px rgba(157, 65, 65, 0.3)",
                  }}
                  whileTap={{ y: 0 }}
                  disabled={isExporting}
                  onClick={() => handleStartExport(false)}
                  style={{
                    width: "100%",
                    padding: "18px",
                    borderRadius: "20px",
                    background:
                      "linear-gradient(135deg, #9d4141 0%, #bd4b4b 100%)",
                    color: "white",
                    border: "none",
                    fontSize: "17px",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.3s",
                    fontFamily: "Barlow",
                  }}
                >
                  Process & Export
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label
    style={{
      fontSize: "11px",
      fontWeight: 800,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      display: "block",
    }}
  >
    {children}
  </label>
);

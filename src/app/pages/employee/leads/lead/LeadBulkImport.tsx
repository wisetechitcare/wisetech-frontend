import React, { useState, useRef, useEffect, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import {
  previewLeadImport,
  executeLeadImport,
  ImportPreviewResult,
  ImportExecuteResult,
} from "@services/LeadImportService";
import { errorConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

interface Props {
  show: boolean;
  onHide: () => void;
}

type Screen = "upload" | "loading" | "preview" | "importing" | "done";

const LOADING_STEPS = [
  "Reading CSV structure",
  "Validating rows against schema",
  "Matching companies & contacts",
  "Checking for duplicates",
];

const IMPORTING_LABELS = [
  "Creating new companies…",
  "Validating contacts…",
  "Writing leads to database…",
  "Updating commercials…",
];

const OPTIONAL_COLS = [
  "prefix",
  "companyName",
  "statusName",
  "category",
  "subcategory",
  "service",
  "assignedTo",
  "inquiryDate",
  "area",
  "rate",
  "cost",
  "contactName",
  "contactPhone",
  "poNumber",
  "poDate",
  "poStatus",
  "country",
  "city",
  "state",
  "notes",
  "description",
];

const RULES = [
  {
    icon: "🔁",
    title: "Update vs Create",
    body: "Rows with a matching Prefix/ID or Title update the existing lead. Rows with no match create a new one.",
  },
  {
    icon: "✨",
    title: "Auto-create entities",
    body: "Unknown Company, Status, Category, or Service values are created automatically during import.",
  },
  {
    icon: "📅",
    title: "Date formats",
    body: "Use DD-MM-YYYY or YYYY-MM-DD for all date columns (Inquiry Date, PO Date, etc.).",
  },
  {
    icon: "👤",
    title: "Contact matching",
    body: "Contacts are matched first by phone number, then by name + company if no phone match is found.",
  },
  {
    icon: "🧮",
    title: "Auto-cost calculation",
    body: "If Cost is empty but Area and Rate are provided, Cost is auto-calculated as Area × Rate.",
  },
  {
    icon: "⚠️",
    title: "Error handling",
    body: "Rows with validation errors are skipped. All valid rows still import successfully.",
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const LeadBulkImport: React.FC<Props> = ({ show, onHide }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [importingStep, setImportingStep] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [importResult, setImportResult] = useState<ImportExecuteResult | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animate validation checklist and percentage
  useEffect(() => {
    if (currentScreen !== "loading") {
      setLoadingPercent(0);
      return;
    }
    
    const delays = [600, 1500, 2600, 3600];
    const timers = delays.map((ms, i) =>
      setTimeout(() => setLoadingStep(i + 1), ms),
    );

    // Smooth percentage counter to 100% over ~4.2s
    let start = 0;
    const duration = 4200;
    const interval = 40;
    const increment = (100 / (duration / interval));
    
    const percentTimer = setInterval(() => {
      setLoadingPercent(prev => {
        if (prev >= 100) {
          clearInterval(percentTimer);
          return 100;
        }
        return Math.min(100, prev + increment);
      });
    }, interval);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(percentTimer);
    };
  }, [currentScreen]);

  // Cycle importing label every 1.4 s
  useEffect(() => {
    if (currentScreen !== "importing") return;
    setImportingStep(0);
    const id = setInterval(
      () => setImportingStep((p) => (p + 1) % IMPORTING_LABELS.length),
      1400,
    );
    return () => clearInterval(id);
  }, [currentScreen]);

  const resetState = useCallback(() => {
    setCurrentScreen("upload");
    setFile(null);
    setPreview(null);
    setLoadingStep(0);
    setImportingStep(0);
    setIsDragOver(false);
    setImportResult(null);
  }, []);

  const handleHide = () => {
    // If we just finished an import, notify the parent to refresh the list
    if (currentScreen === "done") {
      eventBus.emit(EVENT_KEYS.leadCreated, { id: "bulk" });
    }
    resetState();
    onHide();
  };

  const applyFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      errorConfirmation("Only CSV files are accepted.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      errorConfirmation(
        "File size exceeds 10 MB. Please upload a smaller file.",
      );
      return;
    }
    setFile(f);
    setPreview(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) applyFile(dropped);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
    e.target.value = "";
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoadingStep(0);
    setCurrentScreen("loading");
    try {
      const [result] = await Promise.all([
        previewLeadImport(file),
        new Promise<void>((resolve) => setTimeout(resolve, 4200)),
      ]);
      setPreview(result);
      setCurrentScreen("preview");
    } catch (err: unknown) {
      setCurrentScreen("upload");
      errorConfirmation(
        err instanceof Error ? err.message : "Failed to parse CSV",
      );
    }
  };

  const handleImport = async () => {
    if (!preview || preview.validRows.length === 0) return;
    setCurrentScreen("importing");
    setImportingStep(0);
    try {
      const result: any = await executeLeadImport(preview.validRows);
      // Backend returns { message, result: { count, created, updated } }
      // We want to store the inner result object
      setImportResult(result.result || result);
      setCurrentScreen("done");
      // REMOVED: eventBus.emit from here to prevent parent refresh while modal is open
    } catch (err: unknown) {
      // If error, go back to preview so they can see the table again
      setCurrentScreen("preview");
      errorConfirmation(
        err instanceof Error ? err.message : "Failed to execute import",
      );
    }
  };


  // Progress percentage for the "Leading Bar"
  const progressPercent =
    currentScreen === "upload"
      ? 0
      : currentScreen === "loading"
        ? loadingPercent
        : currentScreen === "preview"
          ? 40
          : currentScreen === "importing"
            ? 40 + (importingStep / 4) * 50
            : 100;

  // 0 = Upload, 1 = Validate & preview, 2 = Import
  const stepIndex =
    currentScreen === "upload"
      ? 0
      : currentScreen === "loading" || currentScreen === "preview"
        ? 1
        : 2;

  const newLeads =
    preview?.validRows.filter((r) =>
      r.importAction?.includes("Create new lead"),
    ).length ?? 0;
  const updates =
    preview?.validRows.filter((r) => r.importAction?.includes("Update"))
      .length ?? 0;

  // Build new-entity summary
  const entitySummary: string[] = preview
    ? preview.newEntitySummary?.length
      ? preview.newEntitySummary
      : [
          ...preview.newEntities.companies.map((c) => `New company: ${c}`),
          ...preview.newEntities.statuses.map((s) => `New status: ${s}`),
          ...preview.newEntities.categories.map((c) => `New category: ${c}`),
          ...preview.newEntities.subCategories.map(
            (s) => `New subcategory: ${s}`,
          ),
          ...preview.newEntities.services.map((s) => `New service: ${s}`),
        ]
    : [];

  return (
    <Modal show={show} onHide={handleHide} size="xl" backdrop="static" centered>
      {/* ── Leading Progress Bar ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          zIndex: 1060,
          backgroundColor: "rgba(0,0,0,0.05)",
          overflow: "hidden",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <div
          style={{
            height: "100%",
            backgroundColor: "#1B84FF",
            width: `${progressPercent}%`,
            transition: "width 0.3s linear",
            boxShadow: "0 0 10px rgba(27, 132, 255, 0.5)",
          }}
        />
      </div>

      <Modal.Header closeButton className="border-0 pb-0 pt-6">
        <Modal.Title className="fw-bold fs-4">Bulk Lead Import</Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        {/* ── Step progress indicator ── */}
        <div className="px-7 pt-5 pb-4">
          <div className="d-flex align-items-center justify-content-center">
            {(["Upload file", "Validate & preview", "Import"] as const).map(
              (label, i) => {
                const done = stepIndex > i;
                const active = stepIndex === i;
                return (
                  <React.Fragment key={label}>
                    <div
                      className="d-flex flex-column align-items-center"
                      style={{ minWidth: 120 }}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                        style={{
                          width: 32,
                          height: 32,
                          fontSize: 14,
                          backgroundColor: done
                            ? "#17C964"
                            : active
                              ? "#1B84FF"
                              : "#e9ecef",
                          color: done || active ? "#fff" : "#6c757d",
                          transition: "all 0.3s",
                        }}
                      >
                        {done ? (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M3 8l3.5 3.5L13 5"
                              stroke="#fff"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className="mt-1 text-center"
                        style={{
                          fontSize: 12,
                          fontWeight: active ? 600 : 400,
                          color: done
                            ? "#17C964"
                            : active
                              ? "#1B84FF"
                              : "#6c757d",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div
                        style={{
                          flex: 1,
                          height: 2,
                          maxWidth: 80,
                          backgroundColor: done ? "#17C964" : "#e9ecef",
                          marginBottom: 20,
                          transition: "background-color 0.4s",
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              },
            )}
          </div>
        </div>

        <div style={{ minHeight: 400 }}>
          {/* ══════════════════════════════════════════════
              SCREEN 1 — Upload
          ══════════════════════════════════════════════ */}
          {currentScreen === "upload" && (
            <div className="px-7 pb-7">
              {/* Drag-and-drop zone (BIGGER) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragOver ? "#1B84FF" : "#dee2e6"}`,
                  borderRadius: 16,
                  padding: showRules ? "50px 24px" : "100px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: isDragOver ? "#f0f7ff" : "#fafafa",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: showRules ? "none" : "inset 0 0 15px rgba(0,0,0,0.02)",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleFileInput}
                />

                {file ? (
  <div className="py-10 d-flex flex-column align-items-center text-center">

    {/* File Icon Box */}
    <div
      className="d-flex align-items-center justify-content-center mb-4"
      style={{
        width: 90,
        height: 90,
        backgroundColor: "#F1F5F9",
        borderRadius: 16,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#1B84FF",
          letterSpacing: 1,
        }}
      >
        CSV
      </span>
    </div>

    {/* File Name */}
    <div className="fs-3 fw-semibold text-dark mb-1">
      {file.name}
    </div>

    {/* File Size */}
    <div className="text-muted fs-6 mb-3">
      {formatFileSize(file.size)}
    </div>

    {/* Status */}
    <div
      className="mb-4"
      style={{
        fontSize: 13,
        color: "#16a34a",
        fontWeight: 500,
      }}
    >
      ✔ Ready to process
    </div>

    {/* Actions */}
    <div className="d-flex gap-3">
      <button
        className="btn btn-light-danger px-4"
        onClick={(e) => {
          e.stopPropagation();
          setFile(null);
        }}
      >
        Remove
      </button>

      <button
        className="btn btn-light-primary px-4"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        Replace
      </button>
    </div>
  </div>
) : (
                  <>
                    <div
                      className="rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center"
                      style={{
                        width: 80,
                        height: 80,
                        backgroundColor: "#f1faff",
                        transition: "transform 0.3s",
                      }}
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                          stroke="#1B84FF"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="17 8 12 3 7 8"
                          stroke="#1B84FF"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <line
                          x1="12"
                          y1="3"
                          x2="12"
                          y2="15"
                          stroke="#1B84FF"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div
                      className="fw-bold text-dark mb-2 fs-4"
                    >
                      Drag &amp; drop your CSV here
                    </div>
                    <div className="text-muted fs-6">
                      or{" "}
                      <span className="text-primary fw-bold">
                        click to browse
                      </span>{" "}
                      &nbsp;·&nbsp; CSV only &nbsp;·&nbsp; max 10 MB
                    </div>
                  </>
                )}
              </div>

              {/* Column pills - Unified List */}
              <div className="mt-6">
                <div
                  className="text-muted fw-bold mb-3"
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  SUPPORTED COLUMNS
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {/* Required Column first */}
                  <span
                    className="badge"
                    style={{
                      backgroundColor: "#1B84FF",
                      color: "#fff",
                      fontSize: 13,
                      padding: "8px 16px",
                      borderRadius: 8,
                    }}
                  >
                    title ✱
                  </span>
                  
                  {/* Optional Columns */}
                  {OPTIONAL_COLS.map((col) => (
                    <span
                      key={col}
                      className="badge"
                      style={{
                        backgroundColor: "#f1f3f5",
                        color: "#495057",
                        fontSize: 13,
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontWeight: 500,
                      }}
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rule Toggle */}
              <div className="mt-6">
                <button 
                  className="btn btn-sm btn-light-primary fw-bold d-flex align-items-center gap-2"
                  onClick={() => setShowRules(!showRules)}
                >
                  <KTIcon iconName={showRules ? 'minus' : 'plus'} className="fs-3" />
                  {showRules ? 'Hide Import Rules' : 'Show Import Rules'}
                </button>
              </div>

              {/* Rule cards (Dynamic) */}
              {showRules && (
                <div className="mt-4 animate__animated animate__fadeIn">
                  <div className="row g-3">
                    {RULES.map((rule) => (
                      <div key={rule.title} className="col-6">
                        <div
                          className="p-3 rounded-3 h-100"
                          style={{
                            backgroundColor: "#f8f9fa",
                            border: "1px solid #e9ecef",
                          }}
                        >
                          <div className="d-flex align-items-start gap-2">
                            <span
                              style={{
                                fontSize: 20,
                                lineHeight: "1.3",
                                flexShrink: 0,
                              }}
                            >
                              {rule.icon}
                            </span>
                            <div>
                              <div
                                className="fw-semibold text-dark mb-1"
                                style={{ fontSize: 13 }}
                              >
                                {rule.title}
                              </div>
                              <div
                                className="text-muted"
                                style={{ fontSize: 12, lineHeight: 1.6 }}
                              >
                                {rule.body}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div
                className="d-flex align-items-center justify-content-between mt-6 pt-4"
                style={{ borderTop: "1px solid #e9ecef" }}
              >
                <span className="text-muted" style={{ fontSize: 13 }}>
                  {file
                    ? `Ready to preview "${file.name}"`
                    : "Select a CSV file to continue"}
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  disabled={!file}
                  onClick={handlePreview}
                  style={{ minWidth: 160, borderRadius: 10 }}
                >
                  Preview data →
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SCREEN 2 — Loading / Validation
          ══════════════════════════════════════════════ */}
          {currentScreen === "loading" && (
            <div
              className="d-flex flex-column align-items-center justify-content-center py-10 px-7"
              style={{ minHeight: 440 }}
            >
              <div className="w-100" style={{ maxWidth: 460 }}>
                <div className="d-flex align-items-end justify-content-between mb-3">
                  <div>
                    <h3 className="fw-bold text-dark mb-1">Analyzing Data</h3>
                    <p className="text-muted fs-7 mb-0">Verifying rows and matching entities...</p>
                  </div>
                  <div className="text-primary fw-bold fs-2">{Math.round(loadingPercent)}%</div>
                </div>
                
                {/* Sleek horizontal progress */}
                <div className="progress mb-8" style={{ height: 8, borderRadius: 10, backgroundColor: '#f1f1f1' }}>
                  <div 
                    className="progress-bar progress-bar-striped progress-bar-animated" 
                    role="progressbar" 
                    style={{ width: `${loadingPercent}%`, borderRadius: 10, transition: 'width 0.1s linear' }}
                  />
                </div>

                <div className="d-flex flex-column gap-4">
                  {LOADING_STEPS.map((step, i) => {
                    const done = loadingStep > i;
                    const active = loadingStep === i;
                    return (
                      <div 
                        key={step} 
                        className="d-flex align-items-center gap-3 p-3 rounded-3"
                        style={{ 
                          backgroundColor: active ? '#f8f9fa' : 'transparent',
                          transition: 'all 0.3s'
                        }}
                      >
                        <div 
                          className={`rounded-circle d-flex align-items-center justify-content-center ${done ? 'bg-success' : active ? 'bg-primary' : 'bg-light'}`}
                          style={{ width: 24, height: 24 }}
                        >
                          {done ? (
                            <i className="fa fa-check text-white fs-9" />
                          ) : (
                            <div className={active ? 'spinner-border spinner-border-sm text-white' : ''} style={{ width: 12, height: 12 }} />
                          )}
                        </div>
                        <span className={`fs-6 ${done ? 'text-success' : active ? 'text-primary fw-bold' : 'text-muted'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SCREEN 3 — Preview Table
          ══════════════════════════════════════════════ */}
          {currentScreen === "preview" && preview && (
            <div className="px-7 pb-7">
              {/* Summary stats */}
              <div className="row g-4 mb-6">
                {[
                  {
                    label: "Valid rows",
                    value: preview.validRows.length,
                    color: "#16a34a",
                    bg: "#f0fdf4",
                    border: "#bbf7d0",
                  },
                  {
                    label: "New leads",
                    value: newLeads,
                    color: "#2563eb",
                    bg: "#eff6ff",
                    border: "#bfdbfe",
                  },
                  {
                    label: "Updates",
                    value: updates,
                    color: "#d97706",
                    bg: "#fffbeb",
                    border: "#fef3c7",
                  },
                  {
                    label: "Errors",
                    value: preview.errors.length,
                    color: "#dc2626",
                    bg: "#fef2f2",
                    border: "#fecaca",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="col-3">
                    <div
                      className="p-4 rounded-4 text-center h-100 d-flex flex-column justify-content-center"
                      style={{
                        backgroundColor: stat.bg,
                        border: `1px solid ${stat.border}`,
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div
                        className="fw-bolder mb-1"
                        style={{ fontSize: 32, color: stat.color, lineHeight: 1 }}
                      >
                        {stat.value}
                      </div>
                      <div
                        className="fw-bold"
                        style={{ fontSize: 13, color: stat.color, opacity: 0.8 }}
                      >
                        {stat.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Table */}
              <div
                className="table-responsive border rounded-4 overflow-hidden mb-6"
                style={{ maxHeight: 500 }}
              >
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr className="text-muted fw-bold fs-7 text-uppercase gs-0">
                      <th className="ps-4" style={{ width: 140 }}>Action</th>
                      <th>Title</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th className="pe-4 text-end">Area / Cost</th>
                    </tr>
                  </thead>
                  <tbody className="fs-6">
                    {preview.validRows.map((row, i) => {
                      const isUpdate = row.importAction?.includes("Update") || !row.importAction?.includes("Create new lead");
                      return (
                        <tr key={i} className="border-bottom border-gray-200">
                          <td className="ps-4">
                            <span
                              className={`badge badge-light-${isUpdate ? "warning" : "primary"} fs-8 fw-bold px-3 py-2`}
                              style={{ borderRadius: 6 }}
                            >
                              {isUpdate ? "Update (Replace)" : "Create New"}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="text-dark fw-bold mb-1">{row.title}</span>
                              <span className="text-muted fs-8">{row.prefix || "Auto-gen ID"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="text-gray-800 fw-bold">{row.companyName || "N/A"}</span>
                              {row.isNewCompany && <span className="badge badge-light-success fs-9 mt-1" style={{ width: 'fit-content' }}>NEW</span>}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="text-gray-800">{row.statusName || "N/A"}</span>
                              {row.isNewStatus && <span className="badge badge-light-success fs-9 mt-1" style={{ width: 'fit-content' }}>NEW</span>}
                            </div>
                          </td>
                          <td>
                            <span className="text-gray-700">{row.assignedTo || "Unassigned"}</span>
                          </td>
                          <td className="pe-4 text-end">
                            <div className="d-flex flex-column align-items-end">
                              <span className="text-dark fw-bold">{row.area ? `${row.area} sqft` : "-"}</span>
                              <span className="text-muted fs-8">{row.cost ? `AED ${Number(row.cost).toLocaleString()}` : "-"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Error list if any */}
              {preview.errors.length > 0 && (
                <div className="alert alert-dismissible bg-light-danger d-flex flex-column p-5 mb-6 rounded-4 mx-7">
                   <div className="d-flex align-items-center mb-3">
                    <KTIcon iconName="information-5" className="fs-2tx text-danger me-4" />
                    <div className="d-flex flex-column">
                      <h4 className="fw-bold text-dark">Detected Errors ({preview.errors.length})</h4>
                      <span>These rows will be skipped during import.</span>
                    </div>
                  </div>
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {preview.errors.map((err, i) => (
                      <div key={i} className="mb-2 fs-7">
                        <span className="text-danger fw-bold">Row {err.row}:</span> {err.errors.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Entity summary banner */}
              {entitySummary.length > 0 && (
                <div 
                  className="p-4 rounded-4 mb-6 d-flex align-items-center gap-3 mx-7"
                  style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}
                >
                  <KTIcon iconName="plus-square" className="fs-2 text-primary" />
                  <div className="fs-7 text-primary fw-bold">
                    System will auto-create: {entitySummary.join(", ")}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="d-flex align-items-center justify-content-between pt-4 px-7" style={{ borderTop: "1px solid #f1f1f1" }}>
                <button
                  type="button"
                  className="btn btn-light btn-lg"
                  onClick={() => setCurrentScreen("upload")}
                  style={{ borderRadius: 12, minWidth: 120 }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-lg px-10"
                  onClick={handleImport}
                  style={{ borderRadius: 12, fontWeight: 700 }}
                >
                  Import {preview.validRows.length} leads
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SCREEN 4 — Importing Progress
          ══════════════════════════════════════════════ */}
          {currentScreen === "importing" && (
            <div
              className="d-flex flex-column align-items-center justify-content-center py-10"
              style={{ minHeight: 440 }}
            >
              <div className="spinner-border text-primary mb-6" style={{ width: '4rem', height: '4rem', borderWidth: '5px' }} />
              <h3 className="fw-bold text-dark mb-2">{IMPORTING_LABELS[importingStep]}</h3>
              <p className="text-muted fs-6">Creating records and linking data points...</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SCREEN 5 — Done
          ══════════════════════════════════════════════ */}
          {currentScreen === "done" && importResult && (
            <div
              className="d-flex flex-column align-items-center justify-content-center py-10 px-7 text-center"
              style={{ minHeight: 440 }}
            >
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center mb-6"
                style={{ width: 100, height: 100, backgroundColor: '#f0fdf4' }}
              >
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="#16a34a"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              
              <h2 className="fw-bolder text-dark mb-1">Import Successful!</h2>
              <p className="text-muted fs-5 mb-8">
                <strong>{String(importResult?.count ?? 0)}</strong> leads have been processed and updated.
              </p>

              <div className="row g-4 w-100 mb-8" style={{ maxWidth: 500 }}>
                {[
                  {
                    label: "Created",
                    value: (importResult?.created ?? 0),
                    color: "#16a34a",
                    bg: "#f0fdf4",
                    border: "#bbf7d0",
                  },
                  {
                    label: "Updated",
                    value: (importResult?.updated ?? 0),
                    color: "#d97706",
                    bg: "#fffbeb",
                    border: "#fde68a",
                  },
                  {
                    label: "Skipped",
                    value: (preview?.errors.length ?? 0),
                    color: "#dc2626",
                    bg: "#fef2f2",
                    border: "#fecaca",
                  },
                ].map((card) => (
                  <div key={card.label} className="col-4">
                    <div
                      className="rounded-4 p-5 text-center h-100"
                      style={{
                        backgroundColor: card.bg,
                        border: `1px solid ${card.border}`,
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div
                        className="fw-bolder mb-1"
                        style={{
                          fontSize: 36,
                          color: card.color,
                          lineHeight: 1,
                        }}
                      >
                        {String(card.value)}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: card.color,
                          fontWeight: 700,
                          opacity: 0.8
                        }}
                      >
                        {card.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-light btn-lg px-10 fw-bold"
                onClick={handleHide}
                style={{ borderRadius: 12 }}
              >
                Close Summary
              </button>
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default LeadBulkImport;

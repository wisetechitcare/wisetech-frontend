import React from "react";
import { PictureAsPdf, Description, InfoOutlined } from "@mui/icons-material";
import { SummaryRow } from "../../types/formEngine.types";
import "@app/pages/employee/forms/shared/Workspace.css";

interface SummarySidebarProps {
  title: string;
  rows: SummaryRow[];
  isSubmitting?: boolean;
  isEditMode?: boolean;
  onCancel: () => void;
  exportPdf?: () => void;
  exportDocx?: () => void;
  submitDisabled?: boolean;
  submitText?: string;
  warningMessage?: string;
  /** When true, hides the submit/cancel action buttons (used inside wizard footer instead) */
  hideSubmitButton?: boolean;
}

export const SummarySidebar: React.FC<SummarySidebarProps> = ({
  title,
  rows,
  isEditMode = false,
  exportPdf,
  exportDocx,
  warningMessage,
  hideSubmitButton = false,
}) => {
  return (
    <div className="wt-summary-inner">

      {/* ── Section Title ────────────────────────────────────────────── */}
      <div className="wt-summary-title">{title}</div>

      <div className="wt-summary-divider" />

      {/* ── Summary Rows ─────────────────────────────────────────────── */}
      {rows.length > 0 ? (
        <div className="wt-summary-rows">
          {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="wt-summary-row">
              <span className="wt-summary-row-label">{row.label}</span>
              <span className={`wt-summary-row-value ${row.isStrong ? "wt-val-strong" : ""}`}>
                {row.value || <span style={{ color: "var(--wt-gray-400)", fontStyle: "italic", fontWeight: 400 }}>—</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--wt-gray-400)" }}>
          <InfoOutlined style={{ fontSize: "1.5rem", marginBottom: "0.375rem", display: "block", margin: "0 auto 0.375rem" }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 500 }}>Fill in the form to see a summary</span>
        </div>
      )}

      {/* ── Warning Message ───────────────────────────────────────────── */}
      {warningMessage && (
        <div className="wt-summary-warning">
          {warningMessage}
        </div>
      )}

      {/* ── Export Buttons — Edit mode only ──────────────────────────── */}
      {isEditMode && (exportPdf || exportDocx) && (
        <div className="wt-summary-exports">
          {exportPdf && (
            <button type="button" className="wt-export-btn wt-export-pdf" onClick={exportPdf}>
              <PictureAsPdf style={{ fontSize: "0.9rem" }} />
              PDF
            </button>
          )}
          {exportDocx && (
            <button type="button" className="wt-export-btn wt-export-docx" onClick={exportDocx}>
              <Description style={{ fontSize: "0.9rem" }} />
              DOCX
            </button>
          )}
        </div>
      )}

      {/* ── Preservation Note ─────────────────────────────────────────── */}
      {!hideSubmitButton && (
        <div className="wt-preserve-notice">
          <InfoOutlined style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "1px" }} />
          All data is saved securely and encrypted as per company policy.
        </div>
      )}
    </div>
  );
};

export default SummarySidebar;

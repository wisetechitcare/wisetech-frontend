import React from "react";
import { Button } from "react-bootstrap";
import { PictureAsPdf, Description, Save, Cancel } from "@mui/icons-material";
import "./Workspace.css";

export interface SummaryRow {
  label: string;
  value: React.ReactNode;
  isStrong?: boolean;
}

interface SummaryPanelProps {
  panelTitle: string;
  rows: SummaryRow[];
  isSubmitting: boolean;
  isEditMode: boolean;
  onCancel: () => void;
  exportPdf?: () => void;
  exportDocx?: () => void;
  submitDisabled?: boolean;
  submitText?: string;
  warningMessage?: string;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  panelTitle,
  rows,
  isSubmitting,
  isEditMode,
  onCancel,
  exportPdf,
  exportDocx,
  submitDisabled = false,
  submitText,
  warningMessage,
}) => {
  return (
    <div className="glass-summary-card">
      <h3 className="summary-heading">{panelTitle}</h3>

      {/* Snapshot fields dashboard */}
      <div className="d-flex flex-column gap-1">
        {rows.map((row, idx) => (
          <div key={idx} className="summary-field-row">
            <span className="summary-field-label">{row.label}</span>
            <span className={`summary-field-value ${row.isStrong ? "fw-bold text-dark fs-6" : ""}`}>
              {row.value || "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Warning notices if applicable */}
      {warningMessage && (
        <div
          className="p-3 rounded border border-warning-subtle text-warning-emphasis bg-warning-subtle fs-7 fw-semibold"
          style={{ lineHeight: "1.4" }}
        >
          ⚠️ {warningMessage}
        </div>
      )}

      {/* Unified Action Controls */}
      <div className="action-bar mt-auto">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || submitDisabled}
          className="d-flex align-items-center justify-content-center gap-2 py-3 fw-bold"
          style={{ width: "100%", borderRadius: "8px" }}
        >
          <Save style={{ fontSize: "1.2rem" }} />
          {isSubmitting
            ? "Saving..."
            : submitText || (isEditMode ? "Save Changes" : "Create Record")}
        </Button>

        <Button
          type="button"
          variant="light"
          onClick={onCancel}
          disabled={isSubmitting}
          className="d-flex align-items-center justify-content-center gap-2 py-2 text-gray-700 border"
          style={{ width: "100%", borderRadius: "8px" }}
        >
          <Cancel style={{ fontSize: "1.2rem" }} />
          Close / Cancel
        </Button>

        {/* Dynamic export documents bar */}
        {(exportPdf || exportDocx) && isEditMode && (
          <div className="d-flex gap-2 mt-2 pt-3 border-top">
            {exportPdf && (
              <Button
                type="button"
                variant="outline-danger"
                size="sm"
                onClick={exportPdf}
                className="d-flex align-items-center justify-content-center gap-1 flex-fill py-2"
                style={{ borderRadius: "6px" }}
              >
                <PictureAsPdf style={{ fontSize: "1.1rem" }} />
                PDF
              </Button>
            )}
            {exportDocx && (
              <Button
                type="button"
                variant="outline-primary"
                size="sm"
                onClick={exportDocx}
                className="d-flex align-items-center justify-content-center gap-1 flex-fill py-2"
                style={{ borderRadius: "6px" }}
              >
                <Description style={{ fontSize: "1.1rem" }} />
                DOCX
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

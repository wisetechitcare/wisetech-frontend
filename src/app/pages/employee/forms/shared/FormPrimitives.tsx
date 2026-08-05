import React from "react";
import { Grid } from "@mui/material";
import { Add, DeleteOutline, PhotoCameraOutlined } from "@mui/icons-material";

import { C, T } from "@app/modules/configuration/ConfigDesignSystem";

import "./Workspace.css";

/* ═══════════════════════════════════════════════════════════════════════════
 * Shared step-section primitives for the Enterprise wizard modules.
 *
 * Every module's sections (Contact, Company, …) compose from these, so a section
 * never hand-rolls a card shell, an inline-create link, a toggle row or a recap
 * grid. The CSS lives in Workspace.css alongside the wizard chrome.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Unified section wrapper — one card per kind of information. */
export const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "info" | "danger";
  action?: React.ReactNode;
}> = ({ title, icon, children, tone = "default", action }) => (
  <div
    className={`wt-section-card${
      tone === "info" ? " wt-section-info" : tone === "danger" ? " wt-section-danger" : ""
    }`}
  >
    <div className="wt-section-heading">
      <span className="wt-section-heading-icon d-flex align-items-center">{icon}</span>
      <span style={{ flex: 1 }}>{title}</span>
      {action}
    </div>
    {children}
  </div>
);

/** Inline "+ New X" affordance rendered under a dropdown. */
export const InlineAdd: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}> = ({ label, onClick, disabled, title }) => (
  <button type="button" className="wt-inline-add" onClick={onClick} disabled={disabled} title={title}>
    <Add sx={{ fontSize: 14 }} /> {label}
  </button>
);

/**
 * Labelled divider inside a card — splits "similar items" into named sub-groups
 * without spawning another card. Renders as Grid items, so use inside a
 * `<Grid container>`.
 */
export const SubGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <>
    <Grid item xs={12}>
      <div className="wt-subgroup-heading">{label}</div>
    </Grid>
    {children}
  </>
);

/** Non-blocking notice strip (duplicate warning, missing-data hint, …). */
export const Notice: React.FC<{
  tone: "warning" | "info" | "success";
  icon: string;
  children: React.ReactNode;
}> = ({ tone, icon, children }) => (
  <div className={`wt-notice is-${tone}`}>
    <i className={`bi ${icon}`} style={{ marginTop: 1 }} />
    <span>{children}</span>
  </div>
);

/** Label + description on the left, switch on the right. */
export const ToggleRow: React.FC<{
  id: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, title, subtitle, checked, onChange }) => (
  <div className={`wt-toggle-row${checked ? " is-on" : ""}`}>
    <label htmlFor={id} style={{ cursor: "pointer", marginBottom: 0 }}>
      <span className="wt-toggle-row-title">{title}</span>
      {subtitle && <span className="wt-toggle-row-sub">{subtitle}</span>}
    </label>
    <div className="form-check form-switch m-0">
      <input
        className="form-check-input"
        type="checkbox"
        role="switch"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  </div>
);

/* ── Read-only recap ─────────────────────────────────────────────────────── */

export const RecapItem: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  const empty =
    value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length);
  return (
    <div className="wt-recap-item">
      <span className="wt-recap-label">{label}</span>
      <span className={`wt-recap-value${empty ? " is-empty" : ""}`}>{empty ? "Not set" : value}</span>
    </div>
  );
};

export const RecapGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="wt-recap-grid">{children}</div>
);

export const Chips: React.FC<{ items: string[] }> = ({ items }) => (
  <>
    {items.map((t) => (
      <span className="wt-chip" key={t}>
        {t}
      </span>
    ))}
  </>
);

/* ── Visibility ──────────────────────────────────────────────────────────── */

/**
 * Values are the backend `VisibilityType` enum codes verbatim, so the form stores
 * exactly what the API round-trips — an edit re-selects the saved option and a
 * save never has to guess a label→enum transformation.
 */
export const VISIBILITY_OPTIONS = [
  { value: "ONLY_ME", label: "Only Me", icon: "bi-lock-fill", hint: "Visible to you alone" },
  { value: "EVERYONE", label: "Everyone", icon: "bi-people-fill", hint: "Any logged-in employee" },
  { value: "SUPER_ADMIN", label: "Super Admins", icon: "bi-shield-lock-fill", hint: "Super admins only" },
  { value: "ADMIN", label: "Admins", icon: "bi-shield-fill-check", hint: "Admins and above" },
  { value: "TEMPORARY", label: "Temporary", icon: "bi-hourglass-split", hint: "Short-lived record" },
];

export const visibilityLabel = (code?: string) =>
  VISIBILITY_OPTIONS.find((o) => o.value === code)?.label || "—";

/** Accepts an enum code, a legacy label ("Only Me"/"Super Admins") or nothing. */
export const normalizeVisibility = (raw?: string, fallback = "ONLY_ME"): string => {
  if (!raw) return fallback;
  const code = String(raw).trim().toUpperCase().replace(/\s+/g, "_");
  if (VISIBILITY_OPTIONS.some((o) => o.value === code)) return code;
  const byLabel = VISIBILITY_OPTIONS.find(
    (o) => o.label.toUpperCase().replace(/\s+/g, "_") === code || `${o.value}S` === code,
  );
  return byLabel?.value || fallback;
};

export const VisibilityPicker: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => (
  <Grid container spacing={2}>
    {VISIBILITY_OPTIONS.map((opt) => {
      const selected = value === opt.value;
      return (
        <Grid item xs={12} sm={6} md={4} key={opt.value}>
          <button
            type="button"
            className={`wt-choice-card${selected ? " is-selected" : ""}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
          >
            <span className="wt-choice-card-icon">
              <i className={`bi ${opt.icon}`} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="wt-choice-card-title">{opt.label}</span>
              <span className="wt-choice-card-sub">{opt.hint}</span>
            </span>
          </button>
        </Grid>
      );
    })}
  </Grid>
);

/* ── Image uploader (profile photo / company logo) ───────────────────────── */

export const ImageUploader: React.FC<{
  /** Unique DOM id — two uploaders may coexist on one page. */
  inputId: string;
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  /** `cover` for a person's photo, `contain` so a logo is never cropped. */
  fit?: "cover" | "contain";
  /** Shown in the frame when there is no image (initials, icon, …). */
  fallback?: React.ReactNode;
  emptyLabel: string;
  filledLabel: string;
  description: React.ReactNode;
  error?: string;
}> = ({
  inputId,
  previewUrl,
  onSelect,
  onRemove,
  fit = "cover",
  fallback,
  emptyLabel,
  filledLabel,
  description,
  error,
}) => (
  <div className="wt-avatar-uploader">
    <label
      htmlFor={inputId}
      className={`wt-avatar-frame${previewUrl ? " has-image" : ""}`}
      title={previewUrl ? "Replace image" : "Upload image"}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="" style={{ objectFit: fit, padding: fit === "contain" ? 10 : 0 }} />
      ) : (
        fallback ?? <PhotoCameraOutlined style={{ fontSize: 28, color: C.textMuted }} />
      )}
      <span className="wt-avatar-frame-overlay">
        <PhotoCameraOutlined sx={{ fontSize: 15 }} />
        {previewUrl ? "Replace" : "Upload"}
      </span>
    </label>

    <div style={{ minWidth: 0 }}>
      <div style={{ ...T.label, fontSize: "0.85rem" }}>{previewUrl ? filledLabel : emptyLabel}</div>
      <div style={{ ...T.caption, marginTop: 2, maxWidth: 380 }}>{description}</div>
      <div className="d-flex align-items-center gap-3 mt-2">
        <label htmlFor={inputId} className="wt-inline-add" style={{ marginTop: 0 }}>
          <PhotoCameraOutlined sx={{ fontSize: 14 }} /> {previewUrl ? "Replace" : "Upload"}
        </label>
        {previewUrl && (
          <button
            type="button"
            className="wt-inline-add"
            style={{ marginTop: 0, color: C.danger }}
            onClick={onRemove}
          >
            <DeleteOutline sx={{ fontSize: 14 }} /> Remove
          </button>
        )}
      </div>
      {error && <span className="wt-field-hint is-error">{error}</span>}
    </div>

    <input
      type="file"
      id={inputId}
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onSelect(file);
        e.target.value = "";
      }}
    />
  </div>
);

/** Shared guard for image pickers: type + size. Returns an error string, or "". */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const validateImageFile = (file: File): string => {
  if (!file.type.startsWith("image/")) return "Please choose an image file (JPG, PNG or WEBP).";
  if (file.size > MAX_IMAGE_BYTES) return "Image is larger than 5 MB. Please choose a smaller file.";
  return "";
};

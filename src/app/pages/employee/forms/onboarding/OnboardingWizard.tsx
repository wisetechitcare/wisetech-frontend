import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { toast } from "react-toastify";
import { ChevronRight, ChevronLeft, ExpandMore } from "@mui/icons-material";
import dayjs from "dayjs";

import type { OnboardingSectionsProps } from "./OnboardingSections";

// The shared wizard chrome (navy header, layout, progress card, canvas, footer,
// section cards) all comes from here — this component only adds the ONE thing
// the flat EnterpriseFormWizard can't express: a two-level tree in the sidebar.
import "@app/pages/employee/forms/shared/Workspace.css";
import "./OnboardingModal.css";

/** A leaf = one editable section, the unit the canvas renders and Continue walks. */
export interface OnboardingLeaf {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  /** Top-level Formik keys this leaf owns — drives completion + error state. */
  fields: string[];
  /** Subset of `fields` that must have a value for the leaf to count complete. */
  requiredFields?: string[];
  render: (props: OnboardingSectionsProps) => React.ReactNode;
}

/** A group = a parent node in the sidebar tree. Groups are never a page. */
export interface OnboardingGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: OnboardingLeaf[];
}

export interface OnboardingWizardProps {
  groups: OnboardingGroup[];
  sectionProps: OnboardingSectionsProps;
  headerTitle: string;
  headerSub?: React.ReactNode;
  isSubmitting: boolean;
  isEditMode: boolean;
  onCancel: () => void;
  onFinalSave: () => void;
  submitText: string;
  summaryTitle?: string;
  summaryRows?: (values: any) => Array<{
    label: string;
    value: React.ReactNode;
    isStrong?: boolean;
  }>;
}

/** Does a Formik value count as "filled"? Mirrors WizardSidebar's `hasValue`. */
const hasValue = (v: any): boolean => {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    // An array of objects counts only when at least one row has real content —
    // the wizard seeds blank rows, which must not read as completed.
    return v.some((row) =>
      row && typeof row === "object"
        ? Object.values(row).some((cell) => hasValue(cell))
        : hasValue(row)
    );
  }
  if (typeof v === "object") return Object.values(v).some((cell) => hasValue(cell));
  return true;
};

const ParentProgressBadge = ({ completed, total, active, complete, error, index }: any) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const radius = 11;
  const stroke = 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let strokeColor = "#cbd5e1";
  if (complete) strokeColor = "var(--wt-success, #10b981)";
  else if (error) strokeColor = "var(--wt-error, #ef4444)";
  else if (active) strokeColor = "var(--wt-primary, #1e3a8a)";
  else if (percentage > 0) strokeColor = "var(--wt-success, #10b981)";

  return (
    <div className="ob-tree-parent-badge-container">
      <svg width="28" height="28" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        {percentage > 0 && (
          <circle
            cx="14"
            cy="14"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        )}
      </svg>
      <span className="ob-tree-parent-badge-inner">
        {complete ? <i className="bi bi-check-lg" /> : index}
      </span>
    </div>
  );
};

type LeafStatus = "completed" | "active" | "error" | "pending";

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  groups,
  sectionProps,
  headerTitle,
  headerSub,
  isSubmitting,
  isEditMode,
  onCancel,
  onFinalSave,
  submitText,
  summaryTitle = "Summary",
  summaryRows,
}) => {
  const { values, errors, touched, validateForm, setFieldTouched } = useFormikContext<any>();

  // Flattened leaf order — the linear path Back/Continue walk, independent of
  // which groups happen to be expanded.
  const leaves = useMemo(() => groups.flatMap((g) => g.children), [groups]);

  const [activeLeafId, setActiveLeafId] = useState(leaves[0]?.id ?? "");
  const activeIndex = Math.max(
    0,
    leaves.findIndex((l) => l.id === activeLeafId)
  );
  const activeLeaf = leaves[activeIndex];
  const activeGroup = groups.find((g) => g.children.some((c) => c.id === activeLeaf?.id));

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === leaves.length - 1;

  // Groups start collapsed except the one holding the active leaf, so the rail
  // stays scannable instead of showing all 19 sections at once.
  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>({});
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const isGroupExpanded = (groupId: string) =>
    manualExpanded[groupId] ?? groupId === activeGroup?.id;

  // Crossing into a different group re-asserts the accordion: the group owning the
  // active section opens, every other one closes. `manualExpanded` is an override
  // that never expired, so a group the user had toggled by hand stayed pinned open
  // even after Continue moved on to the next one — leaving two groups expanded.
  // Clearing it on a group change hands control back to the activeGroup default,
  // while manual toggles still work freely WITHIN the current group.
  useEffect(() => {
    setManualExpanded({});
  }, [activeGroup?.id]);

  const scrollCanvasTop = useCallback(() => {
    document.querySelector(".wizard-step-canvas")?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const leafStatus = useCallback(
    (leaf: OnboardingLeaf, index: number): LeafStatus => {
      const hasError = leaf.fields.some(
        (f) => (errors as any)?.[f] && (touched as any)?.[f]
      );
      if (hasError) return "error";
      if (leaf.id === activeLeafId) return "active";

      const required = leaf.requiredFields ?? [];
      if (required.length > 0) {
        return required.every((f) => hasValue(values?.[f])) ? "completed" : "pending";
      }
      // No hard requirement: complete once the user has engaged with it, or has
      // simply moved past it — otherwise optional sections sit "pending" forever.
      if (leaf.fields.length === 0) return "completed";
      if (leaf.fields.some((f) => hasValue(values?.[f]))) return "completed";
      return index < activeIndex ? "completed" : "pending";
    },
    [errors, touched, values, activeLeafId, activeIndex]
  );

  const statuses = useMemo(
    () => leaves.map((leaf, i) => leafStatus(leaf, i)),
    [leaves, leafStatus]
  );

  const completedCount = statuses.filter((s) => s === "completed").length;
  const progressPct = leaves.length ? Math.round((completedCount / leaves.length) * 100) : 0;

  const goToLeaf = useCallback(
    (id: string) => {
      if (id === activeLeafId) return;
      setActiveLeafId(id);
      scrollCanvasTop();
    },
    [activeLeafId, scrollCanvasTop]
  );

  const handleDirectSave = async () => {
    const formErrors = await validateForm();
    if (Object.keys(formErrors).length > 0) {
      toast.error("Please fill in all required fields before submitting.");
      Object.keys(formErrors).forEach((k) => setFieldTouched(k, true));
      return;
    }
    onFinalSave();
  };

  const handleSidebarClick = useCallback(
    (id: string, targetIdx: number) => {
      if (targetIdx <= activeIndex) {
        goToLeaf(id);
        return;
      }
      // Check if there are any incomplete required sections before targetIdx
      const precedingIncomplete = leaves
        .slice(0, targetIdx)
        .some((_, i) => statuses[i] !== "completed" && statuses[i] !== "active");

      if (!precedingIncomplete) {
        goToLeaf(id);
      } else {
        toast.warning("Please complete the required fields in the preceding sections before proceeding.");
      }
    },
    [activeIndex, statuses, goToLeaf, leaves]
  );

  const handleBack = () => {
    if (isFirst) return;
    goToLeaf(leaves[activeIndex - 1].id);
  };

  const handleNext = async () => {
    const formErrors = await validateForm();
    const ownFields = activeLeaf?.fields ?? [];

    // Block only on errors belonging to the section on screen. Errors further
    // along the form are none of this section's business.
    const blocked = ownFields.some((field) =>
      Object.keys(formErrors).some(
        (k) => k === field || k.startsWith(`${field}[`) || k.startsWith(`${field}.`)
      )
    );

    if (blocked) {
      ownFields.forEach((f) => setFieldTouched(f, true));
      toast.error("Please complete the required fields in this section before continuing.");
      return;
    }

    if (isLast) {
      if (Object.keys(formErrors).length > 0) {
        toast.error("Please fill in all required fields before submitting.");
        Object.keys(formErrors).forEach((k) => setFieldTouched(k, true));
        return;
      }
      onFinalSave();
      return;
    }

    goToLeaf(leaves[activeIndex + 1].id);
  };

  const rows = summaryRows ? summaryRows(values) : [];

  return (
    <div className="enterprise-wizard ob-wizard-root" data-form-module="onboarding">
      {/* ═══ STICKY HEADER ═══════════════════════════════════════════════ */}
      <div className="wizard-header">
        <div className="wizard-header-left">
          <div className="wizard-title-row">
            <div className={`wizard-header-avatar${values.avatar ? " wizard-header-avatar--photo" : ""}`}>
              {values.avatar ? (
                <img src={values.avatar} alt="Profile" className="ob-header-avatar-img" />
              ) : (
                <i className="bi bi-person-badge" />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="wizard-title">
                {values.firstName || values.lastName
                  ? `${values.firstName || ""} ${values.lastName || ""}`.trim()
                  : headerTitle}
              </h1>
              {values.firstName && values.lastName ? (
                <div className="wizard-subtitle">
                  {values.dateOfBirth && (
                    <span className="ob-header-chip">
                      <i className="bi bi-calendar" /> {dayjs(values.dateOfBirth).isValid() ? dayjs(values.dateOfBirth).format("DD MMM YYYY") : values.dateOfBirth}
                    </span>
                  )}
                  {values.gender && (
                    <span className="ob-header-chip">
                      <i className={`bi bi-${values.gender === "0" ? "person" : "person-fill"}`} />{" "}
                      {values.gender === "0" ? "Male" : values.gender === "1" ? "Female" : values.gender === "2" ? "Others" : values.gender}
                    </span>
                  )}
                </div>
              ) : (
                headerSub && <div className="wizard-subtitle">{headerSub}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ THREE-COLUMN LAYOUT ═════════════════════════════════════════ */}
      <div className="wizard-layout">
        {/* ── LEFT: the single tree timeline ───────────────────────────── */}
        <aside className="wizard-nav-sidebar" aria-label="Onboarding sections">
          <div className="wt-progress-card">
            <div className="wt-progress-label">Onboarding</div>
            <div className="wt-progress-percent">{progressPct}%</div>
            <div className="wt-progress-sub">
              {completedCount} of {leaves.length} sections completed
            </div>
            <div className="wt-progress-track">
              <div className="wt-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <nav className="ob-tree" aria-label="Sections">
            {groups.map((group, groupIdx) => {
              const childStatuses = group.children.map((c) =>
                statuses[leaves.findIndex((l) => l.id === c.id)]
              );
              const groupComplete = childStatuses.every((s) => s === "completed");
              const groupHasError = childStatuses.some((s) => s === "error");
              const isActiveGroup = group.id === activeGroup?.id;
              const expanded = isGroupExpanded(group.id);

              return (
                <div className="ob-tree-group" key={group.id}>
                  <button
                    type="button"
                    className={`ob-tree-parent${isActiveGroup ? " is-active" : ""}${
                      groupComplete ? " is-complete" : ""
                    }${groupHasError ? " is-error" : ""}`}
                    aria-expanded={expanded}
                    onClick={() =>
                      setManualExpanded((prev) => ({ ...prev, [group.id]: !expanded }))
                    }
                  >
                    <ParentProgressBadge
                      completed={childStatuses.filter((s) => s === "completed").length}
                      total={group.children.length}
                      active={isActiveGroup}
                      complete={groupComplete}
                      error={groupHasError}
                      index={groupIdx + 1}
                    />
                    <span className="ob-tree-parent-label">{group.label}</span>
                    <span className="ob-tree-parent-count">
                      {childStatuses.filter((s) => s === "completed").length}/
                      {group.children.length}
                    </span>
                    <ExpandMore
                      className={`ob-tree-chevron${expanded ? " is-open" : ""}`}
                      fontSize="small"
                    />
                  </button>

                  {expanded && (
                    <div className="ob-tree-children" role="group">
                      {group.children.map((leaf) => {
                        const status = statuses[leaves.findIndex((l) => l.id === leaf.id)];
                        return (
                          <button
                            type="button"
                            key={leaf.id}
                            className={`ob-tree-child is-${status}`}
                            onClick={() => handleSidebarClick(leaf.id, leaves.findIndex((l) => l.id === leaf.id))}
                            aria-current={status === "active" ? "step" : undefined}
                          >
                            <span className="ob-tree-child-dot" aria-hidden>
                              {status === "completed" ? (
                                <i className="bi bi-check-lg" />
                              ) : status === "error" ? (
                                <i className="bi bi-exclamation" />
                              ) : null}
                            </span>
                            <span className="ob-tree-child-label">
                              {leaf.label}
                              {leaf.requiredFields && leaf.requiredFields.length > 0 && status !== "completed" && (
                                <span style={{ color: "#ef4444", marginLeft: "4px", fontWeight: "bold" }} title="Required section">*</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── CENTER: canvas ───────────────────────────────────────────── */}
        <main className="wizard-step-canvas" role="main">
          <div className="wt-step-page-header">
            <div className="wt-step-page-meta">
              <span className="wt-step-badge-pill">
                {activeGroup?.label} · {activeIndex + 1} of {leaves.length}
              </span>
              <span className="wt-mandatory-note">
                <span>*</span> Required fields
              </span>
            </div>
            <h2 className="wt-step-page-title">{activeLeaf?.title}</h2>
            {activeLeaf?.subtitle && (
              <p className="wt-step-page-subtitle">{activeLeaf.subtitle}</p>
            )}
          </div>

          <div className="wt-step-body">
            <div className="wt-step-animate" key={activeLeafId}>
              <div className="wt-section-card">
                <div className="wt-section-heading">
                  <span className="wt-section-heading-icon">{activeLeaf?.icon}</span>
                  {activeLeaf?.title}
                </div>
                {activeLeaf?.render(sectionProps)}
              </div>
            </div>
          </div>
        </main>

        {/* ── RIGHT: summary ───────────────────────────────────────────── */}
        {rows.length > 0 && (
          <aside className={`wizard-summary-panel${summaryCollapsed ? " is-collapsed" : ""}`}>
            <div className="wt-summary-inner">
              <div className="wt-summary-header-row">
                <div className="wt-summary-title">{summaryTitle}</div>
                <button
                  type="button"
                  className="wt-summary-toggle-btn"
                  onClick={() => setSummaryCollapsed(true)}
                  title="Collapse summary"
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
              <div className="wt-summary-divider" />
              <div className="wt-summary-rows">
                {rows.map((row, i) => (
                  <div className="wt-summary-row" key={`${row.label}-${i}`}>
                    <span className="wt-summary-row-label">{row.label}</span>
                    <span
                      className={`wt-summary-row-value${row.isStrong ? " wt-val-strong" : ""}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {summaryCollapsed && rows.length > 0 && (
          <button
            type="button"
            className="wt-summary-expand-floating"
            onClick={() => setSummaryCollapsed(false)}
            title="Expand summary"
          >
            <i className="bi bi-chevron-left" />
          </button>
        )}
      </div>

      {/* ═══ STICKY FOOTER ═══════════════════════════════════════════════ */}
      <div className="wizard-footer-bar">
        <div className="wizard-footer-left" style={{ display: "flex", gap: "0.625rem" }}>
          <button type="button" className="wt-btn wt-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="wt-btn wt-btn-primary"
            style={{ minWidth: "120px" }}
            onClick={handleDirectSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                Saving
                <span className="spinner-border spinner-border-sm align-middle ms-1" />
              </>
            ) : (
              <>{isEditMode ? "Save Changes" : "Save Employee"}</>
            )}
          </button>
        </div>

        <div className="wizard-footer-right">
          <button
            type="button"
            className="wt-btn wt-btn-ghost"
            onClick={handleBack}
            disabled={isFirst || isSubmitting}
          >
            <ChevronLeft fontSize="small" />
            Back
          </button>

          <button
            type="button"
            className="wt-btn wt-btn-primary wt-btn-lg"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                Saving
                <span className="spinner-border spinner-border-sm align-middle ms-1" />
              </>
            ) : isLast ? (
              <>
                {submitText}
                <i className="bi bi-check-lg" />
              </>
            ) : (
              <>
                Save &amp; Continue
                <ChevronRight fontSize="small" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;

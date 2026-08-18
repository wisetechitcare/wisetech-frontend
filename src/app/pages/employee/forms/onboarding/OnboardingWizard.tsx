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
  /**
   * Requirement that a list of field names cannot express — e.g. "all three approval
   * chains have a Level 1 approver", where one populated key is not the same as the
   * section being complete. When present it REPLACES `requiredFields` for both the
   * completion state and the block on moving forward, so a section whose requirement
   * is structural stops behaving like an optional one.
   */
  isComplete?: (values: any) => boolean;
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
  /**
   * The pristine, blank form. Used to tell a value the ADMIN entered from a default
   * the form shipped with — without it, switch defaults make untouched sections
   * report themselves complete.
   */
  defaultValues?: any;
  summaryTitle?: string;
  summaryRows?: (values: any) => Array<{
    label: string;
    value: React.ReactNode;
    isStrong?: boolean;
  }>;
}

/**
 * Identity and foreign-key fields the wizard fills in itself. A seeded-but-empty
 * education row still carries a `rowId`, and every document row is created with the
 * `documentId` of the type it stands for — so scanning every cell reported those rows
 * as "real content", and Education Details and Upload Documents went green before the
 * user had typed a character or attached a file. A machine key is never evidence that
 * a human filled something in.
 */
const IDENTITY_KEYS = new Set([
  "rowId", "id", "_id", "key", "uuid", "documentId", "employeeId",
]);

/** Does a Formik value count as "filled"? Mirrors WizardSidebar's `hasValue`. */
const hasValue = (v: any): boolean => {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    // An array of objects counts only when at least one row has real content —
    // the wizard seeds blank rows, which must not read as completed.
    return v.some((row) => hasValue(row));
  }
  if (typeof v === "object") {
    return Object.entries(v).some(([key, cell]) => !IDENTITY_KEYS.has(key) && hasValue(cell));
  }
  return true;
};

/**
 * Take the user to the thing that is blocking them.
 *
 * Telling someone "complete the required fields in this section" and leaving them to
 * find it is the difference between a form that guides and one that scolds — on a
 * long section the offending field is often off-screen entirely. This resolves the
 * first error to a real DOM node, scrolls it into view and focuses it.
 *
 * `fieldPath` is a Formik path, which may be nested (`addressInfo.presentCity`) or
 * indexed (`familyInfo.0.name`), so several selectors are tried before giving up.
 * The last resort is the section's own inline error text — that is what catches a
 * structural requirement like Approval Settings, which has no single input to blame.
 */
const focusFieldOrError = (fieldPath: string | null) => {
  const candidates: string[] = [];
  if (fieldPath) {
    candidates.push(`[name="${fieldPath}"]`);
    // Formik's dotted path vs the bracketed name an array field may render with.
    candidates.push(`[name="${fieldPath.replace(/\.(\d+)\./g, "[$1].")}"]`);
    candidates.push(`#${CSS.escape(fieldPath)}`);
    candidates.push(`[name^="${fieldPath}"]`);
  }
  // Any inline error currently on screen, in document order.
  candidates.push("[data-required-error]", ".text-danger", "[aria-invalid='true']");

  for (const selector of candidates) {
    let element: HTMLElement | null = null;
    try {
      element = document.querySelector(selector) as HTMLElement | null;
    } catch {
      continue; // A malformed selector must not stop the remaining attempts.
    }
    if (!element) continue;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    // Only inputs take focus; scrolling an error message into view is enough.
    if (typeof (element as HTMLInputElement).focus === "function" && element.tagName !== "DIV") {
      element.focus({ preventScroll: true });
    }
    return;
  }
};

/** First error path inside a Formik error tree, as a dotted path. */
const firstErrorPath = (errors: any, prefix = ""): string | null => {
  if (!errors) return null;
  if (typeof errors === "string") return prefix || null;
  if (Array.isArray(errors)) {
    for (let i = 0; i < errors.length; i += 1) {
      if (errors[i]) return firstErrorPath(errors[i], `${prefix}.${i}`);
    }
    return null;
  }
  if (typeof errors === "object") {
    const keys = Object.keys(errors);
    if (!keys.length) return null;
    return firstErrorPath(errors[keys[0]], prefix ? `${prefix}.${keys[0]}` : keys[0]);
  }
  return prefix || null;
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
  defaultValues,
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

  /**
   * Mobile only: is the section tree open?
   *
   * On a phone the tree cannot be permanently on screen — laid out flat it either
   * ate half the viewport or, squeezed into a scrolling strip, showed whichever
   * group happened to be leftmost rather than the one you are in. So it collapses
   * behind a summary bar that always states the CURRENT position, and opens as a
   * sheet when tapped. Desktop never reads this: the tree is always visible there.
   */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Any move closes the sheet — leaving it open over the section you just chose
  // would hide the thing you navigated to.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeLeafId]);
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

  /**
   * Is this section's data actually there? Pure data question — no notion of where
   * the user is standing, which is what the progress figure needs. `leafStatus`
   * below layers the visual states (active / error) on top of this.
   */
  const isLeafFilled = useCallback(
    (leaf: OnboardingLeaf): boolean => {
      if (leaf.isComplete) return leaf.isComplete(values);
      const required = leaf.requiredFields ?? [];
      if (required.length > 0) return required.every((f) => hasValue(values?.[f]));
      if (leaf.fields.length === 0) return true;

      // "Has a value" is not the same as "someone entered something". A brand-new
      // form already carries `professionalFeesEnabled: "false"`, `tds2Type: "FIXED"`
      // and similar switch defaults, so Financial Config reported itself complete
      // before the admin had seen it — an empty form opened at 16%. A field counts
      // only once it DIFFERS from the pristine form.
      //
      // Compared against the blank-form defaults rather than Formik's
      // `initialValues`, which in edit mode is the loaded employee — that would make
      // every existing employee read as 0% complete.
      return leaf.fields.some((f) => {
        const current = values?.[f];
        if (!hasValue(current)) return false;
        if (!defaultValues || !(f in defaultValues)) return true;
        return JSON.stringify(current) !== JSON.stringify(defaultValues[f]);
      });
    },
    [values, defaultValues]
  );

  const leafStatus = useCallback(
    (leaf: OnboardingLeaf): LeafStatus => {
      const hasError = leaf.fields.some(
        (f) => (errors as any)?.[f] && (touched as any)?.[f]
      );
      if (hasError) return "error";
      if (leaf.id === activeLeafId) return "active";

      // Green means "there is data here", nothing else. It used to also count
      // `index < activeIndex` — a section went green just for being scrolled past,
      // so clicking Continue through an empty form drove the progress bar up with
      // nothing filled in.
      return isLeafFilled(leaf) ? "completed" : "pending";
    },
    [errors, touched, activeLeafId, isLeafFilled]
  );

  const statuses = useMemo(() => leaves.map((leaf) => leafStatus(leaf)), [leaves, leafStatus]);

  /**
   * Does this leaf actually STOP forward navigation?
   *
   * Only a section that declares `requiredFields` and is still missing one can.
   * This is deliberately NOT `status !== "completed"`: `leafStatus` reports a
   * purely optional section (Education, Work Experience, Leave Settings …) as
   * "pending" until the user either fills something in or walks past it, and
   * gating on that made every untouched optional section behave like a required
   * one — the whole form was filled, every genuine requirement met, and clicking
   * a later section in the rail still refused with "complete the required fields
   * in the preceding sections". Nothing is required there, so nothing should block.
   */
  const isBlocking = useCallback(
    (leaf: OnboardingLeaf) => {
      if (leaf.isComplete) return !leaf.isComplete(values);
      const required = leaf.requiredFields ?? [];
      return required.length > 0 && !required.every((f) => hasValue(values?.[f]));
    },
    [values]
  );

  // Counted from the data, not from `statuses` — a section you are standing IN
  // reports "active", so counting statuses left the last section you filled out of
  // the total until you navigated away from it.
  const completedCount = leaves.filter((leaf) => isLeafFilled(leaf)).length;
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
      // Backwards is always free — you can revisit anything you have passed.
      if (targetIdx <= activeIndex) {
        goToLeaf(id);
        return;
      }

      // Forwards: only a genuinely unmet REQUIREMENT earlier in the form stops
      // the jump. The section on screen is exempt — Continue already guards it,
      // and blocking here would strand the user on a section they are editing.
      const blockerIdx = leaves
        .slice(0, targetIdx)
        .findIndex((leaf, i) => i !== activeIndex && isBlocking(leaf));

      if (blockerIdx === -1) {
        goToLeaf(id);
        return;
      }

      // Name the offending section and land on it. A bare "complete the
      // preceding sections" left the user hunting through 19 entries for the
      // one that was actually incomplete.
      const blocker = leaves[blockerIdx];
      toast.warning(`Complete the required fields in "${blocker.label}" first.`);
      goToLeaf(blocker.id);
    },
    [activeIndex, goToLeaf, leaves, isBlocking]
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

    // A structural requirement has no Yup rule to trip — `approvalChains` is a plain
    // object the schema says nothing about — so Continue walked straight past a section
    // that was visibly marked required. Only leaves that opt in via `isComplete` are
    // checked here; `requiredFields` keeps flowing through the schema as before.
    const incomplete = Boolean(activeLeaf?.isComplete) && isBlocking(activeLeaf);

    if (blocked || incomplete) {
      ownFields.forEach((f) => setFieldTouched(f, true));
      toast.error("Please complete the required fields in this section before continuing.");

      // Then take them to it. Touching the fields above is what renders the inline
      // errors, so this runs on the next frame — the element to scroll to does not
      // exist until React has painted them.
      const offending = ownFields
        .map((field) => firstErrorPath((formErrors as any)?.[field], field))
        .find(Boolean) ?? null;
      window.requestAnimationFrame(() => focusFieldOrError(offending));
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

  // Same precedence the Personal Details section uses: a just-picked photo shows
  // from the host's object URL immediately, before any upload round-trip, and
  // `values.avatar` (the saved URL) takes over once there is no pending file.
  // Reading `values.avatar` alone left the header on the placeholder icon until
  // the whole employee was saved and refetched.
  const headerAvatar = sectionProps?.profilePhotoPreview || values.avatar;

  return (
    <div className="enterprise-wizard ob-wizard-root" data-form-module="onboarding">
      {/* ═══ STICKY HEADER ═══════════════════════════════════════════════ */}
      <div className="wizard-header">
        <div className="wizard-header-left">
          <div className="wizard-title-row">
            <div className={`wizard-header-avatar${headerAvatar ? " wizard-header-avatar--photo" : ""}`}>
              {headerAvatar ? (
                <img src={headerAvatar} alt="Profile" className="ob-header-avatar-img" />
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
        {/* ── MOBILE: position summary + disclosure ─────────────────────────
            Display:none above the breakpoint, so desktop is untouched. It states
            where you are — group, section, and how far through — and opens the
            tree beneath it rather than competing with the form for space. */}
        <button
          type="button"
          className="ob-mobile-nav-bar"
          aria-expanded={mobileNavOpen}
          aria-label={`Section ${activeIndex + 1} of ${leaves.length}. ${mobileNavOpen ? 'Hide' : 'Show'} all sections`}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          {/* A ring, not a bar: it carries the percentage inside itself, so the
              whole progress reading costs one 36px square instead of a tile. */}
          <span className="ob-mnav-ring" aria-hidden>
            <svg viewBox="0 0 36 36">
              <circle className="ob-mnav-ring-track" cx="18" cy="18" r="15.5" />
              <circle
                className="ob-mnav-ring-fill"
                cx="18"
                cy="18"
                r="15.5"
                style={{ strokeDasharray: `${(progressPct / 100) * 97.4} 97.4` }}
              />
            </svg>
            <span className="ob-mnav-ring-text">{progressPct}%</span>
          </span>

          <span className="ob-mnav-text">
            <span className="ob-mnav-eyebrow">
              {activeGroup?.label} · Step {activeIndex + 1} of {leaves.length}
            </span>
            <span className="ob-mnav-title">{activeLeaf?.title}</span>
          </span>

          <span className={`ob-mnav-chevron${mobileNavOpen ? " is-open" : ""}`} aria-hidden>
            <ExpandMore fontSize="small" />
          </span>
        </button>

        {/* ── LEFT: the single tree timeline ───────────────────────────── */}
        <aside
          className={`wizard-nav-sidebar${mobileNavOpen ? " is-mobile-open" : ""}`}
          aria-label="Onboarding sections"
        >
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

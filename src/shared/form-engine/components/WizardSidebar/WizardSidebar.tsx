import React from "react";
import { useFormikContext } from "formik";
import { Check } from "@mui/icons-material";
import { EnterpriseWizardStep } from "../../types/formEngine.types";
import "@app/pages/employee/forms/shared/Workspace.css";

interface WizardSidebarProps {
  sections: EnterpriseWizardStep<any>[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  title?: string;
}

const hasValue = (value: any): boolean => {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    return value.some((item) => {
      if (typeof item === "object" && item !== null) {
        return Object.values(item).some(
          (v) => v !== undefined && v !== null && v !== ""
        );
      }
      return item !== undefined && item !== null && item !== "";
    });
  }
  return true;
};

export const WizardSidebar: React.FC<WizardSidebarProps> = ({
  sections,
  currentStep,
  onStepClick,
  title = "Form Progress",
}) => {
  const { values, errors, touched } = useFormikContext<any>();

  // Per-section status: completed | error | active | pending
  const getSectionStatus = (section: EnterpriseWizardStep<any>, sectionIndex: number) => {
    const hasError = section.fields.some((f) => errors[f] && touched[f]);
    if (hasError) return "error";
    if (sectionIndex === currentStep) return "active";

    // A step is gated only by its REQUIRED fields. Optional blanks must never
    // hold a step at "pending" — that was why fully-handled steps stayed grey.
    const required = section.requiredFields ?? [];
    const requiredFilled = required.every((f) => hasValue(values[f]));
    if (!requiredFilled) return "pending";

    // Requirements satisfied. Required steps count as done once filled.
    // Optional steps only count as done after the user has passed them — otherwise
    // edit-mode prefill marks Contact/Notes complete while still on Profile.
    if (required.length > 0) return "completed";
    if (sectionIndex < currentStep) return "completed";
    return "pending";
  };

  // Overall progress: completed steps + the active step once its required fields
  // are filled (so a single-step form and the current page both move the bar).
  const isDoneForProgress = (section: EnterpriseWizardStep<any>, index: number) => {
    const status = getSectionStatus(section, index);
    if (status === "completed") return true;
    if (status !== "active") return false;
    const required = section.requiredFields ?? [];
    if (required.length > 0) return required.every((f) => hasValue(values[f]));
    return (section.fields || []).some((f) => hasValue(values[f]));
  };
  const completedCount = sections.filter((s, index) => isDoneForProgress(s, index)).length;
  const progressPercent = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

  return (
    <nav className="wizard-nav-sidebar" aria-label="Wizard step navigation">

      {/* ── Progress Card ─────────────────────────────────────────────── */}
      <div className="wt-progress-card" role="status" aria-live="polite">
        <div className="wt-progress-label">{title}</div>
        <div className="wt-progress-percent">{progressPercent}%</div>
        <div className="wt-progress-sub">
          {completedCount} of {sections.length} steps completed
        </div>
        <div className="wt-progress-track" aria-hidden="true">
          <div
            className="wt-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── Step Navigation List ──────────────────────────────────────── */}
      <ol className="wt-steps-nav" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {sections.map((section, index) => {
          const status   = getSectionStatus(section, index);
          const isActive = status === "active";
          const isDone   = status === "completed";
          const isErr    = status === "error";
          const isClickable = true;  // can go back or forward to any step

          return (
            <React.Fragment key={section.id}>
              <li
                className={[
                  "wt-step-item",
                  isActive    ? "wt-step-active"    : "",
                  isDone      ? "wt-step-completed"  : "",
                  isErr       ? "wt-step-error"      : "",
                  !isClickable && !isActive ? "wt-step-disabled" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => isClickable && onStepClick?.(index)}
                role="listitem"
                aria-current={isActive ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${section.label}${isDone ? " (completed)" : isErr ? " (has errors)" : ""}`}
                tabIndex={isClickable ? 0 : -1}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && isClickable) {
                    e.preventDefault();
                    onStepClick?.(index);
                  }
                }}
              >
                {/* Number / status badge */}
                <div className="wt-step-badge" aria-hidden="true">
                  {isDone ? (
                    <Check style={{ fontSize: 13 }} />
                  ) : isErr ? (
                    "!"
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label */}
                <div className="wt-step-text">
                  <span className="wt-step-label">{section.label}</span>
                  {section.subtitle && (
                    <span className="wt-step-sublabel">{section.subtitle}</span>
                  )}
                </div>
              </li>

              {/* Connector line between steps */}
              {index < sections.length - 1 && (
                <div
                  className={`wt-step-connector ${isDone ? "completed" : ""}`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default WizardSidebar;

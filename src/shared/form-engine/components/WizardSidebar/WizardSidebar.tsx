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

const hasValue = (value: any): boolean =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  (!Array.isArray(value) || value.length > 0);

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
    if (sectionIndex < currentStep) return "completed";
    if (sectionIndex === currentStep) return "active";
    return "pending";
  };

  // Overall progress: how many tracked fields across ALL sections are filled
  const allFields = Array.from(new Set(sections.flatMap((s) => s.fields)));
  const filled = allFields.filter((f) => hasValue(values[f])).length;
  const progressPercent = allFields.length > 0 ? Math.round((filled / allFields.length) * 100) : 0;
  const completedCount = sections.slice(0, currentStep).length;

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
          const isClickable = index < currentStep;  // can go back to completed steps

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

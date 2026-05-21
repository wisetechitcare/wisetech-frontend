import React, { useMemo, useState, useCallback } from "react";
import { useFormikContext } from "formik";
import { PictureAsPdf, Description } from "@mui/icons-material";
import { EnterpriseWizardStep, WizardActionConfig, WizardSummaryConfig } from "../../types/formEngine.types";
import { SummarySidebar } from "../SummarySidebar/SummarySidebar";
import { WizardSidebar } from "../WizardSidebar/WizardSidebar";
import "@app/pages/employee/forms/shared/Workspace.css";

interface EnterpriseFormWizardProps<TValues = any, TStepProps = any> {
  module: string;
  steps: EnterpriseWizardStep<TStepProps>[];
  stepProps?: TStepProps;
  summary: WizardSummaryConfig<TValues>;
  actions: WizardActionConfig;
  headerTitle?: string;
  headerSub?: string;
  headerActions?: React.ReactNode;
  sidebarTitle?: string;
  breadcrumb?: string[];
  onStepChange?: (step: number) => void;
  initialStep?: number;
}

export function EnterpriseFormWizard<TValues = any, TStepProps = any>({
  module,
  steps,
  stepProps,
  summary,
  actions,
  headerTitle,
  headerSub,
  sidebarTitle,
  breadcrumb,
  onStepChange,
  initialStep = 0,
}: EnterpriseFormWizardProps<TValues, TStepProps>) {
  const { values, submitForm } = useFormikContext<TValues>();
  const visibleSteps = useMemo(() => steps.filter((step) => !step.hidden), [steps]);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [animKey, setAnimKey] = useState(0);

  const summaryRows = typeof summary.rows === "function" ? summary.rows(values) : summary.rows;
  const isLastStep = currentStep === visibleSteps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepDef = visibleSteps[currentStep];
  const StepComponent = currentStepDef?.component;

  const scrollCanvasTop = useCallback(() => {
    document.querySelector(".wizard-step-canvas")?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToStep = useCallback((idx: number) => {
    if (idx >= 0 && idx < visibleSteps.length && idx !== currentStep) {
      setCurrentStep(idx);
      setAnimKey((k) => k + 1);
      scrollCanvasTop();
      onStepChange?.(idx);
    }
  }, [currentStep, visibleSteps.length, scrollCanvasTop, onStepChange]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      submitForm();
    } else {
      goToStep(currentStep + 1);
    }
  }, [isLastStep, currentStep, goToStep, submitForm]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  }, [isFirstStep, currentStep, goToStep]);

  // Resolve breadcrumb: use prop or infer from module
  const crumbs: string[] = breadcrumb || [
    "Dashboard",
    module === "lead" ? "Leads" : module === "project" ? "Projects" : "CRM",
    headerTitle || "Create",
  ];

  return (
    <div className="enterprise-wizard" data-form-module={module}>

      {/* ═══ STICKY HEADER ══════════════════════════════════════════════════ */}
      <div className="wizard-header">
        <div className="wizard-header-left">
          {/* Breadcrumb */}
          <nav className="wizard-breadcrumb" aria-label="Breadcrumb">
            {crumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="wt-bc-sep" aria-hidden="true">›</span>}
                <span className={idx === crumbs.length - 1 ? "wt-bc-active" : ""}>{crumb}</span>
              </React.Fragment>
            ))}
          </nav>

          {/* Title */}
          <h1 className="wizard-title">{headerTitle}</h1>
          {headerSub && <p className="wizard-subtitle">{headerSub}</p>}
        </div>

        {/* Header action buttons */}
        <div className="wizard-header-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {actions.isEditMode && (actions.exportPdf || actions.exportDocx) && (
            <div className="wt-header-exports d-flex gap-2 align-items-center me-2">
              {actions.exportPdf && (
                <button
                  type="button"
                  className="wt-export-btn wt-export-pdf"
                  onClick={actions.exportPdf}
                  title="Export PDF"
                  style={{ minWidth: "75px", padding: "0.35rem 0.5rem" }}
                >
                  <PictureAsPdf style={{ fontSize: "0.9rem" }} />
                  <span>PDF</span>
                </button>
              )}
              {actions.exportDocx && (
                <button
                  type="button"
                  className="wt-export-btn wt-export-docx"
                  onClick={actions.exportDocx}
                  title="Export DOCX"
                  style={{ minWidth: "75px", padding: "0.35rem 0.5rem" }}
                >
                  <Description style={{ fontSize: "0.9rem" }} />
                  <span>DOCX</span>
                </button>
              )}
            </div>
          )}
          {actions.onSaveDraft && (
            <button
              type="button"
              className="wt-btn wt-btn-ghost"
              onClick={actions.onSaveDraft}
              disabled={actions.isSubmitting || actions.isSavingDraft}
              title="Save your progress as a draft (no validation required)"
              style={{ borderStyle: 'dashed' }}
            >
              {actions.isSavingDraft ? 'Saving…' : '💾 Save Draft'}
            </button>
          )}
          <button
            type="button"
            className="wt-btn wt-btn-ghost"
            onClick={actions.onCancel}
            disabled={actions.isSubmitting}
          >
            Cancel
          </button>

          {!isLastStep ? (
            <button
              type="button"
              className="wt-btn wt-btn-primary"
              onClick={handleNext}
              disabled={actions.isSubmitting}
            >
              Save &amp; Continue →
            </button>
          ) : actions.onSaveUpdate && actions.onSaveRevision ? (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="wt-btn wt-btn-secondary"
                disabled={actions.isSubmitting || actions.submitDisabled}
                onClick={actions.onSaveUpdate}
              >
                {actions.isSubmitting ? "Saving…" : "Save as Update"}
              </button>
              <button
                type="button"
                className="wt-btn wt-btn-primary"
                disabled={actions.isSubmitting || actions.submitDisabled}
                onClick={actions.onSaveRevision}
              >
                {actions.isSubmitting ? "Saving…" : "Save as Revision"}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="wt-btn wt-btn-primary"
              disabled={actions.isSubmitting || actions.submitDisabled}
            >
              {actions.isSubmitting
                ? "Saving…"
                : actions.submitText || (actions.isEditMode ? "Save Changes" : "Create")}
            </button>
          )}
        </div>
      </div>

      {/* ═══ THREE-COLUMN LAYOUT ════════════════════════════════════════════ */}
      <div className="wizard-layout">

        {/* ── LEFT: Step Navigation Sidebar ─────────────────────────────── */}
        <WizardSidebar
          sections={visibleSteps}
          currentStep={currentStep}
          onStepClick={goToStep}
          title={sidebarTitle}
        />

        {/* ── CENTER: Step Canvas ───────────────────────────────────────── */}
        <main className="wizard-step-canvas" role="main">

          {/* Step page sticky sub-header */}
          <div className="wt-step-page-header">
            <div className="wt-step-page-meta">
              <span className="wt-step-badge-pill">
                Step {currentStep + 1} of {visibleSteps.length}
              </span>
              <span className="wt-mandatory-note">
                <span>*</span> Required fields
              </span>
            </div>
            <h2 className="wt-step-page-title">{currentStepDef?.title}</h2>
            {currentStepDef?.subtitle && (
              <p className="wt-step-page-subtitle">{currentStepDef.subtitle}</p>
            )}
          </div>

          {/* Step content body */}
          <div className="wt-step-body wt-step-animate" key={animKey}>
            {currentStepDef?.render
              ? currentStepDef.render(stepProps as TStepProps)
              : StepComponent
              ? React.createElement(StepComponent as React.ComponentType<any>, stepProps || {})
              : null}
          </div>
        </main>

        {/* ── RIGHT: Summary Panel ──────────────────────────────────────── */}
        <aside className="wizard-summary-panel" aria-label="Lead summary">
          <SummarySidebar
            title={summary.title}
            rows={summaryRows}
            warningMessage={summary.warningMessage}
            {...actions}
            hideSubmitButton
          />
        </aside>
      </div>

      {/* ═══ BOTTOM STICKY FOOTER BAR ═══════════════════════════════════════ */}
      <div className="wizard-footer-bar" role="navigation" aria-label="Step navigation">

        {/* Back button */}
        <button
          type="button"
          className="wt-btn wt-btn-ghost"
          onClick={handleBack}
          disabled={isFirstStep || actions.isSubmitting}
          aria-label="Go to previous step"
        >
          ← Back
        </button>

        {/* Step dot indicators */}
        <div className="wt-step-dots" role="tablist" aria-label="Wizard steps">
          {visibleSteps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={idx === currentStep}
              aria-label={`Step ${idx + 1}: ${step.label}`}
              className={`wt-dot ${idx === currentStep ? "wt-dot-active" : ""} ${idx < currentStep ? "wt-dot-completed" : ""}`}
              onClick={() => idx < currentStep && goToStep(idx)}
            />
          ))}
        </div>

        {/* Forward actions */}
        <div className="wizard-footer-right">
          {isLastStep ? (
            actions.onSaveUpdate && actions.onSaveRevision ? (
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="wt-btn wt-btn-secondary wt-btn-lg"
                  disabled={actions.isSubmitting || actions.submitDisabled}
                  onClick={actions.onSaveUpdate}
                >
                  {actions.isSubmitting ? "Saving…" : "Save as Update"}
                </button>
                <button
                  type="button"
                  className="wt-btn wt-btn-primary wt-btn-lg"
                  disabled={actions.isSubmitting || actions.submitDisabled}
                  onClick={actions.onSaveRevision}
                >
                  {actions.isSubmitting ? "Saving…" : "Save as Revision"}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="wt-btn wt-btn-primary wt-btn-lg"
                disabled={actions.isSubmitting || actions.submitDisabled}
              >
                {actions.isSubmitting
                  ? "Saving…"
                  : actions.submitText || (actions.isEditMode ? "Save Changes" : "Create")}
              </button>
            )
          ) : (
            <button
              type="button"
              className="wt-btn wt-btn-primary wt-btn-lg"
              onClick={handleNext}
              disabled={actions.isSubmitting}
            >
              Save &amp; Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnterpriseFormWizard;

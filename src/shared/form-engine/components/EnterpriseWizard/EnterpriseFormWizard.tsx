import React, { useMemo, useState, useCallback } from "react";
import { useFormikContext } from "formik";
import { toast } from "react-toastify";
import { PictureAsPdf, Description, ChevronRight, ChevronLeft } from "@mui/icons-material";
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
  headerSub?: React.ReactNode;
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
  const { values, submitForm, validateForm, setFieldTouched } = useFormikContext<TValues>();
  const visibleSteps = useMemo(() => steps.filter((step) => !step.hidden), [steps]);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [animKey, setAnimKey] = useState(0);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  const summaryRows = typeof summary.rows === "function" ? summary.rows(values) : summary.rows;
  const isLastStep = currentStep === visibleSteps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepDef = visibleSteps[currentStep];
  const isSaveStep = isLastStep || !!currentStepDef?.isSubmitStep;
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

  const handleNext = useCallback(async () => {
    const errors = await validateForm();
    const currentFields = visibleSteps[currentStep]?.fields || [];
    
    // Check if there are any errors in the current step's fields
    const hasErrorInCurrentStep = currentFields.some((field: string) => {
      return Object.keys(errors).some(errKey => errKey === field || errKey.startsWith(field + '[') || errKey.startsWith(field + '.'));
    });

    if (hasErrorInCurrentStep) {
      toast.error("Please fill in all required fields in this step before proceeding.");
      currentFields.forEach((field: string) => setFieldTouched(field, true));
      return;
    }

    if (isSaveStep) {
      if (Object.keys(errors).length > 0) {
        toast.error("Please fill in all required fields before submitting.");
        Object.keys(errors).forEach(key => setFieldTouched(key, true));
        return;
      }
      if (actions.onFinalSave) {
        actions.onFinalSave();
      } else {
        submitForm();
      }
    } else {
      goToStep(currentStep + 1);
    }
  }, [isLastStep, currentStep, goToStep, submitForm, actions, validateForm, setFieldTouched, visibleSteps]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  }, [isFirstStep, currentStep, goToStep]);

  void breadcrumb; // breadcrumb intentionally not rendered (kept in API for callers)

  return (
    <div className="enterprise-wizard" data-form-module={module}>

      {/* ═══ STICKY HEADER ══════════════════════════════════════════════════ */}
      <div className="wizard-header">
        <div className="wizard-header-left">
          {/* Title with module avatar */}
          <div className="wizard-title-row">
            <div className="wizard-header-avatar" aria-hidden>
              <i className={`bi ${module === "project" ? "bi-buildings-fill" : "bi-building"}`} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="wizard-title">{headerTitle}</h1>
              {headerSub && <div className="wizard-subtitle">{headerSub}</div>}
            </div>
          </div>
        </div>

        {/* Header action buttons */}
        <div className="wizard-header-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* Export buttons moved to Summary sidebar */}
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

        {/* ── RIGHT: Summary Panel (collapsible to the right, like a sidebar) ─ */}
        {summaryCollapsed ? (
          <aside
            className="wizard-summary-panel"
            aria-label="Lead summary (collapsed)"
            style={{
              width: 40,
              minWidth: 40,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 12,
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setSummaryCollapsed(false)}
              aria-label="Expand summary"
              title="Expand summary"
              style={{
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft style={{ fontSize: '1.2rem' }} />
            </button>
            <div
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                color: '#64748B',
                textTransform: 'uppercase',
                userSelect: 'none',
              }}
            >
              {summary.title}
            </div>
          </aside>
        ) : (
        <aside className="wizard-summary-panel" aria-label="Lead summary" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 8px 0' }}>
            <button
              type="button"
              onClick={() => setSummaryCollapsed(true)}
              aria-label="Collapse summary"
              title="Collapse summary"
              style={{
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              <ChevronRight style={{ fontSize: '1.2rem' }} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <SummarySidebar
              title={summary.title}
              rows={summaryRows}
              warningMessage={summary.warningMessage}
              {...actions}
              hideSubmitButton
            />
          </div>

          {/* Export Buttons at Bottom of Summary (Last Step Only) */}
          {isSaveStep && (actions.exportPdf || actions.exportDocx) && (
            <div className="mt-4 p-4 bg-white rounded-3 shadow-sm border border-gray-100 d-flex gap-3 justify-content-center flex-wrap">
              {actions.exportPdf && (
                <button
                  type="button"
                  className="wt-btn wt-btn-outline-primary"
                  onClick={actions.exportPdf}
                  title="Export to PDF"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '0.5rem', padding: '0.5rem' }}
                >
                  <PictureAsPdf style={{ fontSize: "1.1rem", color: '#e2445c' }} />
                  <span className="fw-bold">Export PDF</span>
                </button>
              )}
              {actions.exportDocx && (
                <button
                  type="button"
                  className="wt-btn wt-btn-outline-primary"
                  onClick={actions.exportDocx}
                  title="Export to Word Document"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '0.5rem', padding: '0.5rem' }}
                >
                  <Description style={{ fontSize: "1.1rem", color: '#2563eb' }} />
                  <span className="fw-bold">Export DOCX</span>
                </button>
              )}
            </div>
          )}
        </aside>
        )}
      </div>

      {/* ═══ BOTTOM STICKY FOOTER BAR ═══════════════════════════════════════ */}
      <div className="wizard-footer-bar" role="navigation" aria-label="Step navigation" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        <div className="wizard-footer-left" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Cancel button */}
          <button
            type="button"
            className="wt-btn wt-btn-ghost"
            onClick={actions.onCancel}
            disabled={actions.isSubmitting}
            aria-label="Cancel"
          >
            Cancel
          </button>

          {/* Save Draft button */}
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

          {/* Persistent Save — lets the user submit from any step (not only the
              final/review step). Hidden on the save step to avoid a duplicate. */}
          {actions.onFinalSave && !isSaveStep && (
            <button
              type="button"
              className="wt-btn wt-btn-primary"
              disabled={actions.isSubmitting || actions.submitDisabled}
              onClick={async () => {
                const errors = await validateForm();
                if (Object.keys(errors).length > 0) {
                  toast.error("Please fill in all required fields before submitting.");
                  Object.keys(errors).forEach((key) => setFieldTouched(key, true));
                  return;
                }
                actions.onFinalSave && actions.onFinalSave();
              }}
              title="Save changes now"
            >
              {actions.isSubmitting ? "Saving…" : (actions.submitText || "Save")}
            </button>
          )}
        </div>

        <div className="wizard-footer-right" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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

          {/* Forward actions */}
          {isSaveStep ? (
            actions.onFinalSave ? (
              <button
                type="button"
                className="wt-btn wt-btn-primary wt-btn-lg"
                disabled={actions.isSubmitting || actions.submitDisabled}
                onClick={async () => {
                  const errors = await validateForm();
                  if (Object.keys(errors).length > 0) {
                    toast.error("Please fill in all required fields before submitting.");
                    Object.keys(errors).forEach(key => setFieldTouched(key, true));
                    return;
                  }
                  actions.onFinalSave && actions.onFinalSave();
                }}
              >
                {actions.isSubmitting ? "Saving…" : "Save"}
              </button>
            ) : actions.onSaveUpdate && actions.onSaveRevision ? (
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="wt-btn wt-btn-secondary wt-btn-lg"
                  disabled={actions.isSubmitting || actions.submitDisabled}
                  onClick={async () => {
                    const errors = await validateForm();
                    if (Object.keys(errors).length > 0) {
                      toast.error("Please fill in all required fields before submitting.");
                      Object.keys(errors).forEach(key => setFieldTouched(key, true));
                      return;
                    }
                    actions.onSaveUpdate && actions.onSaveUpdate();
                  }}
                >
                  {actions.isSubmitting ? "Saving…" : "Save as Update"}
                </button>
                <button
                  type="button"
                  className="wt-btn wt-btn-primary wt-btn-lg"
                  disabled={actions.isSubmitting || actions.submitDisabled}
                  onClick={async () => {
                    const errors = await validateForm();
                    if (Object.keys(errors).length > 0) {
                      toast.error("Please fill in all required fields before submitting.");
                      Object.keys(errors).forEach(key => setFieldTouched(key, true));
                      return;
                    }
                    actions.onSaveRevision && actions.onSaveRevision();
                  }}
                >
                  {actions.isSubmitting ? "Saving…" : "Save as Revision"}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="wt-btn wt-btn-primary wt-btn-lg"
                disabled={actions.isSubmitting || actions.submitDisabled}
                onClick={async (e) => {
                  const errors = await validateForm();
                  if (Object.keys(errors).length > 0) {
                    toast.error("Please fill in all required fields before submitting.");
                  }
                }}
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

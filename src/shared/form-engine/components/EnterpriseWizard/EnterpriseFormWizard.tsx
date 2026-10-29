import React, { useMemo, useState, useCallback } from "react";
import { useFormikContext } from "formik";
import { toast } from "react-toastify";
import { PictureAsPdf, Description, ChevronRight, ChevronLeft } from "@mui/icons-material";
import { EnterpriseWizardStep, WizardActionConfig, WizardReviewConfig, WizardSummaryConfig } from "../../types/formEngine.types";
import { GroupedWizard, type GroupedWizardProps } from "./GroupedWizard";
import { WizardFooterActions } from "./WizardFooterActions";
import { WtButton } from "@app/modules/common/components/ui";
import { SummarySidebar } from "../SummarySidebar/SummarySidebar";
import { WizardSidebar } from "../WizardSidebar/WizardSidebar";
import "@app/pages/employee/forms/shared/Workspace.css";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

interface EnterpriseFormWizardProps<TValues = any, TStepProps = any> {
  layout?: "steps";
  module: string;
  steps: EnterpriseWizardStep<TStepProps>[];
  stepProps?: TStepProps;
  summary: WizardSummaryConfig<TValues>;
  actions: WizardActionConfig;
  headerTitle?: string;
  headerSub?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Bootstrap-icon class for the header avatar. Defaults per `module`. */
  moduleIcon?: string;
  /** Alias of moduleIcon. */
  icon?: string;
  /** Accepted for API compatibility; the steps layout (Lead / Company / Contact) keeps the production design and renders no review step. */
  review?: WizardReviewConfig;
  sidebarTitle?: string;
  breadcrumb?: string[];
  onStepChange?: (step: number) => void;
  initialStep?: number;
}

/**
 * One entry point, two layouts. `sections` (Employee onboarding, Job, Candidate) renders
 * GroupedWizard; the steps layout (Lead, Company, Contact) is the production design, kept
 * unchanged on purpose.
 */
export function EnterpriseFormWizard<TValues = any, TStepProps = any>(
  props: EnterpriseFormWizardProps<TValues, TStepProps> | (GroupedWizardProps<TStepProps> & { layout: "sections" }),
) {
  return props.layout === "sections"
    ? <GroupedWizard {...props} />
    : <StepWizard {...props} />;
}

function StepWizard<TValues = any, TStepProps = any>({
  module,
  steps,
  stepProps,
  summary,
  actions,
  headerTitle,
  headerSub,
  headerActions,
  moduleIcon: moduleIconProp,
  icon,
  sidebarTitle,
  breadcrumb,
  onStepChange,
  initialStep = 0,
}: EnterpriseFormWizardProps<TValues, TStepProps>) {
  const moduleIcon = moduleIconProp ?? icon;
  const { values, submitForm, validateForm, setFieldTouched } = useFormikContext<TValues>();
  const visibleSteps = useMemo(() => steps.filter((step) => !step.hidden), [steps]);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [animKey, setAnimKey] = useState(0);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  const isLastStep = currentStep === visibleSteps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepDef = visibleSteps[currentStep];
  const summaryRows = typeof summary.rows === "function" ? summary.rows(values, currentStepDef) : summary.rows;
  const summaryExtra = typeof summary.extra === "function" ? summary.extra(values, currentStepDef) : summary.extra;
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

  // Whole-form validation, then save — from any step, same as Save & Continue on the last one.
  const saveAfterValidation = async (save: () => void) => {
    const errors = await validateForm();
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields before submitting.");
      Object.keys(errors).forEach((key) => setFieldTouched(key, true));
      return;
    }
    save();
  };
  const handleDirectSave = () => saveAfterValidation(actions.onFinalSave ?? submitForm);

  void breadcrumb; // breadcrumb intentionally not rendered (kept in API for callers)

  return (
    <div className="enterprise-wizard" data-form-module={module}>

      {/* ═══ STICKY HEADER ══════════════════════════════════════════════════ */}
      <div className="wizard-header">
        <div className="wizard-header-left">
          {/* Title with module avatar */}
          <div className="wizard-title-row">
            <div className="wizard-header-avatar" aria-hidden>
              <AppIcon name={moduleIcon || (module === "project" ? "bi-buildings-fill" : "bi-building")} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="wizard-title">{headerTitle}</h1>
              {headerSub && <div className="wizard-subtitle">{headerSub}</div>}
            </div>
          </div>
        </div>

        {/* Header action buttons. Export lives in the Summary sidebar; this slot is
            for module-level actions (e.g. the Company form's schema manager). The
            close button is absolutely positioned by the host modal, so leave room. */}
        <div className="wizard-header-actions">
          {headerActions}
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="wt-step-page-title">{currentStepDef?.title}</h2>
              {currentStepDef?.titleAdornment}
            </div>
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
              extra={summaryExtra}
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

        <WizardFooterActions
          isSubmitting={!!actions.isSubmitting}
          onCancel={actions.onCancel}
          onDirectSave={handleDirectSave}
          directSaveLabel={actions.isEditMode ? "Save Changes" : "Save"}
          directSaveDisabled={actions.submitDisabled}
          leftExtra={actions.onSaveDraft && (
            <WtButton ghost onClick={actions.onSaveDraft} disabled={actions.isSubmitting || actions.isSavingDraft}>
              {actions.isSavingDraft ? "Saving…" : "Save draft"}
            </WtButton>
          )}
          onBack={handleBack}
          backDisabled={isFirstStep}
          onNext={handleNext}
          nextLabel={isSaveStep ? actions.submitText || (actions.isEditMode ? "Save Changes" : "Create") : "Save & Continue"}
          nextDisabled={isSaveStep && actions.submitDisabled}
          nextSlot={isSaveStep && !actions.onFinalSave && actions.onSaveUpdate && actions.onSaveRevision ? (
            <>
              <WtButton inverted onClick={() => saveAfterValidation(actions.onSaveUpdate!)} disabled={actions.isSubmitting || actions.submitDisabled}>
                {actions.isSubmitting ? "Saving…" : "Save as Update"}
              </WtButton>
              <WtButton tone="accent" onClick={() => saveAfterValidation(actions.onSaveRevision!)} disabled={actions.isSubmitting || actions.submitDisabled}>
                {actions.isSubmitting ? "Saving…" : "Save as Revision"}
              </WtButton>
            </>
          ) : undefined}
        />
      </div>
    </div>
  );
}

export default EnterpriseFormWizard;

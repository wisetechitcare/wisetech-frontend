import React, { useMemo, useState, useCallback, useRef } from "react";
import { useFormikContext } from "formik";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { EnterpriseWizardStep, WizardActionConfig, WizardReviewConfig, WizardSummaryConfig } from "../../types/formEngine.types";
import { GroupedWizard, type GroupedWizardProps } from "./GroupedWizard";
import { WizardFooterActions } from "./WizardFooterActions";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { cn } from "@/ds/lib/utils";
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
  /** Accepted for API compatibility; the steps layout renders no review step. */
  review?: WizardReviewConfig;
  sidebarTitle?: string;
  breadcrumb?: string[];
  onStepChange?: (step: number) => void;
  initialStep?: number;
}

/** Pill for the wizard header's subtitle line (revision, status, prefix…), readable on the brand gradient. */
export function WizardHeaderBadge({ icon, accent, children }: { icon?: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <Badge className={cn("h-6 border-0! px-2.5 font-semibold text-white ring-1 ring-white/30", accent ? "bg-white/25" : "bg-white/20")}>
      {icon && <AppIcon name={icon} aria-hidden />}
      {children}
    </Badge>
  );
}

/**
 * One entry point, two layouts. `sections` (Employee onboarding, Job, Candidate) renders
 * GroupedWizard; the steps layout serves Lead, Company, Sub-company, Branch and Contact.
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
  onStepChange,
  initialStep = 0,
}: EnterpriseFormWizardProps<TValues, TStepProps>) {
  const moduleIcon = moduleIconProp ?? icon;
  const { values, submitForm, validateForm, setFieldTouched } = useFormikContext<TValues>();
  const visibleSteps = useMemo(() => steps.filter((step) => !step.hidden), [steps]);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const canvasRef = useRef<HTMLElement>(null);

  const isLastStep = currentStep === visibleSteps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepDef = visibleSteps[currentStep];
  const summaryRows = typeof summary.rows === "function" ? summary.rows(values, currentStepDef) : summary.rows;
  const summaryExtra = typeof summary.extra === "function" ? summary.extra(values, currentStepDef) : summary.extra;
  const isSaveStep = isLastStep || !!currentStepDef?.isSubmitStep;
  const StepComponent = currentStepDef?.component;

  const goToStep = useCallback((idx: number) => {
    if (idx >= 0 && idx < visibleSteps.length && idx !== currentStep) {
      setCurrentStep(idx);
      canvasRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      onStepChange?.(idx);
    }
  }, [currentStep, visibleSteps.length, onStepChange]);

  const handleNext = useCallback(async () => {
    const errors = await validateForm();
    const currentFields = visibleSteps[currentStep]?.fields || [];
    const hasErrorInCurrentStep = currentFields.some((field: string) =>
      Object.keys(errors).some((errKey) => errKey === field || errKey.startsWith(field + "[") || errKey.startsWith(field + ".")),
    );

    if (hasErrorInCurrentStep) {
      toast.error("Please fill in all required fields in this step before proceeding.");
      currentFields.forEach((field: string) => setFieldTouched(field, true));
      return;
    }

    if (isSaveStep) {
      if (Object.keys(errors).length > 0) {
        toast.error("Please fill in all required fields before submitting.");
        Object.keys(errors).forEach((key) => setFieldTouched(key, true));
        return;
      }
      if (actions.onFinalSave) actions.onFinalSave();
      else submitForm();
    } else {
      goToStep(currentStep + 1);
    }
  }, [isSaveStep, currentStep, goToStep, submitForm, actions, validateForm, setFieldTouched, visibleSteps]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) goToStep(currentStep - 1);
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

  return (
    // `enterprise-wizard` + data-form-module: the fullscreen-modal height rules and per-module
    // field layouts (crmWizardTheme.css) hook onto these. data-slot gives the kit's px scale.
    <div data-slot="enterprise-wizard" data-form-module={module} className="enterprise-wizard flex h-full flex-col overflow-hidden bg-muted/40 text-foreground">

      <header className="relative z-10 flex min-h-[92px] shrink-0 flex-wrap items-center justify-between gap-3 bg-linear-90 from-[#2C56C4] via-[#1E3A8A] to-[#15265C] px-4 py-3 shadow-[0_1px_3px_rgb(0_0_0/0.06)] md:flex-nowrap md:px-8">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-2xl text-[#1E3A8A] shadow-[0_4px_12px_rgb(8_15_40/0.28)] md:size-16 md:text-3xl">
            <AppIcon name={moduleIcon || (module === "project" ? "bi-buildings-fill" : "bi-building")} />
          </span>
          <div className="min-w-0">
            <h1 className="m-0 truncate font-[Barlow,sans-serif] text-base leading-tight font-bold tracking-[-0.3px] text-white md:text-[22px]">
              {headerTitle}
            </h1>
            {headerSub && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-white/85">{headerSub}</div>
            )}
          </div>
        </div>
        {/* The host modal floats its close button over the right edge — leave it room. */}
        <div className="mr-14 ml-auto flex shrink-0 items-center gap-2 md:mr-10">{headerActions}</div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <WizardSidebar sections={visibleSteps} currentStep={currentStep} onStepClick={goToStep} title={sidebarTitle} />

        <main ref={canvasRef} role="main" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-card px-4 pt-4 pb-3.5 md:px-8 md:pt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
              <Badge variant="brand" className="h-6 border-0! px-3 text-[11px] font-bold tracking-wider uppercase ring-1 ring-primary/15">
                Step {currentStep + 1} of {visibleSteps.length}
              </Badge>
              <span className="text-[11px] font-medium text-muted-foreground">
                <span className="font-bold text-destructive">*</span> Required fields
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 font-[Barlow,sans-serif] text-lg leading-tight font-bold tracking-[-0.3px] text-foreground md:text-[22px]">
                {currentStepDef?.title}
              </h2>
              {currentStepDef?.titleAdornment}
            </div>
            {currentStepDef?.subtitle && <p className="m-0 mt-1 text-xs font-medium text-muted-foreground">{currentStepDef.subtitle}</p>}
          </div>

          <div key={currentStep} className="wt-step-animate flex flex-1 flex-col gap-5 px-4 py-4 md:px-8 md:py-7">
            {currentStepDef?.render
              ? currentStepDef.render(stepProps as TStepProps)
              : StepComponent
              ? React.createElement(StepComponent as React.ComponentType<any>, stepProps || {})
              : null}
          </div>
        </main>

        {summaryCollapsed ? (
          <aside aria-label={`${summary.title} (collapsed)`} className="hidden w-10 shrink-0 flex-col items-center gap-3 border-l border-border bg-card pt-3 min-[1100px]:flex">
            <Button variant="outline" size="icon-sm" onClick={() => setSummaryCollapsed(false)} aria-label="Expand summary" title="Expand summary">
              <ChevronLeft />
            </Button>
            <span className="rotate-180 text-[11px] font-bold tracking-wider text-muted-foreground uppercase select-none [writing-mode:vertical-rl]">
              {summary.title}
            </span>
          </aside>
        ) : (
          <aside aria-label={summary.title} className="hidden w-[260px] shrink-0 flex-col overflow-hidden border-l border-border bg-card min-[1100px]:flex xl:w-[296px]">
            <div className="flex justify-end px-2 pt-2">
              <Button variant="outline" size="icon-sm" onClick={() => setSummaryCollapsed(true)} aria-label="Collapse summary" title="Collapse summary">
                <ChevronRight />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SummarySidebar title={summary.title} rows={summaryRows} warningMessage={summary.warningMessage} extra={summaryExtra} />
            </div>
            {isSaveStep && (actions.exportPdf || actions.exportDocx) && (
              <div className="flex flex-wrap justify-center gap-2 border-t border-border px-4 py-3">
                {actions.exportPdf && (
                  <Button variant="outline" className="flex-1" onClick={actions.exportPdf} title="Export to PDF">
                    <FileText data-icon="inline-start" className="text-destructive" />
                    Export PDF
                  </Button>
                )}
                {actions.exportDocx && (
                  <Button variant="outline" className="flex-1" onClick={actions.exportDocx} title="Export to Word Document">
                    <FileText data-icon="inline-start" className="text-primary" />
                    Export DOCX
                  </Button>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      <div role="navigation" aria-label="Step navigation" className="z-30 flex min-h-[68px] shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-2.5 shadow-[0_-4px_16px_rgb(0_0_0/0.05)] md:px-8">
        <WizardFooterActions
          isSubmitting={!!actions.isSubmitting}
          onCancel={actions.onCancel}
          onDirectSave={handleDirectSave}
          directSaveLabel={actions.isEditMode ? "Save Changes" : "Save"}
          directSaveDisabled={actions.submitDisabled}
          leftExtra={actions.onSaveDraft && (
            <Button type="button" variant="ghost" onClick={actions.onSaveDraft} disabled={actions.isSubmitting || actions.isSavingDraft}>
              {actions.isSavingDraft ? "Saving…" : "Save draft"}
            </Button>
          )}
          onBack={handleBack}
          backDisabled={isFirstStep}
          onNext={handleNext}
          nextLabel={isSaveStep ? actions.submitText || (actions.isEditMode ? "Save Changes" : "Create") : "Save & Continue"}
          nextDisabled={isSaveStep && actions.submitDisabled}
          nextSlot={isSaveStep && !actions.onFinalSave && actions.onSaveUpdate && actions.onSaveRevision ? (
            <>
              <Button type="button" variant="inverted" onClick={() => saveAfterValidation(actions.onSaveUpdate!)} disabled={actions.isSubmitting || actions.submitDisabled}>
                {actions.isSubmitting ? "Saving…" : "Save as Update"}
              </Button>
              <Button type="button" onClick={() => saveAfterValidation(actions.onSaveRevision!)} disabled={actions.isSubmitting || actions.submitDisabled}>
                {actions.isSubmitting ? "Saving…" : "Save as Revision"}
              </Button>
            </>
          ) : undefined}
        />
      </div>
    </div>
  );
}

export default EnterpriseFormWizard;

import React, { useMemo, useState, useCallback, useRef } from "react";
import { Box, Typography } from '@mui/material';
import { useFormikContext } from "formik";
import { PictureAsPdf, Description, ChevronRight, ChevronLeft } from "@mui/icons-material";
import { EnterpriseWizardStep, WizardActionConfig, WizardSummaryConfig } from "../../types/formEngine.types";
import { SummarySidebar } from "../SummarySidebar/SummarySidebar";
import { WizardSidebar } from "../WizardSidebar/WizardSidebar";
import { GroupedWizard, type GroupedWizardProps } from './GroupedWizard';
import { hasStepErrors, stepValueSignature } from '../../utils/stepValidation';
import { AppIcon, FormSection, GlassDialogActions, TRIO, toast, useUnsavedChangesGuard, WtButton, WtIconButton } from '@app/modules/common/components/ui';

interface EnterpriseFormWizardProps<TValues = any, TStepProps = any> {
  layout?: 'steps';
  module: string;
  steps: EnterpriseWizardStep<TStepProps>[];
  stepProps?: TStepProps;
  summary: WizardSummaryConfig<TValues>;
  actions: WizardActionConfig;
  headerTitle?: string;
  headerSub?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** AppIcon name for the header avatar. Defaults per `module`. */
  icon?: string;
  /** @deprecated Use `icon`; retained while existing hosts migrate. */
  moduleIcon?: string;
  sidebarTitle?: string;
  breadcrumb?: string[];
  onStepChange?: (step: number) => void;
  initialStep?: number;
}

export function EnterpriseFormWizard<TValues = any, TStepProps = any>(
  props: EnterpriseFormWizardProps<TValues, TStepProps> | (GroupedWizardProps<TStepProps> & { layout: 'sections' }),
) {
  return props.layout === 'sections'
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
  icon,
  moduleIcon,
  sidebarTitle,
  breadcrumb,
  onStepChange,
  initialStep = 0,
}: EnterpriseFormWizardProps<TValues, TStepProps>) {
  const { dirty, values, submitForm, validateForm, setFieldTouched } = useFormikContext<TValues>();
  const { requestClose, dialog: unsavedChangesDialog } = useUnsavedChangesGuard(dirty, actions.onCancel);
  const visibleSteps = useMemo(() => steps.filter((step) => !step.hidden), [steps]);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [animKey, setAnimKey] = useState(0);
  const canvasRef = useRef<HTMLElement>(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [validatedSections, setValidatedSections] = useState<Record<string, string>>({});
  const completedSections = Object.fromEntries(visibleSteps.map((step) => [
    step.id,
    validatedSections[step.id] === stepValueSignature(values, step.fields),
  ]));

  const isLastStep = currentStep === visibleSteps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepDef = visibleSteps[currentStep];
  const summaryRows = typeof summary.rows === "function" ? summary.rows(values, currentStepDef) : summary.rows;
  const isSaveStep = isLastStep || !!currentStepDef?.isSubmitStep;
  const StepComponent = currentStepDef?.component;

  const scrollCanvasTop = useCallback(() => {
    canvasRef.current?.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
    const hasErrorInCurrentStep = hasStepErrors(errors, currentFields);

    if (hasErrorInCurrentStep) {
      toast({ icon: 'error', title: "Please fill in all required fields in this step before proceeding." });
      currentFields.forEach((field: string) => setFieldTouched(field, true));
      return;
    }

    const step = visibleSteps[currentStep];
    if (step) setValidatedSections((previous) => ({
      ...previous, [step.id]: stepValueSignature(values, currentFields),
    }));

    if (isSaveStep) {
      if (Object.keys(errors).length > 0) {
        toast({ icon: 'error', title: "Please fill in all required fields before submitting." });
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
  }, [isSaveStep, currentStep, goToStep, submitForm, actions, validateForm, setFieldTouched, visibleSteps, values]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  }, [isFirstStep, currentStep, goToStep]);

  void breadcrumb; // breadcrumb intentionally not rendered (kept in API for callers)

  const save = async (callback?: () => void) => {
    const errors = await validateForm();
    if (Object.keys(errors).length) {
      Object.keys(errors).forEach((key) => setFieldTouched(key, true));
      toast({ icon: 'error', title: 'Please fill in all required fields before submitting.' });
      return;
    }
    if (callback) callback();
    else await submitForm();
  };

  return (
    <Box data-form-module={module} sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, pr: 6, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <AppIcon name={icon || moduleIcon || 'bi-building'} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: 18, fontWeight: 700 }}>{headerTitle}</Typography>
          {headerSub && <Box sx={{ fontSize: 13, color: 'text.secondary' }}>{headerSub}</Box>}
        </Box>
        {headerActions}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>
        <WizardSidebar sections={visibleSteps} currentStep={currentStep} onStepClick={goToStep} title={sidebarTitle} completedSections={completedSections} />
        <Box component="main" ref={canvasRef} sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: { xs: 1.5, sm: 2 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Step {currentStep + 1} of {visibleSteps.length}</Typography>
          <FormSection key={animKey} tone={TRIO.blue} icon={currentStepDef?.icon ?? 'abstract-26'} title={currentStepDef?.title ?? ''} desc={currentStepDef?.subtitle}>
            {currentStepDef?.render ? currentStepDef.render(stepProps as TStepProps) : StepComponent ? React.createElement(StepComponent as React.ComponentType<any>, stepProps || {}) : null}
          </FormSection>
        </Box>
        <Box component="aside" aria-label={summary.title} sx={{ display: { xs: 'none', lg: 'block' }, width: summaryCollapsed ? 44 : 260, flexShrink: 0, overflowY: 'auto', p: 1.5, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <WtIconButton title={summaryCollapsed ? 'Expand summary' : 'Collapse summary'} onClick={() => setSummaryCollapsed((previous) => !previous)}>
            {summaryCollapsed ? <ChevronLeft /> : <ChevronRight />}
          </WtIconButton>
          {!summaryCollapsed && <>
            <SummarySidebar title={summary.title} rows={summaryRows} warningMessage={summary.warningMessage} {...actions} hideSubmitButton />
            {isSaveStep && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {actions.exportPdf && <WtButton onClick={actions.exportPdf} startIcon={<PictureAsPdf />}>Export PDF</WtButton>}
              {actions.exportDocx && <WtButton onClick={actions.exportDocx} startIcon={<Description />}>Export DOCX</WtButton>}
            </Box>}
          </>}
        </Box>
      </Box>
      <GlassDialogActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, bgcolor: 'background.paper', '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <WtButton ghost onClick={requestClose} disabled={actions.isSubmitting}>Cancel</WtButton>
          {actions.onSaveDraft && <WtButton ghost onClick={actions.onSaveDraft} disabled={actions.isSubmitting || actions.isSavingDraft}>{actions.isSavingDraft ? 'Saving…' : 'Save Draft'}</WtButton>}
          {actions.onFinalSave && !isSaveStep && <WtButton tone="primary" onClick={() => save(actions.onFinalSave)} disabled={actions.isSubmitting || actions.submitDisabled}>{actions.isSubmitting ? 'Saving…' : actions.submitText || 'Save'}</WtButton>}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, ml: 'auto' }}>
          <WtButton ghost startIcon={<ChevronLeft />} onClick={handleBack} disabled={isFirstStep || actions.isSubmitting}>Back</WtButton>
          {isSaveStep
            ? actions.onFinalSave
              ? <WtButton tone="primary" onClick={() => save(actions.onFinalSave)} disabled={actions.isSubmitting || actions.submitDisabled}>{actions.isSubmitting ? 'Saving…' : actions.submitText || 'Save'}</WtButton>
              : actions.onSaveUpdate && actions.onSaveRevision
                ? <>
                  <WtButton onClick={() => save(actions.onSaveUpdate)} disabled={actions.isSubmitting || actions.submitDisabled}>Save as Update</WtButton>
                  <WtButton tone="primary" onClick={() => save(actions.onSaveRevision)} disabled={actions.isSubmitting || actions.submitDisabled}>Save as Revision</WtButton>
                </>
                : <WtButton tone="primary" onClick={() => save()} disabled={actions.isSubmitting || actions.submitDisabled}>{actions.isSubmitting ? 'Saving…' : actions.submitText || (actions.isEditMode ? 'Save Changes' : 'Create')}</WtButton>
            : <WtButton tone="primary" onClick={handleNext} disabled={actions.isSubmitting}>Save &amp; Continue</WtButton>}
        </Box>
      </GlassDialogActions>
      {unsavedChangesDialog}
    </Box>
  );
}

export default EnterpriseFormWizard;

import React, { useMemo, useState, useCallback, useEffect, useId, useRef } from "react";
import { Box, Typography } from '@mui/material';
import { getIn, useFormikContext } from "formik";
import { PictureAsPdf, Description, ChevronRight, ChevronLeft } from "@mui/icons-material";
import { EnterpriseWizardStep, WizardActionConfig, WizardReviewConfig, WizardSummaryConfig } from "../../types/formEngine.types";
import { SummarySidebar } from "../SummarySidebar/SummarySidebar";
import { WizardSidebar } from "../WizardSidebar/WizardSidebar";
import { GroupedWizard, type GroupedWizardProps } from './GroupedWizard';
import {
  firstErrorPath, firstErrorPathIn, firstErroredStepIndex, focusFieldOrError, hasFilledValue, hasStepErrors, stepValueSignature,
} from '../../utils/stepValidation';
import {
  DEFAULT_REVIEW_TITLE, REVIEW_ICON, REVIEW_STEP_ID, SR_ONLY_SX, WizardDraftStatusText, WizardReview, focusStepHeading,
  resolveDraftStatus, reviewStatusOf, type PendingStepFocus, type WizardReviewItem,
} from './WizardReview';
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
  /**
   * Optional final Review step, appended after the visible steps. The last step's
   * primary button becomes Save & Continue and the submit buttons move onto the review.
   */
  review?: WizardReviewConfig;
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
  review,
}: EnterpriseFormWizardProps<TValues, TStepProps>) {
  const { dirty, values, errors, submitForm, validateForm, setFieldTouched } = useFormikContext<TValues>();
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

  // The optional Review step is one extra position after the visible steps. It is
  // never a step to complete: the rail shows it, the progress count leaves it out.
  const hasReview = Boolean(review);
  const reviewTitle = review?.title ?? DEFAULT_REVIEW_TITLE;
  const totalSteps = visibleSteps.length + (hasReview ? 1 : 0);
  const isOnReview = hasReview && currentStep === visibleSteps.length;
  const isLastRealStep = currentStep === visibleSteps.length - 1;

  // With a review, it is the review that submits; the last real step only continues.
  const isLastStep = hasReview ? isOnReview : isLastRealStep;
  const isFirstStep = currentStep === 0;
  const currentStepDef = isOnReview ? undefined : visibleSteps[currentStep];
  const summaryRows = typeof summary.rows === "function" ? summary.rows(values, currentStepDef) : summary.rows;
  const isSaveStep = isLastStep || (!!currentStepDef?.isSubmitStep && !(hasReview && isLastRealStep));
  const StepComponent = currentStepDef?.component;
  // A host may drive the draft through `draftStatus` alone, without `isSavingDraft`.
  const draftStatus = resolveDraftStatus(actions.draftStatus, actions.isSavingDraft);
  const draftSaving = draftStatus === 'saving';

  const scrollCanvasTop = useCallback(() => {
    canvasRef.current?.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  const goToStep = useCallback((idx: number) => {
    if (idx >= 0 && idx < totalSteps && idx !== currentStep) {
      setCurrentStep(idx);
      setAnimKey((k) => k + 1);
      scrollCanvasTop();
      onStepChange?.(idx);
    }
  }, [currentStep, totalSteps, scrollCanvasTop, onStepChange]);

  /**
   * A field to focus once the step we just navigated to has rendered. Set before a
   * move and consumed by the effect below: focusing in the same tick would look for an
   * input the new step has not painted yet.
   */
  const pendingFocusRef = useRef<PendingStepFocus | null>(null);
  const stepHeadingId = useId();
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    window.requestAnimationFrame(() => {
      if (!focusFieldOrError(pending.path) && pending.heading) focusStepHeading(stepHeadingId);
    });
  }, [currentStep, stepHeadingId]);

  /** Submit-time failure: open the first visible step that owns an error and focus the field. */
  const routeToFirstError = useCallback((formErrors: any) => {
    const index = firstErroredStepIndex(formErrors, visibleSteps);
    const path = index === -1 ? firstErrorPath(formErrors) : firstErrorPathIn(formErrors, visibleSteps[index].fields);
    if (index !== -1 && index !== currentStep) {
      pendingFocusRef.current = { path };
      goToStep(index);
      return;
    }
    window.requestAnimationFrame(() => focusFieldOrError(path));
  }, [visibleSteps, currentStep, goToStep]);

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
        routeToFirstError(errors);
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
  }, [isSaveStep, currentStep, goToStep, submitForm, actions, validateForm, setFieldTouched, visibleSteps, values, routeToFirstError]);

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
      routeToFirstError(errors);
      return;
    }
    if (callback) callback();
    else await submitForm();
  };

  // The rail lists the Review step after the real ones; WizardSidebar leaves it out of the count.
  const railSteps = useMemo<EnterpriseWizardStep<any>[]>(() => (hasReview
    ? [...visibleSteps, { id: REVIEW_STEP_ID, label: reviewTitle, title: reviewTitle, fields: [], icon: REVIEW_ICON }]
    : visibleSteps), [hasReview, visibleSteps, reviewTitle]);

  // One card per visible step, in order, for the optional Review step.
  const reviewItems: WizardReviewItem[] = useMemo(() => {
    if (!review) return [];
    return visibleSteps.map((step) => {
      const required = step.requiredFields ?? [];
      return {
        id: step.id,
        title: step.title,
        tone: step.tone ?? TRIO.blue,
        icon: step.icon,
        status: reviewStatusOf({
          hasErrors: hasStepErrors(errors, step.fields),
          missingRequired: required.filter((f) => !hasFilledValue(getIn(values, f))).length,
          hasRequirement: required.length > 0,
          hasAnyValue: step.fields.some((f) => hasFilledValue(getIn(values, f))),
        }),
        rows: review.rows ? review.rows(step.id, values) : undefined,
      };
    });
  }, [review, visibleSteps, values, errors]);

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
        <WizardSidebar sections={railSteps} currentStep={currentStep} onStepClick={goToStep} title={sidebarTitle} completedSections={completedSections} uncountedIds={hasReview ? [REVIEW_STEP_ID] : undefined} />
        <Box component="main" ref={canvasRef} sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: { xs: 1.5, sm: 2 } }}>
          {isOnReview ? (
            <WizardReview
              title={reviewTitle}
              identity={review?.identity}
              items={reviewItems}
              onEdit={(id) => {
                const index = visibleSteps.findIndex((step) => step.id === id);
                // Land on the step's first error, else its heading — the Edit button
                // that had focus unmounts with the review.
                if (index !== -1 && index !== currentStep) {
                  pendingFocusRef.current = { path: firstErrorPathIn(errors, visibleSteps[index].fields), heading: true };
                }
                goToStep(index);
              }}
              disabled={actions.isSubmitting}
            />
          ) : <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Step {currentStep + 1} of {visibleSteps.length}</Typography>
            {/* The section card below shows the title; this is the one heading that names the step. */}
            <Typography component="h2" id={stepHeadingId} tabIndex={-1} sx={SR_ONLY_SX}>{currentStepDef?.title}</Typography>
            <FormSection key={animKey} tone={currentStepDef?.tone ?? TRIO.blue} icon={currentStepDef?.icon ?? 'abstract-26'} title={currentStepDef?.title ?? ''} desc={currentStepDef?.subtitle}>
              {currentStepDef?.render ? currentStepDef.render(stepProps as TStepProps) : StepComponent ? React.createElement(StepComponent as React.ComponentType<any>, stepProps || {}) : null}
            </FormSection>
          </>}
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
          {actions.onSaveDraft && <WtButton ghost onClick={actions.onSaveDraft} disabled={actions.isSubmitting || draftSaving}>{draftSaving ? 'Saving…' : 'Save Draft'}</WtButton>}
          {/* The draft button reads "Saving…" whenever draftSaving, so the line stays SR-only then. */}
          <WizardDraftStatusText status={draftStatus} quietWhileSaving={Boolean(actions.onSaveDraft)} />
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

import React from "react";
import { getIn, useFormikContext } from "formik";
import { EnterpriseWizardStep } from "../../types/formEngine.types";
import { Box, LinearProgress, Typography } from '@mui/material';
import { WtStepper } from "@app/modules/common/components/ui";

interface WizardSidebarProps {
  sections: EnterpriseWizardStep<any>[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  title?: string;
  completedSections?: Record<string, boolean>;
  /** Section ids shown in the rail but left out of the progress count (e.g. a Review step). */
  uncountedIds?: readonly string[];
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
  completedSections,
  uncountedIds,
}) => {
  const { values, errors, touched } = useFormikContext<any>();

  // Per-section status: completed | error | active | pending
  const getSectionStatus = (section: EnterpriseWizardStep<any>, sectionIndex: number) => {
    const hasError = section.fields.some((f) => getIn(errors, f) && getIn(touched, f));
    if (hasError) return "error";
    if (sectionIndex === currentStep) return "active";

    // A step is gated only by its REQUIRED fields. Optional blanks must never
    // hold a step at "pending" — that was why fully-handled steps stayed grey.
    const required = section.requiredFields ?? [];
    const requiredFilled = required.every((f) => hasValue(getIn(values, f)));
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
    if (completedSections) return Boolean(completedSections[section.id]) &&
      !section.fields.some((field) => getIn(errors, field));
    const status = getSectionStatus(section, index);
    if (status === "completed") return true;
    if (status !== "active") return false;
    const required = section.requiredFields ?? [];
    if (required.length > 0) return required.every((f) => hasValue(getIn(values, f)));
    return (section.fields || []).some((f) => hasValue(getIn(values, f)));
  };
  const isCounted = (section: EnterpriseWizardStep<any>) => !uncountedIds?.includes(section.id);
  const countedTotal = sections.filter(isCounted).length;
  const completedCount = sections.filter((s, index) => isCounted(s) && isDoneForProgress(s, index)).length;
  const progressPercent = countedTotal > 0 ? Math.round((completedCount / countedTotal) * 100) : 0;
  const completed = Object.fromEntries(
    sections.map((section, index) => [index, isDoneForProgress(section, index)]),
  );

  return (
    <Box component="nav" aria-label="Wizard step navigation" sx={{ width: { xs: '100%', md: 250 }, maxHeight: { xs: 180, md: 'none' }, flexShrink: 0, overflowY: 'auto', bgcolor: 'background.paper', borderRight: { md: '1px solid' }, borderBottom: { xs: '1px solid', md: 0 }, borderColor: 'divider', p: 1.5 }}>
      <Box role="status" aria-live="polite" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{completedCount} of {countedTotal} steps completed</Typography>
        <LinearProgress variant="determinate" value={progressPercent} sx={{ mt: 1, height: 4, borderRadius: 1 }} />
      </Box>
      <WtStepper
        steps={sections.map((section, index) => ({
          label: section.label,
          description: section.subtitle,
          error: getSectionStatus(section, index) === "error",
          errorText: "Fix the highlighted fields",
        }))}
        activeStep={currentStep}
        completed={completed}
        onStepClick={onStepClick}
        allowFutureNavigation
        orientation="vertical"
        sx={{ px: 1, '& .MuiStepLabel-root': { py: 0.5 } }}
      />
    </Box>
  );
};

export default WizardSidebar;

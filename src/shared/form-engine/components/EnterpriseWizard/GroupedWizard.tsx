import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress, LinearProgress, Typography } from '@mui/material';
import { getIn, useFormikContext } from "formik";
import {
  firstErrorPath, firstErrorPathIn, firstErroredStepIndex, focusFieldOrError, hasFilledValue as hasValue, hasStepErrors,
  stepValueSignature,
} from '@/shared/form-engine/utils/stepValidation';
import { toast } from "@app/modules/common/components/ui";
import { ChevronRight, ChevronLeft, ExpandMore } from "@mui/icons-material";

import { AppIcon, FormSection, GlassDialogActions, T, TRIO, WtButton, WtIconButton, WtStepper, type Trio } from '@app/modules/common/components/ui';
import type { WizardDraftStatus, WizardReviewConfig } from '../../types/formEngine.types';
import {
  DEFAULT_REVIEW_TITLE, REVIEW_STEP_ID, SR_ONLY_SX, WizardDraftStatusText, WizardReview, reviewStatusOf,
  type WizardReviewItem,
} from './WizardReview';

/** A leaf = one editable section, the unit the canvas renders and Continue walks. */
export interface WizardLeaf<TProps> {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  /** Accent tone for the section card and its review card. Defaults to TRIO.blue. */
  tone?: Trio;
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
  render: (props: TProps) => React.ReactNode;
}

/** A group = a parent node in the sidebar tree. Groups are never a page. */
export interface WizardGroup<TProps> {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: WizardLeaf<TProps>[];
}

export interface GroupedWizardProps<TProps> {
  groups: WizardGroup<TProps>[];
  sectionProps: TProps;
  headerTitle: string;
  headerSub?: React.ReactNode;
  /** Short label inside the progress card; defaults to the workflow title. */
  progressLabel?: string;
  isSubmitting: boolean;
  isEditMode: boolean;
  onCancel: () => void;
  onFinalSave: () => void;
  /**
   * Optional left-footer save (e.g. candidate draft). When omitted, the button
   * runs the same full validation + `onFinalSave` path Employee Onboarding uses.
   */
  onDirectSave?: () => void;
  /** Label for the left-footer save when `onDirectSave` is set. */
  directSaveLabel?: string;
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
  /**
   * Open on this leaf when present in `groups` (e.g. Pipeline Add → Role & screening).
   * Falls back to the first leaf when omitted or unknown.
   */
  initialLeafId?: string;
  /**
   * Optional final Review step, appended after the last leaf. The last leaf's primary
   * button becomes Continue and the submit button moves onto the review.
   */
  review?: WizardReviewConfig;
  /** Outcome of the last draft save, announced beside the left-footer save button. */
  draftStatus?: WizardDraftStatus;
  /** Compact identity (e.g. EntityIdentityHeader variant="compact") shown at the top of the rail. */
  identity?: React.ReactNode;
}

const ParentProgressBadge = ({ completed, total, active, complete, error, index }: {
  completed: number; total: number; active: boolean; complete: boolean; error: boolean; index: number;
}) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const color = error ? 'error.main' : complete ? 'success.main' : active ? 'primary.main' : 'text.secondary';

  return (
    <Box aria-hidden sx={{ position: 'relative', width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center', color }}>
      <CircularProgress variant="determinate" value={100} size={28} thickness={3} sx={{ position: 'absolute', color: 'divider' }} />
      <CircularProgress variant="determinate" value={percentage} size={28} thickness={3} sx={{ position: 'absolute', color, '@media (prefers-reduced-motion: reduce)': { '& .MuiCircularProgress-circle': { transition: 'none' } } }} />
      <Box component="span" sx={{ fontSize: 12, fontWeight: 600, display: 'flex' }}>
        {complete ? <AppIcon name="bi-check-lg" /> : index}
      </Box>
    </Box>
  );
};

type LeafStatus = "completed" | "active" | "error" | "pending";

export function GroupedWizard<TProps>({
  groups,
  sectionProps,
  headerTitle,
  progressLabel,
  isSubmitting,
  isEditMode,
  onCancel,
  onFinalSave,
  onDirectSave,
  directSaveLabel,
  submitText,
  defaultValues,
  summaryTitle = "Summary",
  summaryRows,
  initialLeafId,
  review,
  draftStatus,
  identity,
}: GroupedWizardProps<TProps>) {
  const { values, errors, touched, validateForm, setFieldTouched } = useFormikContext<any>();
  const canvasRef = useRef<HTMLElement>(null);
  const [validatedSections, setValidatedSections] = useState<Record<string, string>>({});

  // Flattened leaf order — the linear path Back/Continue walk, independent of
  // which groups happen to be expanded.
  const leaves = useMemo(() => groups.flatMap((g) => g.children), [groups]);

  const [activeLeafId, setActiveLeafId] = useState(() => {
    if (initialLeafId && leaves.some((l) => l.id === initialLeafId)) return initialLeafId;
    return leaves[0]?.id ?? "";
  });

  // The optional Review step sits after the last leaf. It is a position on the
  // Back/Continue path, never a leaf: progress, groups and statuses ignore it.
  const hasReview = Boolean(review);
  const reviewTitle = review?.title ?? DEFAULT_REVIEW_TITLE;
  const isOnReview = hasReview && activeLeafId === REVIEW_STEP_ID;
  const navIds = useMemo(
    () => (hasReview ? [...leaves.map((l) => l.id), REVIEW_STEP_ID] : leaves.map((l) => l.id)),
    [leaves, hasReview],
  );

  const activeIndex = isOnReview ? leaves.length : Math.max(
    0,
    leaves.findIndex((l) => l.id === activeLeafId)
  );
  const activeLeaf = isOnReview ? undefined : leaves[activeIndex];
  const activeGroup = groups.find((g) => g.children.some((c) => c.id === activeLeaf?.id));

  const isFirst = activeIndex === 0;
  // The submit position: the Review step when there is one, else the last leaf.
  const isLast = hasReview ? isOnReview : activeIndex === leaves.length - 1;

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
    canvasRef.current?.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  /**
   * Is this section's data actually there? Pure data question — no notion of where
   * the user is standing, which is what the progress figure needs. `leafStatus`
   * below layers the visual states (active / error) on top of this.
   */
  const isLeafFilled = useCallback(
    (leaf: WizardLeaf<TProps>): boolean => {
      if (leaf.isComplete) return leaf.isComplete(values);
      const required = leaf.requiredFields ?? [];
      if (required.length > 0) return required.every((f) => hasValue(getIn(values, f)));
      return validatedSections[leaf.id] === stepValueSignature(values, leaf.fields) &&
        !hasStepErrors(errors, leaf.fields);

    },
    [values, errors, validatedSections]
  );

  const leafStatus = useCallback(
    (leaf: WizardLeaf<TProps>): LeafStatus => {
      const hasError = leaf.fields.some(
        (f) => getIn(errors, f) && getIn(touched, f)
      );
      if (hasError) return "error";
      if (leaf.id === activeLeafId) return "active";

      // Optional sections count only after a successful validation of their current values.
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
    (leaf: WizardLeaf<TProps>) => {
      if (leaf.isComplete) return !leaf.isComplete(values);
      const required = leaf.requiredFields ?? [];
      return required.length > 0 && !required.every((f) => hasValue(getIn(values, f)));
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

  /**
   * A field to focus once the section we just navigated to has rendered. Set before
   * a move and consumed by the effect below: focusing in the same tick would look for
   * an input the new section has not painted yet.
   */
  const pendingFocusRef = useRef<{ path: string | null } | null>(null);
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    window.requestAnimationFrame(() => focusFieldOrError(pending.path));
  }, [activeLeafId]);

  /**
   * Submit-time failure: land on the first section (in rail order) that owns an
   * error and focus the offending field, instead of leaving the user on the last
   * section with a toast about a field they cannot see.
   */
  const routeToFirstError = useCallback(
    (formErrors: any) => {
      const index = firstErroredStepIndex(formErrors, leaves);
      const target = index === -1 ? undefined : leaves[index];
      const path = target ? firstErrorPathIn(formErrors, target.fields) : firstErrorPath(formErrors);
      if (target && target.id !== activeLeafId) {
        pendingFocusRef.current = { path };
        goToLeaf(target.id);
        return;
      }
      window.requestAnimationFrame(() => focusFieldOrError(path));
    },
    [leaves, activeLeafId, goToLeaf]
  );

  const handleDirectSave = async () => {
    const formErrors = await validateForm();
    if (Object.keys(formErrors).length > 0) {
      toast({ icon: 'error', title: "Please fill in all required fields before submitting." });
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
      toast({ icon: 'warning', title: `Complete the required fields in "${blocker.label}" first.` });
      goToLeaf(blocker.id);
    },
    [activeIndex, goToLeaf, leaves, isBlocking]
  );

  const handleBack = () => {
    if (isFirst) return;
    goToLeaf(navIds[activeIndex - 1]);
  };

  const handleNext = async () => {
    const formErrors = await validateForm();
    const ownFields = activeLeaf?.fields ?? [];

    // Block only on errors belonging to the section on screen. Errors further
    // along the form are none of this section's business.
    const blocked = hasStepErrors(formErrors, ownFields);

    // The same gate the sidebar uses, so both ways forward agree on what "required"
    // means. Leaning on Yup alone left two holes: a structural requirement with no rule
    // to trip (`approvalChains` is a plain object the schema says nothing about), and a
    // field the rail stars while the schema calls optional — Continue walked straight
    // past both, then the sidebar refused to jump back over the section it had just
    // allowed. `requiredFields` now blocks here exactly as it does there.
    const incomplete = activeLeaf ? isBlocking(activeLeaf) : false;

    if (blocked || incomplete) {
      ownFields.forEach((f) => setFieldTouched(f, true));
      toast({ icon: 'error', title: "Please complete the required fields in this section before continuing." });

      // Then take them to it. Touching the fields above is what renders the inline
      // errors, so this runs on the next frame — the element to scroll to does not
      // exist until React has painted them.
      const offending = ownFields
        .map((field) => firstErrorPath(getIn(formErrors, field), field))
        .find(Boolean) ?? null;
      window.requestAnimationFrame(() => focusFieldOrError(offending));
      return;
    }

    if (activeLeaf) setValidatedSections((previous) => ({
      ...previous, [activeLeaf.id]: stepValueSignature(values, ownFields),
    }));

    if (isLast) {
      if (Object.keys(formErrors).length > 0) {
      toast({ icon: 'error', title: "Please fill in all required fields before submitting." });
        Object.keys(formErrors).forEach((k) => setFieldTouched(k, true));
        routeToFirstError(formErrors);
        return;
      }
      onFinalSave();
      return;
    }

    goToLeaf(navIds[activeIndex + 1]);
  };

  // One card per real leaf, in rail order, for the optional Review step.
  const reviewItems: WizardReviewItem[] = useMemo(() => {
    if (!review) return [];
    return leaves.map((leaf) => {
      const required = leaf.requiredFields ?? [];
      const missingRequired = leaf.isComplete ? 0 : required.filter((f) => !hasValue(getIn(values, f))).length;
      return {
        id: leaf.id,
        title: leaf.title,
        tone: leaf.tone ?? TRIO.blue,
        icon: leaf.icon,
        status: reviewStatusOf({
          hasErrors: hasStepErrors(errors, leaf.fields),
          missingRequired,
          structuralIncomplete: leaf.isComplete ? !leaf.isComplete(values) : false,
          hasRequirement: Boolean(leaf.isComplete) || required.length > 0,
          hasAnyValue: leaf.fields.some((f) => hasValue(getIn(values, f))),
        }),
        rows: review.rows ? review.rows(leaf.id, values) : undefined,
      };
    });
  }, [review, leaves, values, errors]);

  const rows = summaryRows ? summaryRows(values) : [];

  return (
    <Box data-form-module="sections" sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
      <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <WtButton ghost onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-controls="wizard-section-navigation" endIcon={<ExpandMore />}>
          {isOnReview ? reviewTitle : <>{activeGroup?.label} · {activeIndex + 1} of {leaves.length}</>}
        </WtButton>
        <Typography variant="body2" sx={{ ml: 'auto' }}>{progressPct}%</Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <Box component="nav" id="wizard-section-navigation" aria-label="Wizard sections" sx={{
          display: { xs: mobileNavOpen ? 'block' : 'none', md: 'block' },
          position: { xs: 'absolute', md: 'relative' }, inset: { xs: 0, md: 'auto' },
          zIndex: 2, width: { xs: '100%', md: 250 }, flexShrink: 0, overflowY: 'auto',
          p: 1.5, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider',
        }}>
          {identity != null && <Box sx={{ mb: 1.5, minWidth: 0 }}>{identity}</Box>}
          <Box role="status" sx={{
            position: 'relative', overflow: 'hidden', mb: 2, p: 1.75, borderRadius: 1.5,
            background: T.color.brandGradientLeftToRight, color: T.color.onBrand,
            '&::before': { content: '""', position: 'absolute', width: 96, height: 96, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.07)', top: -44, right: -26 },
            '&::after': { content: '""', position: 'absolute', width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.05)', bottom: -42, left: -22 },
          }}>
            <Typography sx={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .78 }}>{progressLabel ?? headerTitle}</Typography>
            <Typography sx={{ position: 'relative', zIndex: 1, fontSize: 28, lineHeight: 1.15, fontWeight: 750, mt: .25 }}>{progressPct}%</Typography>
            <Typography sx={{ position: 'relative', zIndex: 1, fontSize: 11, opacity: .76, mb: 1.25 }}>{completedCount} of {leaves.length} sections completed</Typography>
            <LinearProgress variant="determinate" value={progressPct} sx={{
              position: 'relative', zIndex: 1, height: 4, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,.22)', '& .MuiLinearProgress-bar': { bgcolor: T.color.onBrand },
            }} />
          </Box>
          {groups.map((group, groupIndex) => {
            const expanded = isGroupExpanded(group.id);
            const groupCompleted = group.children.filter((leaf) => isLeafFilled(leaf)).length;
            const groupHasError = group.children.some((leaf) => statuses[leaves.findIndex((item) => item.id === leaf.id)] === 'error');
            const groupActive = group.id === activeGroup?.id;
            return (
              <Box key={group.id} sx={{ mb: 1 }}>
                <WtButton ghost fullWidth onClick={() => setManualExpanded((previous) => ({ ...previous, [group.id]: !expanded }))}
                  aria-expanded={expanded} startIcon={<ParentProgressBadge completed={groupCompleted} total={group.children.length} active={groupActive} complete={groupCompleted === group.children.length} error={groupHasError} index={groupIndex + 1} />}
                  endIcon={<ExpandMore sx={{ transform: expanded ? 'rotate(180deg)' : undefined }} />}
                  sx={{
                    justifyContent: 'flex-start', minHeight: 44, textAlign: 'left', borderRadius: 1.25,
                    bgcolor: groupActive ? 'background.paper' : 'transparent',
                    border: '1px solid', borderColor: groupActive ? 'divider' : 'transparent',
                    boxShadow: groupActive ? 1 : 'none',
                  }}>
                  {group.icon != null && group.icon !== false && (
                    <Box component="span" aria-hidden data-group-icon sx={{
                      display: 'inline-flex', alignItems: 'center', flexShrink: 0, mr: .75,
                      color: groupActive ? 'primary.main' : 'text.secondary', '& svg': { fontSize: 18 },
                    }}>
                      {typeof group.icon === 'string' ? <AppIcon name={group.icon} fallbackSize={16} /> : group.icon}
                    </Box>
                  )}
                  <Box component="span" sx={{ flex: 1 }}>{group.label}</Box>
                  <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>{groupCompleted}/{group.children.length}</Box>
                </WtButton>
                {expanded && <WtStepper
                  orientation="vertical" variant="timeline" allowFutureNavigation
                  steps={group.children.map((leaf) => ({
                    label: leaf.label,
                    optional: !leaf.requiredFields?.length && !leaf.isComplete,
                    error: statuses[leaves.findIndex((item) => item.id === leaf.id)] === 'error',
                    errorText: 'Check this section',
                  }))}
                  activeStep={group.children.findIndex((leaf) => leaf.id === activeLeaf?.id)}
                  completed={Object.fromEntries(group.children.map((leaf, index) => [index, isLeafFilled(leaf)]))}
                  onStepClick={(index) => {
                    const leaf = group.children[index];
                    handleSidebarClick(leaf.id, leaves.findIndex((item) => item.id === leaf.id));
                  }}
                  sx={{ pl: 1, py: 1 }}
                />}
              </Box>
            );
          })}
          {hasReview && (
            <WtButton ghost fullWidth onClick={() => handleSidebarClick(REVIEW_STEP_ID, leaves.length)}
              aria-current={isOnReview ? 'step' : undefined}
              startIcon={<AppIcon name="eye" fallbackSize={16} />}
              sx={{
                justifyContent: 'flex-start', minHeight: 44, textAlign: 'left', borderRadius: 1.25,
                bgcolor: isOnReview ? 'background.paper' : 'transparent',
                border: '1px solid', borderColor: isOnReview ? 'divider' : 'transparent',
                boxShadow: isOnReview ? 1 : 'none',
              }}>
              <Box component="span" sx={{ flex: 1 }}>{reviewTitle}</Box>
            </WtButton>
          )}
        </Box>
        <Box component="main" ref={canvasRef} aria-label={isOnReview ? reviewTitle : activeLeaf?.title} sx={{ flex: 1, minWidth: 0, overflowY: 'auto', bgcolor: 'background.default' }}>
          <Box sx={{ position: 'sticky', top: 0, zIndex: 2, px: { xs: 1.5, sm: 2.5 }, py: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', borderRadius: 10, px: 1, py: .25, bgcolor: T.color.brandSoft, color: T.color.brand, border: '1px solid', borderColor: T.color.line, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                {isOnReview ? reviewTitle : <>{activeGroup?.label} · {activeIndex + 1} of {leaves.length}</>}
              </Box>
              {(activeLeaf?.requiredFields?.length || activeLeaf?.isComplete) && (
                <Typography variant="caption" color="text.secondary"><Box component="span" sx={{ color: 'error.main' }}>*</Box> Required fields</Typography>
              )}
            </Box>
            {/* The section card below shows the title; this is the one heading that names the step. */}
            {!isOnReview && <Typography component="h2" sx={SR_ONLY_SX}>{activeLeaf?.title}</Typography>}
          </Box>
          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {isOnReview ? (
              <WizardReview
                title={reviewTitle}
                identity={review?.identity}
                items={reviewItems}
                onEdit={(id) => goToLeaf(id)}
                disabled={isSubmitting}
              />
            ) : (
              <FormSection accentTop key={activeLeaf?.id} tone={activeLeaf?.tone ?? TRIO.blue} icon={activeLeaf?.icon ?? 'abstract-26'} title={activeLeaf?.title ?? ''} desc={activeLeaf?.subtitle}>
                {activeLeaf?.render(sectionProps)}
              </FormSection>
            )}
          </Box>
        </Box>
        {rows.length > 0 && <Box component="aside" aria-label={summaryTitle} sx={{
          width: summaryCollapsed ? 44 : 260, flexShrink: 0, display: { xs: 'none', lg: 'block' },
          overflowY: 'auto', bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider', p: summaryCollapsed ? 0.5 : 1.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {!summaryCollapsed && <Typography sx={{ fontWeight: 600, flex: 1 }}>{summaryTitle}</Typography>}
            <WtIconButton title={summaryCollapsed ? 'Expand summary' : 'Collapse summary'} onClick={() => setSummaryCollapsed((value) => !value)}>
              {summaryCollapsed ? <ChevronLeft /> : <ChevronRight />}
            </WtIconButton>
          </Box>
          {!summaryCollapsed && rows.map((row, index) => <Box key={row.label + index} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">{row.label}</Typography>
            <Box sx={{ fontSize: 13, fontWeight: row.isStrong ? 700 : 400, overflowWrap: 'anywhere' }}>{row.value}</Box>
          </Box>)}
        </Box>}
      </Box>
      <GlassDialogActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', bgcolor: 'background.paper', gap: 1, px: { xs: 1.5, sm: 2 }, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <WtButton ghost onClick={onCancel} disabled={isSubmitting}>Cancel</WtButton>
          <WtButton tone="primary" onClick={() => onDirectSave ? onDirectSave() : handleDirectSave()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : onDirectSave ? directSaveLabel ?? 'Save draft' : isEditMode ? 'Save Changes' : 'Save'}
          </WtButton>
          <WizardDraftStatusText status={draftStatus ?? 'idle'} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <WtButton ghost startIcon={<ChevronLeft />} onClick={handleBack} disabled={isFirst || isSubmitting}>Back</WtButton>
          <WtButton tone="primary" endIcon={<ChevronRight />} onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isLast ? submitText : 'Save & Continue'}
          </WtButton>
        </Box>
      </GlassDialogActions>
    </Box>
  );
}

export default GroupedWizard;

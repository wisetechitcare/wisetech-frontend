import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Box, ButtonBase, LinearProgress, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { LEGACY_CONFIG_FONT } from '@app/theme/tokens';
import { getIn, useFormikContext } from "formik";
import {
  firstErrorPath, firstErrorPathIn, firstErroredStepIndex, focusFieldOrError, hasFilledValue as hasValue, hasStepErrors,
  stepValueSignature,
} from '@/shared/form-engine/utils/stepValidation';
import { toast } from "@app/modules/common/components/ui";
import { Check, ChevronRight, ChevronLeft, ExpandMore } from "@mui/icons-material";

import { FormSection, GlassDialogActions, HEADING_CASE_SX, T, TRIO, WtButton, WtIconButton, type Trio } from '@app/modules/common/components/ui';
import type { WizardDraftStatus, WizardReviewConfig } from '../../types/formEngine.types';
import {
  DEFAULT_REVIEW_TITLE, REVIEW_STEP_ID, WizardDraftStatusText, WizardReview, focusStepHeading, reviewStatusOf,
  type PendingStepFocus, type WizardReviewItem,
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
  /** @deprecated No longer rendered; the rail shows a numbered badge. */
  icon?: React.ReactNode;
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

type LeafStatus = "completed" | "active" | "error" | "pending";
type RailState = "current" | "complete" | "error" | "pending";

/*
 * Rail geometry — the production steps rail (WizardSidebar): 12px row padding and a
 * 28px badge put every badge centre 26px in. The leaf connector and leaf dots are
 * centred on that same x; the leaf list's line reaches up under the group badge and
 * the connector below it continues flush, so one line runs from a group badge through
 * its sections and on to the next group.
 */
const RAIL_ROW_PX = 12;
const RAIL_BADGE = 28;
const RAIL_AXIS = RAIL_ROW_PX + RAIL_BADGE / 2;
const RAIL_LINE = 2;
const LEAF_DOT = 10;
/** Leaf rows start this far in, so the current row's tint sits clear of the rail edge. */
const LEAF_ROW_INSET = RAIL_ROW_PX;

const railLineColor = (theme: Theme) => alpha(theme.palette.text.primary, 0.12);
const pendingRingColor = (theme: Theme) => alpha(theme.palette.text.primary, 0.22);
const railFill = (theme: Theme, state: RailState) =>
  state === "current" ? theme.palette.primary : state === "complete" ? theme.palette.success : state === "error" ? theme.palette.error : null;

/** Numbered rail badge: filled brand when current, green check when complete, outlined when pending. */
const RailBadge = ({ state, children }: { state: RailState; children: React.ReactNode }) => (
  <Box component="span" aria-hidden sx={(theme) => {
    const fill = railFill(theme, state);
    return {
      position: 'relative', zIndex: 1, // paints over the leaf line that tucks under it
      width: RAIL_BADGE, height: RAIL_BADGE, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box',
      display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 700, lineHeight: 1,
      border: `2px solid ${fill ? fill.main : pendingRingColor(theme)}`,
      bgcolor: fill ? fill.main : 'background.paper',
      color: fill ? fill.contrastText : 'text.secondary',
      boxShadow: state === 'current' ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.14)}` : 'none',
      transition: 'background-color .15s, border-color .15s, box-shadow .15s',
      '& svg': { fontSize: 14 },
    };
  }}>
    {children}
  </Box>
);

/** Connector between two rail rows, under the badge centre. Green once the row above is complete. */
const RailConnector = ({ complete, flush = false }: { complete: boolean; flush?: boolean }) => (
  <Box aria-hidden sx={(theme) => ({
    width: RAIL_LINE, height: 10, my: flush ? 0 : '2px', ml: `${RAIL_AXIS - RAIL_LINE / 2}px`, borderRadius: 1,
    bgcolor: complete ? theme.palette.success.main : railLineColor(theme),
  })} />
);

/** A group / Review row: badge + one-line label, soft brand tint while current. */
const railRowSx = (current: boolean) => (theme: Theme) => ({
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.25,
  px: `${RAIL_ROW_PX - 1}px`, py: '9px', minHeight: 48, borderRadius: '8px', textAlign: 'left',
  border: '1px solid', borderColor: current ? alpha(theme.palette.primary.main, 0.18) : 'transparent',
  bgcolor: current ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.07) : 'transparent',
  transition: 'background-color .15s, border-color .15s',
  '&:hover': current ? {} : { bgcolor: 'action.hover', borderColor: 'divider' },
  '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
});

const railLabelSx = (current: boolean) => ({
  flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.3, fontWeight: current ? 700 : 600,
  color: current ? 'primary.main' : 'text.secondary',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
});

/** The summary's collapse toggle: a small ghost square (32px), not the 44px tinted tile. */
const summaryToggleSx = {
  width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
  bgcolor: 'transparent', borderColor: 'divider', color: 'text.secondary', '& svg': { fontSize: 18 },
  // Stay ghost on hover/press: the kit tile's tinted fill, glow and lift are not wanted here.
  '&:hover': { bgcolor: 'action.hover', borderColor: 'divider', boxShadow: 'none', transform: 'none' },
  '&:active': { transform: 'none' },
} as const;

const hasSummaryValue =(value: React.ReactNode) => value !== undefined && value !== null && value !== '' && value !== false;

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
  const pendingFocusRef = useRef<PendingStepFocus | null>(null);
  const stepHeadingId = useId();
  const railId = useId();
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    window.requestAnimationFrame(() => {
      if (!focusFieldOrError(pending.path) && pending.heading) focusStepHeading(stepHeadingId);
    });
  }, [activeLeafId, stepHeadingId]);

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
      // The same requirement gate Continue and the rail use. Submitting from the Review
      // step (or past a section left mid-edit) must not skip what its own cards report.
      const blocker = leaves.find(isBlocking);
      if (blocker) {
        toast({ icon: 'error', title: `Complete the required fields in "${blocker.label}" first.` });
        blocker.fields.forEach((f) => setFieldTouched(f, true));
        if (blocker.id !== activeLeafId) {
          pendingFocusRef.current = { path: null, heading: true };
          goToLeaf(blocker.id);
        }
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
  const leafIndexOf = (id: string) => leaves.findIndex((item) => item.id === id);
  const stepTitle = isOnReview ? reviewTitle : activeLeaf?.title;
  const stepSubtitle = isOnReview ? undefined : activeLeaf?.subtitle;
  const positionText = isOnReview ? 'Final step' : <>{activeGroup?.label} · {activeIndex + 1} of {leaves.length}</>;

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
          zIndex: 2, width: { xs: '100%', md: 250 }, flexShrink: 0, overflowY: 'auto', overflowX: 'hidden',
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
          <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {groups.map((group, groupIndex) => {
              const expanded = isGroupExpanded(group.id);
              const groupCompleted = group.children.filter((leaf) => isLeafFilled(leaf)).length;
              const groupComplete = group.children.length > 0 && groupCompleted === group.children.length;
              const groupHasError = group.children.some((leaf) => statuses[leafIndexOf(leaf.id)] === 'error');
              const groupActive = group.id === activeGroup?.id;
              const groupState: RailState = groupHasError ? 'error' : groupActive ? 'current' : groupComplete ? 'complete' : 'pending';
              const listId = `${railId}-group-${group.id}`;
              const hasNext = groupIndex < groups.length - 1 || hasReview;
              return (
                <Box component="li" key={group.id}>
                  <ButtonBase onClick={() => setManualExpanded((previous) => ({ ...previous, [group.id]: !expanded }))}
                    aria-expanded={expanded} aria-controls={expanded ? listId : undefined} sx={railRowSx(groupActive && !expanded)}>
                    <RailBadge state={groupState}>
                      {groupState === 'complete' ? <Check /> : groupState === 'error' ? '!' : groupIndex + 1}
                    </RailBadge>
                    <Box component="span" title={group.label} sx={railLabelSx(groupActive)}>{group.label}</Box>
                    <Box component="span" sx={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: 'text.secondary' }}>
                      {groupCompleted}/{group.children.length}
                    </Box>
                    <ExpandMore aria-hidden sx={{
                      flexShrink: 0, fontSize: 18, color: 'text.secondary', ml: -.5,
                      transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform .15s',
                    }} />
                  </ButtonBase>
                  {expanded && (
                    <Box component="ul" id={listId} sx={(theme) => ({
                      listStyle: 'none', m: 0, mt: '2px', p: 0, py: .5, position: 'relative',
                      // One continuous connector under the group badge; the dots sit on it.
                      '&::before': {
                        content: '""', position: 'absolute', top: -(RAIL_ROW_PX + 2), bottom: 0, width: RAIL_LINE, borderRadius: 1,
                        left: RAIL_AXIS - RAIL_LINE / 2, bgcolor: groupComplete ? theme.palette.success.main : railLineColor(theme),
                      },
                    })}>
                      {group.children.map((leaf) => {
                        const leafIndex = leafIndexOf(leaf.id);
                        const status = statuses[leafIndex];
                        const current = leaf.id === activeLeaf?.id;
                        const filled = isLeafFilled(leaf);
                        const dotState: RailState = status === 'error' ? 'error' : current ? 'current' : filled ? 'complete' : 'pending';
                        const errorId = `${railId}-error-${leaf.id}`;
                        return (
                          <Box component="li" key={leaf.id}>
                            <ButtonBase
                              onClick={() => handleSidebarClick(leaf.id, leafIndex)}
                              aria-label={leaf.label}
                              aria-current={current ? 'step' : undefined}
                              aria-describedby={status === 'error' ? errorId : undefined}
                              sx={(theme) => ({
                                width: `calc(100% - ${LEAF_ROW_INSET}px)`, ml: `${LEAF_ROW_INSET}px`,
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left',
                                minHeight: 34, py: .5, pr: 1, pl: `${RAIL_AXIS - LEAF_DOT / 2 - LEAF_ROW_INSET}px`,
                                borderRadius: '8px',
                                bgcolor: current ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08) : 'transparent',
                                transition: 'background-color .15s',
                                '&:hover': current ? {} : { bgcolor: 'action.hover' },
                                '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
                              })}
                            >
                              <Box component="span" aria-hidden sx={(theme) => {
                                const fill = railFill(theme, dotState);
                                return {
                                  position: 'relative', zIndex: 1, flexShrink: 0, boxSizing: 'border-box',
                                  width: LEAF_DOT, height: LEAF_DOT, borderRadius: '50%', mr: 1.25,
                                  bgcolor: fill ? fill.main : 'background.paper',
                                  border: `2px solid ${fill ? fill.main : pendingRingColor(theme)}`,
                                  boxShadow: dotState === 'current' ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
                                };
                              }} />
                              <Box component="span" sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Box component="span" title={leaf.label} sx={{
                                  fontSize: 12.5, lineHeight: 1.35, fontWeight: current ? 700 : 500,
                                  color: current ? 'primary.main' : 'text.secondary',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {leaf.label}
                                </Box>
                                {status === 'error' && (
                                  <Box component="span" id={errorId} sx={{ fontSize: 11, lineHeight: 1.3, fontWeight: 600, color: 'error.main' }}>
                                    Check this section
                                  </Box>
                                )}
                              </Box>
                            </ButtonBase>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                  {hasNext && <RailConnector complete={groupComplete} flush={expanded} />}
                </Box>
              );
            })}
            {hasReview && (
              <Box component="li">
                <ButtonBase onClick={() => handleSidebarClick(REVIEW_STEP_ID, leaves.length)}
                  aria-current={isOnReview ? 'step' : undefined} sx={railRowSx(isOnReview)}>
                  <RailBadge state={isOnReview ? 'current' : 'pending'}>{groups.length + 1}</RailBadge>
                  <Box component="span" title={reviewTitle} sx={railLabelSx(isOnReview)}>{reviewTitle}</Box>
                </ButtonBase>
              </Box>
            )}
          </Box>
        </Box>
        <Box component="main" ref={canvasRef} aria-label={stepTitle} sx={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', bgcolor: 'background.default' }}>
          <Box sx={{
            position: 'sticky', top: 0, zIndex: 2, px: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 2.5 }, pb: 2,
            bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
              <Box component="span" sx={(theme) => ({
                display: 'inline-block', minWidth: 0, maxWidth: '100%', px: 1.5, py: '3px', borderRadius: 999,
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08),
                border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.18), color: 'primary.main',
                fontSize: 11, lineHeight: 1.4, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              })}>
                {positionText}
              </Box>
              {(activeLeaf?.requiredFields?.length || activeLeaf?.isComplete) && (
                <Typography component="span" sx={{ flexShrink: 0, fontSize: 11, fontWeight: 500, color: 'text.secondary' }}>
                  <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>*</Box> Required fields
                </Typography>
              )}
            </Box>
            {/* The one heading that names the step; the card below carries no title of its own. */}
            <Typography component="h2" id={stepHeadingId} tabIndex={-1} sx={{
              m: 0, fontFamily: LEGACY_CONFIG_FONT.heading, fontSize: { xs: 18.4, md: 22 }, fontWeight: 700, lineHeight: 1.2,
              letterSpacing: '-0.3px', color: 'text.primary', overflowWrap: 'anywhere', '&:focus': { outline: 'none' },
            }}>
              {stepTitle}
            </Typography>
            {stepSubtitle && (
              <Typography sx={{ mt: .25, mb: 0, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'text.secondary' }}>
                {stepSubtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2, sm: 3.5 } }}>
            {isOnReview ? (
              <WizardReview
                hideHeading
                title={reviewTitle}
                identity={review?.identity}
                items={reviewItems}
                onEdit={(id) => {
                  const leaf = leaves.find((item) => item.id === id);
                  // Land on the section's first error, else its heading — the Edit button
                  // that had focus unmounts with the review.
                  if (leaf) pendingFocusRef.current = { path: firstErrorPathIn(errors, leaf.fields), heading: true };
                  goToLeaf(id);
                }}
                disabled={isSubmitting}
              />
            ) : (
              <FormSection hideHead key={activeLeaf?.id} tone={activeLeaf?.tone ?? TRIO.blue} icon={activeLeaf?.icon ?? 'abstract-26'}
                title={activeLeaf?.title ?? ''} sx={{ p: { xs: 2, sm: 3 } }}>
                {activeLeaf?.render(sectionProps)}
              </FormSection>
            )}
          </Box>
        </Box>
        {rows.length > 0 && <Box component="aside" aria-label={summaryTitle} sx={{
          width: summaryCollapsed ? 40 : 260, flexShrink: 0, display: { xs: 'none', lg: 'flex' }, flexDirection: 'column',
          overflowY: 'auto', overflowX: 'hidden', bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider',
          transition: 'width .25s ease',
        }}>
          {summaryCollapsed ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, pt: 1.5 }}>
              <WtIconButton title="Expand summary" onClick={() => setSummaryCollapsed(false)} sx={summaryToggleSx}>
                <ChevronLeft />
              </WtIconButton>
              <Box component="span" aria-hidden sx={{
                writingMode: 'vertical-rl', transform: 'rotate(180deg)', userSelect: 'none',
                fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary',
              }}>
                {summaryTitle}
              </Box>
            </Box>
          ) : (
            <Box sx={{ px: 2, pt: 1, pb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1, mb: .5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ ...HEADING_CASE_SX, flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, letterSpacing: '.06em', color: 'text.primary' }}>
                  {summaryTitle}
                </Typography>
                <WtIconButton title="Collapse summary" onClick={() => setSummaryCollapsed(true)} sx={summaryToggleSx}>
                  <ChevronRight />
                </WtIconButton>
              </Box>
              <Box component="dl" sx={{ m: 0 }}>
                {rows.map((row, index) => (
                  <Box key={row.label + index} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, py: 1,
                    borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' },
                  }}>
                    <Box component="dt" sx={{ m: 0, minWidth: 0, fontSize: 12, lineHeight: 1.4, fontWeight: 500, color: 'text.secondary', overflowWrap: 'anywhere' }}>
                      {row.label}
                    </Box>
                    <Box component="dd" sx={{
                      m: 0, minWidth: 0, maxWidth: '62%', flexShrink: 0, textAlign: 'right', overflowWrap: 'anywhere',
                      fontSize: 12, lineHeight: 1.4, fontWeight: row.isStrong ? 700 : 500, color: 'text.primary',
                    }}>
                      {hasSummaryValue(row.value) ? row.value : <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>—</Box>}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>}
      </Box>
      <GlassDialogActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', bgcolor: 'background.paper', gap: 1, px: { xs: 1.5, sm: 2 }, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <WtButton ghost onClick={onCancel} disabled={isSubmitting}>Cancel</WtButton>
          {/* Secondary save — outlined, so the footer has exactly one filled primary action. */}
          <WtButton inverted onClick={() => onDirectSave ? onDirectSave() : handleDirectSave()} disabled={isSubmitting}
            sx={(theme) => (theme.palette.mode === 'dark' ? {} : { borderColor: alpha(theme.palette.primary.main, 0.45), boxShadow: 'none' })}>
            {isSubmitting ? 'Saving…' : onDirectSave ? directSaveLabel ?? 'Save draft' : isEditMode ? 'Save Changes' : 'Save'}
          </WtButton>
          <WizardDraftStatusText status={draftStatus ?? 'idle'} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flex: '1 1 auto', justifyContent: 'flex-end' }}>
          <WtButton ghost startIcon={<ChevronLeft />} onClick={handleBack} disabled={isFirst || isSubmitting}>Back</WtButton>
          <WtButton endIcon={<ChevronRight />} onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isLast ? submitText : 'Save & Continue'}
          </WtButton>
        </Box>
      </GlassDialogActions>
    </Box>
  );
}

export default GroupedWizard;

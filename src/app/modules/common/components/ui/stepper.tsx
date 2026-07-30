/**
 * WtStepper — the app-wide, theme-aware step indicator for wizards and multi-step flows.
 *
 * THE canonical stepper. Use this instead of Metronic's `.stepper` SCSS classes or a hand-rolled
 * row of numbered circles — the app had neither a shared stepper nor a single MUI `<Stepper>`,
 * so every wizard (employee onboarding, form engine, lead workspace, approvals tracker) grew its
 * own markup, spacing, colours and dark-mode behaviour.
 *
 *   <WtStepper
 *     steps={[{ label: 'Basics' }, { label: 'Details', optional: true }, { label: 'Review' }]}
 *     activeStep={step}
 *     onStepClick={(i) => setStep(i)}   // omit for a non-navigable indicator
 *   />
 *
 * Design notes
 * - Built on MUI `Stepper`, so it inherits the theme and is correct in dark mode for free
 *   (see theme/githubDark.ts). Tailwind covers layout; no per-feature CSS.
 * - Responsive without the caller doing anything: below `sm` the horizontal rail becomes a
 *   compact "Step 2 of 5 · Details" summary with a progress bar. A 6-step horizontal rail is
 *   unreadable on a phone, which is why hand-rolled steppers tend to overflow there.
 * - `onStepClick` only fires for steps the user is allowed to reach (completed ones, plus the
 *   active one) unless `allowFutureNavigation` is set — so a wizard can't be skipped past
 *   required validation just by clicking ahead.
 * - `error` on a step turns its node red and shows the step's `errorText` — the state most
 *   hand-rolled steppers omit entirely.
 */
import { useMemo } from 'react';
import {
  Box, LinearProgress, Step, StepLabel, Stepper, Typography, useMediaQuery, useTheme,
  type SxProps, type Theme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';

export interface WtStep {
  label: string;
  /** Secondary line under the label (desktop only). */
  description?: string;
  /** Renders "Optional" beneath the label. */
  optional?: boolean;
  /** Puts the step in its error state; pair with `errorText`. */
  error?: boolean;
  errorText?: string;
}

export interface WtStepperProps {
  steps: WtStep[];
  /** Zero-based index of the current step. Steps before it are treated as completed. */
  activeStep: number;
  /** Omit to render a read-only indicator. */
  onStepClick?: (index: number) => void;
  /** Allow clicking steps ahead of the active one (default false — protects wizard validation). */
  allowFutureNavigation?: boolean;
  /** Explicit completion map, when "everything before active" isn't the truth (e.g. a skipped
   *  optional step, or a wizard that lets you revisit earlier steps). */
  completed?: Record<number, boolean>;
  orientation?: 'horizontal' | 'vertical';
  sx?: SxProps<Theme>;
}

export function WtStepper({
  steps, activeStep, onStepClick, allowFutureNavigation = false, completed, orientation = 'horizontal', sx,
}: WtStepperProps) {
  const theme = useTheme();
  // `noSsr` keeps the first paint from flashing the desktop rail on a phone.
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

  const isCompleted = useMemo(
    () => (i: number) => (completed ? Boolean(completed[i]) : i < activeStep),
    [completed, activeStep],
  );

  const canNavigate = (i: number) =>
    Boolean(onStepClick) && (allowFutureNavigation || i <= activeStep || isCompleted(i));

  // ── Phone: a rail of 5 steps doesn't fit, so summarise + show progress ──
  if (isPhone && orientation === 'horizontal') {
    const current = steps[activeStep];
    const pct = steps.length > 1 ? ((activeStep + 1) / steps.length) * 100 : 100;
    return (
      <Box sx={sx} className="w-full">
        <div className="flex items-baseline justify-between gap-2">
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: current?.error ? 'error.main' : 'text.primary' }}>
            {current?.label}
          </Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}>
            Step {Math.min(activeStep + 1, steps.length)} of {steps.length}
          </Typography>
        </div>
        {(current?.error && current?.errorText) && (
          <Typography sx={{ fontSize: 11.5, color: 'error.main', mt: 0.25 }}>{current.errorText}</Typography>
        )}
        <LinearProgress
          variant="determinate"
          value={pct}
          color={current?.error ? 'error' : 'primary'}
          sx={{ mt: 1, height: 5, borderRadius: 999, bgcolor: 'action.selected' }}
        />
      </Box>
    );
  }

  return (
    <Stepper
      activeStep={activeStep}
      orientation={orientation}
      alternativeLabel={orientation === 'horizontal'}
      sx={[
        {
          // Keep the connector aligned with the smaller custom node.
          '& .MuiStepConnector-line': { borderColor: 'divider' },
          '& .MuiStepLabel-label': { fontSize: 13, fontWeight: 600, mt: '6px !important' },
          '& .MuiStepLabel-label.Mui-active': { fontWeight: 700 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ] as SxProps<Theme>}
    >
      {steps.map((s, i) => {
        const clickable = canNavigate(i);
        return (
          <Step key={s.label} completed={isCompleted(i)}>
            <StepLabel
              error={s.error}
              optional={
                s.error && s.errorText
                  ? <Typography sx={{ fontSize: 11, color: 'error.main' }}>{s.errorText}</Typography>
                  : s.optional
                    ? <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Optional</Typography>
                    : s.description
                      ? <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.description}</Typography>
                      : undefined
              }
              StepIconComponent={StepNode}
              onClick={clickable ? () => onStepClick?.(i) : undefined}
              sx={{ cursor: clickable ? 'pointer' : 'default', '& .MuiStepLabel-iconContainer': { p: 0 } }}
            />
          </Step>
        );
      })}
    </Stepper>
  );
}

/** Step node: a check when complete, a warning glyph on error, else the 1-based number. */
function StepNode({ active, completed, error, icon }: {
  active?: boolean; completed?: boolean; error?: boolean; icon?: React.ReactNode;
}) {
  const bg = error ? 'error.main' : completed || active ? 'primary.main' : 'action.selected';
  const fg = error || completed || active ? '#fff' : 'text.secondary';
  return (
    <Box
      sx={{
        width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
        bgcolor: bg, color: fg, fontSize: 12.5, fontWeight: 700, flexShrink: 0,
        transition: 'background-color .15s, color .15s',
      }}
    >
      {error ? <KTIcon iconName="information" className="fs-6" />
        : completed ? <KTIcon iconName="check" className="fs-6" />
        : icon}
    </Box>
  );
}

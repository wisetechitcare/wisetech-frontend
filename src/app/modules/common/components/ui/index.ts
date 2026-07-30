// The app standardizes on Material UI (themed via src/app/theme/wisetechTheme.ts).
// This barrel is the one import surface for the shared UI kit:
//   - tokens: single source of truth for brand colors + glass tokens (also feeds the MUI theme)
//   - buttons: WtButton / WtIconButton + sx helpers (calendar-derived CTA physics)
//   - glass: reusable glassmorphism primitives (GlassSurface / GlassDialog / GlassHeader / GlassCard)
//   - feedback: branded Swal helpers (toast / alertDialog / confirmDialog)
export { T, tonePair, label, glassTokens } from './tokens';
export type { SemanticTone, VividTone, GlassVariant, ThemeMode, LabelTier } from './tokens';
export * from './buttons';
// Canonical app-wide toggle — the single source of truth for switches (replaces per-file
// tintedSwitch sx, raw <Switch>, and Bootstrap form-switch).
export { WtSwitch, WtSwitchField, wtSwitchSx } from './switch';
export type { WtSwitchProps, WtSwitchFieldProps, WtSwitchSize } from './switch';
export { ToneChip } from './chips';
export type { ToneChipProps } from './chips';
export {
  glassSx, GlassSurface, GlassDialog, GlassHeader, GlassCard, GlassTransition,
} from './glass';
export type {
  GlassSurfaceProps, GlassDialogProps, GlassHeaderProps, GlassCardProps,
} from './glass';
// Shared UI pattern atoms — app-wide primitives (single source of truth; use across every feature).
// AutoGrid + ListHeader are the standard responsive list-page layout — prefer them over per-feature
// grid/toolbar breakpoints so every collection view fills wide screens and stacks cleanly on mobile.
export {
  TRIO, EASE_200, SHADOW_REST, SHADOW_HOVER, IconBox, StatusBadge, StatTile, Eyebrow, SectionHead,
  AutoGrid, ListHeader,
} from './patterns';
export type { Trio } from './patterns';
export { hoverLiftSx, pressableSx, MOTION_KEYFRAMES } from './motion';
export { GlassNotification, GlassToastProvider, useGlassToast } from './GlassNotification';
export type { GlassNotificationProps, GlassToastOptions } from './GlassNotification';
export { toast, alertDialog, confirmDialog } from './feedback';
export type { FeedbackOptions } from './feedback';
// App-wide single-select picker modal (glass kit, theme-aware) — use instead of bootstrap <Modal>.
export { OptionPickerDialog, OptionRow } from './pickers';
export type { OptionPickerDialogProps, PickerOption } from './pickers';
// Canonical date / date-time fields. NEVER use <input type="date"|"datetime-local"> or
// <TextField type="date">: those render the browser's own picker — unstyled, OS-locale-formatted,
// and unthemeable (so it stays light in dark mode). These render the company standard YYYY.MM.DD.
export { WtDateField, WtDateTimeField } from './dates';
export type { WtDateFieldBaseProps, WtDateTimeFieldProps } from './dates';
// Canonical wizard/multi-step indicator — responsive (compact summary on phones) + theme-aware.
export { WtStepper } from './stepper';
export type { WtStepperProps, WtStep } from './stepper';

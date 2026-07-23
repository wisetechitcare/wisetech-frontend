// The app standardizes on Material UI (themed via src/app/theme/wisetechTheme.ts).
// This barrel is the one import surface for the shared UI kit:
//   - tokens: single source of truth for brand colors + glass tokens (also feeds the MUI theme)
//   - buttons: WtButton / WtIconButton + sx helpers (calendar-derived CTA physics)
//   - glass: reusable glassmorphism primitives (GlassSurface / GlassDialog / GlassHeader / GlassCard)
//   - feedback: branded Swal helpers (toast / alertDialog / confirmDialog)
export { T, tonePair, label, glassTokens } from './tokens';
export type { SemanticTone, VividTone, GlassVariant, ThemeMode, LabelTier } from './tokens';
export * from './buttons';
export { ToneChip } from './chips';
export type { ToneChipProps } from './chips';
export {
  glassSx, GlassSurface, GlassDialog, GlassHeader, GlassCard, GlassTransition,
} from './glass';
export type {
  GlassSurfaceProps, GlassDialogProps, GlassHeaderProps, GlassCardProps,
} from './glass';
// Shared UI pattern atoms — app-wide primitives (single source of truth; use across every feature).
export {
  TRIO, EASE_200, SHADOW_REST, SHADOW_HOVER, IconBox, StatusBadge, StatTile, Eyebrow, SectionHead,
} from './patterns';
export type { Trio } from './patterns';
export { hoverLiftSx, pressableSx, MOTION_KEYFRAMES } from './motion';
export { GlassNotification, GlassToastProvider, useGlassToast } from './GlassNotification';
export type { GlassNotificationProps, GlassToastOptions } from './GlassNotification';
export { toast, alertDialog, confirmDialog } from './feedback';
export type { FeedbackOptions } from './feedback';

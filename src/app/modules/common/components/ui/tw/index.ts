/**
 * Tailwind UI twin — narrow surfaces already on TW (e.g. attendance calendar).
 *
 * Pure Tailwind + framer-motion, ZERO MUI. Names often mirror the MUI product
 * kit (`@app/modules/common/components/ui`) but **props differ** (`className`
 * vs `sx`) — the kits are not interchangeable.
 *
 * **Not the product SSOT.** Labelled forms, selects, dialogs, and new chrome
 * belong in the MUI kit barrel. Do **not** expand this folder into a parallel
 * Field/Select/Button form kit. See `../README.md` North star.
 */
export { cn } from './cn';
export { BRAND, SHADOW, TRIO, EASE } from './tokens';
export type { Trio, ToneName } from './tokens';
export { WtButton, WtIconButton } from './Buttons';
export type { WtButtonProps, WtIconButtonProps, WtCtaTone } from './Buttons';
export { WtCloseButton } from './WtCloseButton';
export type { WtCloseButtonProps } from './WtCloseButton';
export { IconBox, StatusBadge, StatTile, Eyebrow, SectionHead } from './Patterns';
// Shared with the MUI kit rather than twinned: it renders a bare <span> and pulls in no MUI,
// so one component serves both. Pass it as an `icon` instead of typing a currency glyph.
export { CurrencySymbol } from '../CurrencySymbol';
export { ICON_BOX_CLASS, TILE_LABEL_CLASS } from '../classNames';
export { Spinner } from './Spinner';
export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';
export { GlassSurface, GlassCard, GlassHeader, GlassDialog } from './Glass';
export type { GlassSurfaceProps, GlassCardProps, GlassHeaderProps, GlassDialogProps, GlassVariant, DialogMaxWidth } from './Glass';
export { MonthGrid } from './MonthGrid';
export type {
  MonthGridProps,
  MonthGridSelection,
  MonthDayContext,
  SelectionMode,
  SelectionValue,
  WeekStart,
} from './MonthGrid';

// The app standardizes on Material UI (themed via src/app/theme/wisetechTheme.ts).
// This barrel is the one import surface for the shared UI kit:
//   - tokens: single source of truth for brand colors + glass tokens (also feeds the MUI theme)
//   - buttons: WtButton / WtIconButton + sx helpers (calendar-derived CTA physics)
//     plus WT_CONTROL_HEIGHT / controlHeightSx — the one height a control row shares
//   - glass: reusable glassmorphism primitives (GlassSurface / GlassDialog / GlassHeader / GlassCard)
//   - feedback: branded Swal helpers (toast / alertDialog / confirmDialog)
export { T, tonePair, label, glassTokens } from './tokens';
export type { SemanticTone, VividTone, GlassVariant, ThemeMode, LabelTier } from './tokens';
export * from './buttons';
// Canonical app-wide toggle — the single source of truth for switches (replaces per-file
// tintedSwitch sx, raw <Switch>, and Bootstrap form-switch).
export { WtSwitch, WtSwitchField, wtSwitchSx } from './switch';
export type { WtSwitchProps, WtSwitchFieldProps, WtSwitchSize } from './switch';
export { ToneChip, toneAlpha } from './chips';

export { default as ActionIconButton } from './ActionIconButton';
export type { ActionIconButtonProps, ActionTone } from './ActionIconButton';
// Brand marks as inline SVG. The duotone icon font paints its first layer at 40%
// opacity, which erases a logo's recognisable shape — these are solid single paths.
export { WhatsAppIcon } from './brandIcons';
// The one icon element: resolves legacy `bi-*` names to keenicons and renders KTIcon.
export { AppIcon, type AppIconProps } from './AppIcon';
// THE labelled control. One frame — label, field, hint/error — for text, number,
// textarea and select alike, in two placements: `above` for forms, `inline` for
// toolbars. It deliberately does NOT use MUI's floating label: that pattern sizes
// the gap in the border from the field's typography rather than the label's, so a
// bold or uppercase label overflows its own notch and lands on the border line.
// WtField cuts no gap, so that cannot happen at any size or weight.
// Reach for this before building an InputLabel + control pairing by hand.
export { WtField } from './WtField';
export type { WtFieldProps, WtFieldOption, WtFieldSize } from './WtField';
// The rich select: react-select underneath, so it is the one to reach for when a control
// needs search, multi-select, creatable or async options. DropdownInput / SelectInput
// delegate to it.
//
// ToolbarFilterSelect is a thin adapter over WtField (not over this) — a compact
// labelled filter, where WtSelect is the engine for choosing from many. Two engines
// on purpose, for two jobs. WtField's `searchable` prop renders THIS one inside the
// standard frame, which is how a searchable field still gets the same label, hint and
// error treatment as every other field on a form.
export { WtSelect, type WtSelectProps, type WtSelectOption, type WtSelectGroup } from './WtSelect';
export { BI_TO_KEENICON, keeniconFor } from './iconMap';
export type { BrandIconProps } from './brandIcons';
export type { ToneChipProps } from './chips';
export {
  glassSx, GlassSurface, GlassDialog, GlassHeader, PlainDialogHeader, GlassCard, GlassTransition,
} from './glass';
export type {
  GlassSurfaceProps, GlassDialogProps, GlassHeaderProps, GlassCardProps,
} from './glass';
// Shared UI pattern atoms — app-wide primitives (single source of truth; use across every feature).
// AutoGrid + ListHeader are the standard responsive list-page layout — prefer them over per-feature
// grid/toolbar breakpoints so every collection view fills wide screens and stacks cleanly on mobile.
export {
  TRIO, EASE_200, SHADOW_REST, SHADOW_HOVER, IconBox, StatusBadge, StatTile, Eyebrow, SectionHead,
  AutoGrid, ListHeader, ViewModeSwitch, StatusCyclePill, UnderlineTabs,
} from './patterns';
export type { Trio, ViewModeOption, StatusCycleOption, UnderlineTabItem } from './patterns';
// Choose-one-from-a-visual-set controls, for any feature that lets an admin
// brand a record (section icon/colour, status colour, category icon).
export { IconPicker, TONE_NAMES } from './SwatchPicker';
export type { ToneName, IconPickerProps } from './SwatchPicker';
// Palette + custom colour in one control. Supersedes TonePicker (palette only)
// and the raw <input type="color"> in the holiday and appearance forms.
export { WtColorPicker, KIT_SWATCHES, isHexColor, resolveSwatchHex } from './WtColorPicker';
export type { WtColorPickerProps, ColorSwatch } from './WtColorPicker';
// Headline capitalisation, applied by the kit's heading components.
export { toTitleCase } from './text';
// The accent-topped configuration card every settings/config engine is built
// from (Leave Policy, Sandwich Leave, FAQ sections). Owns the frame — surface,
// accent rule, icon tile, header, spacing — so those screens stop drifting apart.
export { SettingsSection } from './SettingsSection';
export type { SettingsSectionProps } from './SettingsSection';
// The app-wide toolbar filter (SUB ORGANIZATION / BRANCH / STATUS). Previously
// defined inside a payroll page that three other features imported across.
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './SegmentedControl';
export { ToolbarFilterSelect, FILTER_TONES } from './ToolbarFilterSelect';
export type { ToolbarFilterSelectProps, FilterSelectTheme } from './ToolbarFilterSelect';
export { OrgFilterToolbar, useOrgFilters } from './OrgFilterToolbar';
export type { OrgFilterState, OrgFilterableRow, EmployeeStatusFilter } from './OrgFilterToolbar';
export { hoverLiftSx, pressableSx, riseInSx, MOTION_KEYFRAMES } from './motion';
// Numbered pager for views that page server-side WITHOUT MaterialTable (card grids,
// tiles). The table draws its own footer; everything else uses this.
export { Pager } from './Pager';
export type { PagerProps } from './Pager';
export { pageWindow, ELLIPSIS } from './pageWindow';
export { GlassNotification, GlassToastProvider, useGlassToast } from './GlassNotification';
export type { GlassNotificationProps, GlassToastOptions } from './GlassNotification';
export { toast, alertDialog, confirmDialog } from './feedback';
export type { FeedbackOptions } from './feedback';
// App-wide single-select picker modal (glass kit, theme-aware) — use instead of bootstrap <Modal>.
export { OptionPickerDialog, OptionRow, OptionCard } from './pickers';
export type { OptionPickerDialogProps, PickerOption } from './pickers';
// Canonical date / date-time fields. NEVER use <input type="date"|"datetime-local"> or
// <TextField type="date">: those render the browser's own picker — unstyled, OS-locale-formatted,
// and unthemeable (so it stays light in dark mode). These render the company standard YYYY.MM.DD.
export { WtDateField, WtDateTimeField } from './dates';
export type { WtDateFieldBaseProps, WtDateTimeFieldProps } from './dates';
// Canonical wizard/multi-step indicator — responsive (compact summary on phones) + theme-aware.
export { WtStepper } from './stepper';
export type { WtStepperProps, WtStep } from './stepper';

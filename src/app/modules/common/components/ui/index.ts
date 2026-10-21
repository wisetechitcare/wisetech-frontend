// The app standardizes on Material UI (themed via src/app/theme/wisetechTheme.ts).
// This barrel is the one import surface for the shared UI kit:
//   - tokens: single source of truth for brand colors + glass tokens (also feeds the MUI theme)
//   - buttons: WtButton / WtIconButton + sx helpers (calendar-derived CTA physics)
//     plus WT_CONTROL_HEIGHT (40) / WT_CONTROL_HEIGHT_MD (44) / controlHeightSx —
//     the one height a control row shares (fields + buttons)
//   - glass: reusable glassmorphism primitives (GlassSurface / GlassDialog / GlassHeader / GlassCard)
//   - feedback: branded Swal helpers (toast / alertDialog / confirmDialog)
//   - safeHtml: tagged template that escapes interpolations for any html: string
export { T, tonePair, label, glassTokens } from './tokens';
export type { SemanticTone, VividTone, GlassVariant, ThemeMode, LabelTier } from './tokens';
export * from './buttons';
// Canonical app-wide toggle — the single source of truth for switches (replaces per-file
// tintedSwitch sx, raw <Switch>, and Bootstrap form-switch).
export { WtSwitch, WtSwitchField, wtSwitchSx } from './switch';
export type { WtSwitchProps, WtSwitchFieldProps, WtSwitchSize } from './switch';
// Canonical checkbox — same brand tint / size contract as WtSwitch.
// Theme `MuiCheckbox` defaultProps also apply this look app-wide (see wisetechTheme).
export {
  WtCheckbox,
  WtCheckboxField,
  WtControlLabel,
  wtCheckboxSx,
  wtCheckboxIcons,
  wtCheckboxThemeDefaultProps,
  wtCheckboxThemeRootSx,
} from './checkbox';
export type { WtCheckboxProps, WtCheckboxFieldProps, WtCheckboxSize } from './checkbox';
export { ToneChip, toneAlpha } from './chips';
// Collection entity card — Roles / Adverts / Candidates / Projects. Composes GlassCard + ToneChip.
export { EntityCard } from './EntityCard';
export type { EntityCardProps, EntityCardTag } from './EntityCard';

export { default as ActionIconButton, trioToActionTone } from './ActionIconButton';
export type { ActionIconButtonProps, ActionTone } from './ActionIconButton';
// Brand marks as inline SVG. The duotone icon font paints its first layer at 40%
// opacity, which erases a logo's recognisable shape — these are solid single paths.
export { WhatsAppIcon } from './brandIcons';
// The one icon element: resolves legacy `bi-*` names to keenicons and renders KTIcon.
export { AppIcon, type AppIconProps } from './AppIcon';
// THE labelled control. One frame — label, field, hint/error — for text, number,
// textarea and select alike. It renders MUI's outlined field with its floating
// label, the same control the "Add Rule" dialog in SandwhichLeave uses, so the kit
// and the rest of the app agree on what a labelled input looks like.
// NEVER style its label: MUI cuts the gap with a <legend> that keeps the DEFAULT
// label metrics, so a bold or uppercase label outgrows its own notch and lands on
// the border line. That is the bug this control was rebuilt to end.
// Reach for this before building an InputLabel + control pairing by hand.
export { WtField } from './WtField';
// Formik-bound WtField — default labelled select/text in Formik forms (Sandwich look).
export { WtFieldFormik, type WtFieldFormikProps } from './WtFieldFormik';
// Canonical “+ Add …” for labelled selects — pass as `addOption` on WtField / WtFieldFormik.
export {
    WtAddOptionButton,
    resolveWtAddOption,
    DEFAULT_ADD_OPTION_LABEL,
} from './WtAddOption';
export type { WtAddOption, WtAddOptionPlacement } from './WtAddOption';
// An amount of money: WtField with the currency inside the frame and the number read back as
// money in the hint as you type. Pass `currency` for a record's own currency (a requisition,
// an offer); omit it for the viewer's. Salary rules go in `validate`, not in the field.
export { WtMoneyField, type WtMoneyFieldProps } from './WtMoneyField';
// The active currency's glyph, resolved from the branch — never a typed-in `$`.
// Pair it with `useCurrency()` (hooks/useCurrency), which also hands back the ISO
// code and a `format()` already bound to it.
export { CurrencySymbol } from './CurrencySymbol';
// The one empty state. An empty screen is a QUESTION — 'No candidates yet' restates what the
// user can already see; this says what to do next and puts the way out where the eye already is.
// variant='no-match' for a search that found nothing: the remedy is a different search, not a
// new record, so it deliberately drops the create action.
export { WtEmptyState } from './WtEmptyState';
export type { WtEmptyStateProps, WtEmptyStateVariant } from './WtEmptyState';
// Full-block page/section loading — MUI CircularProgress. Legacy path: utils/Loader.
export { PageLoader, type PageLoaderProps } from './PageLoader';
// Short master create/edit dialog shell for *ConfigureForm screens.
export { ConfigureFormDialog, type ConfigureFormDialogProps } from './ConfigureFormDialog';
export type { WtFieldProps, WtFieldOption, WtFieldSize, WtFieldChangeHandler } from './WtField';
// The rich select ENGINE: react-select underneath. Features must not import react-select —
// use WtField / WtFieldFormik / MultiSelectWithInlineCreate / ToolbarFilterSelect instead.
// DropdownInput / SelectInput are legacy adapters that delegate here.
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
  GlassSurfaceProps, GlassDialogProps, GlassHeaderProps, GlassCardProps, GlassDialogPreset,
} from './glass';
// Shared Cancel/Save footer for GlassDialog — prefer over hand-rolled DialogActions sx.
export { GlassDialogActions, type GlassDialogActionsProps } from './GlassDialogActions';
// Alert-style confirm / delete dialog (Glass + WtButton). Prefer over window.confirm / raw MUI Dialog.
export {
  ConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDialogVariant,
} from './ConfirmDialog';
export {
  useConfirmDialog,
  type AskConfirmOptions,
} from './useConfirmDialog';
export {
  usePromptDialog,
  type AskPromptOptions,
} from './usePromptDialog';
// Dialog form cards (Sandwich Add Rule shape) + spacing rhythm SSOT.
export { FormSection, FORM_SPACE, type FormSectionProps } from './FormSection';
// Shared UI pattern atoms — app-wide primitives (single source of truth; use across every feature).
// AutoGrid + ListHeader are the standard responsive list-page layout — prefer them over per-feature
// grid/toolbar breakpoints. AutoGrid defaults to auto-fill + ~400px max (no full-bleed stretch);
// pass stretch only when tiles must absorb leftover width.
// hoverTileSx is THE hover for a tinted tile or card: the aside menu's language, which is the
// surface everyone sees most — the wash and border warm, the IconBox lifts a pixel and deepens,
// the caption sharpens, and the card itself stays put. Spread it instead of writing another
// `&:hover` with a transform in it.
export {
  TRIO, EASE_200, SHADOW_REST, SHADOW_HOVER, IconBox, StatusBadge, StatTile, Eyebrow, SectionHead,
  AutoGrid, ListHeader, ViewModeSwitch, StatusCyclePill, UnderlineTabs,
  hoverTileSx, ICON_BOX_CLASS, TILE_LABEL_CLASS,
  VIEW_MODE_ICONS,
  CARDS_LIST_VIEW_OPTIONS, GRID_LIST_VIEW_OPTIONS, BOARD_LIST_VIEW_OPTIONS, CARDS_TABLE_VIEW_OPTIONS,
  KANBAN_TABLE_VIEW_OPTIONS, DMS_VIEW_OPTIONS,
  CardsListViewSwitch, GridListViewSwitch, BoardListViewSwitch, CardsTableViewSwitch, KanbanTableViewSwitch,
  DmsViewSwitch,
  viewModeSwitchTrackSx, viewModeSwitchButtonSx,
} from './patterns';
export type {
  Trio, ViewModeOption, ViewModeSwitchProps, StatusCycleOption, UnderlineTabItem,
  CardsListView, GridListView, BoardListView, CardsTableView, KanbanTableView, DmsViewMode,
} from './patterns';
// Choose-one-from-a-visual-set controls, for any feature that lets an admin
// brand a record (section icon/colour, status colour, category icon).
export { IconPicker, TONE_NAMES } from './SwatchPicker';
export type { ToneName, IconPickerProps } from './SwatchPicker';
// Palette + custom colour in one control. Supersedes TonePicker (palette only)
// and the raw <input type="color"> in the holiday and appearance forms.
export { WtColorPicker, KIT_SWATCHES, KIT_HEX_SWATCHES, isHexColor, resolveSwatchHex } from './WtColorPicker';
export { WtTooltip } from './WtTooltip';
export type { WtTooltipProps } from './WtTooltip';
export type { WtColorPickerProps, ColorSwatch } from './WtColorPicker';
// Headline capitalisation, applied by the kit's heading components.
// HEADING_CASE_SX carries the uppercase house style for a structural heading —
// spread it only where a screen renders its own region title instead of using
// GlassHeader / ListHeader / SectionHead / SettingsSection.
export { toTitleCase, HEADING_CASE_SX } from './text';
// The accent-topped configuration card every settings/config engine is built
// from (Leave Policy, Sandwich Leave, FAQ sections). Owns the frame — surface,
// accent rule, icon tile, header, spacing — so those screens stop drifting apart.
export { SettingsSection } from './SettingsSection';
export type { SettingsSectionProps } from './SettingsSection';
// Reorderable masters CRUD section (Recruitment Configure, future Gift/Leads lists).
export { MasterListSection } from './MasterListSection';
export type {
  MasterListSectionProps, MasterListRow, MasterListFlagDef, MasterListExtraFieldsApi,
} from './MasterListSection';
export { WeightSliderList } from './WeightSliderList';
export type { WeightSliderListProps, WeightSliderField } from './WeightSliderList';
// Compact configure value row (colour rail + name + hover actions). Theme-token surfaces.
export { ConfigColorChip, ConfigChipGrid } from './ConfigColorChip';
export type { ConfigColorChipProps, ConfigChipAction } from './ConfigColorChip';
// Drag-to-reorder list — neighbor living next to ui; re-exported so Rule zero finds it
// on the kit barrel (README: Reorder → ReorderableGroup + DragHandle).
export {
  default as ReorderableGroup,
  DragHandle,
  type DragHandleProps,
  type ReorderableGroupProps,
} from '../ReorderableGroup';
// Billing-style entity title block (icon + title + description + action).
export { EntityPageHeader } from './EntityPageHeader';
export type { EntityPageHeaderProps } from './EntityPageHeader';
// The app-wide toolbar filter (SUB ORGANIZATION / BRANCH / STATUS). Previously
// defined inside a payroll page that three other features imported across.
export { NavCard } from './NavCard';
export type { NavCardProps } from './NavCard';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './SegmentedControl';
// MaterialTable `renderSelectionActions` strip — "{n} selected" + bulk CTAs (WtButton).
export { TableSelectionBar } from './TableSelectionBar';
export type { TableSelectionBarProps } from './TableSelectionBar';
export { ToolbarFilterSelect, FILTER_TONES } from './ToolbarFilterSelect';
export type { ToolbarFilterSelectProps, FilterSelectTheme } from './ToolbarFilterSelect';
export { OrgFilterToolbar, useOrgFilters } from './OrgFilterToolbar';
export type { OrgFilterState, OrgFilterableRow, EmployeeStatusFilter } from './OrgFilterToolbar';
export { hoverLiftSx, pressableSx, riseInSx, disclosureSx, DISCLOSURE, MOTION_KEYFRAMES } from './motion';
// Numbered pager for views that page server-side WITHOUT MaterialTable (card grids,
// tiles). The table draws its own footer; everything else uses this.
export { Pager } from './Pager';
export type { PagerProps } from './Pager';
export { pageWindow, ELLIPSIS } from './pageWindow';
export { GlassNotification, GlassToastProvider, useGlassToast } from './GlassNotification';
export type { GlassNotificationProps, GlassToastOptions } from './GlassNotification';
export { toast, alertDialog, confirmDialog } from './feedback';
// Build any html: string with safeHtml — it escapes every interpolation, so a name
// or server message cannot become markup. See safeHtml.ts for why it is a tagged
// template rather than an escape() helper.
export { safeHtml, escapeHtml } from './safeHtml';
// A line of explanation INSIDE a form or panel: toned notice, or a quiet info hint.
export { InlineNotice, InlineHint } from './InlineNotice';
export type { InlineNoticeProps } from './InlineNotice';
export type { FeedbackOptions } from './feedback';
// App-wide single-select picker modal (glass kit, theme-aware) — use instead of bootstrap <Modal>.
export { OptionPickerDialog, OptionRow, OptionCard } from './pickers';
export type { OptionPickerDialogProps, PickerOption } from './pickers';
// Canonical date / date-time fields. NEVER use <input type="date"|"datetime-local"> or
// <TextField type="date">: those render the browser's own picker — unstyled, OS-locale-formatted,
// and unthemeable (so it stays light in dark mode). These render the company standard YYYY.MM.DD.
export { WtDateField, WtDateTimeField } from './dates';
export type { WtDateFieldBaseProps, WtDateTimeFieldProps } from './dates';
// Org / prefix fiscal year range — two WtDateFields, ISO `"start to end"` wire.
export { FiscalYearRangeField } from './FiscalYearRangeField';
export type { FiscalYearRangeFieldProps } from './FiscalYearRangeField';
// Canonical wizard/multi-step indicator — responsive (compact summary on phones) + theme-aware.
export { WtStepper } from './stepper';
// Single-digit boxes for a PIN or one-time code — NOT a password field, so browsers never save/autofill it.
export { PinInput } from './PinInput';
export type { PinInputProps } from './PinInput';
export type { WtStepperProps, WtStep } from './stepper';
// Long forms: a dialog shell with section nav + sticky footer, titled field groups, and an image uploader.
export { WtFormDialog, WtFormSection, WtFormSpan } from './WtFormDialog';
export type { WtFormDialogProps, WtFormSectionProps, WtFormNavItem } from './WtFormDialog';
export { WtImageField } from './WtImageField';
export type { WtImageFieldProps } from './WtImageField';

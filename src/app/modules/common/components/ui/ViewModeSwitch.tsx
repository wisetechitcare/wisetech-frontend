/**
 * Icon-only layout switch — the ONE control for "same data, different layout".
 *
 * Every cards/list/board/table toolbar toggle in the product must use this (or a typed
 * preset wrapper below). Hand-rolled Bootstrap btn-groups, private ViewToggle forks, and
 * per-screen `bi-grid` vs `bi-grid-3x3-gap-fill` pairs are how four recruitment tabs ended
 * up looking like four different products.
 *
 * Use `SegmentedControl` when the choice has a *name* worth reading (status, period).
 * A layout is recognised by its glyph.
 */
import { Box, useTheme } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';

export interface ViewModeOption<T extends string> {
  value: T;
  /** Bootstrap Icon class, e.g. `bi-grid-3x3-gap-fill`. */
  icon: string;
  /** Tooltip + accessible name, e.g. "Cards". */
  label: string;
}

/**
 * Canonical glyphs for layout purposes — **same purpose → same icon, everywhere**.
 *
 * Do not invent `bi-grid` / `element-11` / `burger-menu` / `row-horizontal` forks
 * for cards/list/board. A third glyph for the same job is how four tabs look like
 * four products.
 */
export const VIEW_MODE_ICONS = {
  /** Card / tile / grid collection (also file-explorer “grid”). */
  cards: 'bi-grid-3x3-gap-fill',
  /** Dense list / MaterialTable / “list” layout. */
  list: 'bi-list-ul',
  /** Kanban / pipeline / board columns. */
  board: 'bi-kanban',
  /** Spreadsheet-style table (file explorer). Not MaterialTable — that uses `list`. */
  table: 'bi-table',
  /** Extra-dense rows (file explorer compact). Distinct from bulleted `list`. */
  compact: 'bi-list',
} as const;

/** DMS file explorer — grid / list / compact / table. Icons from VIEW_MODE_ICONS only. */
export const DMS_VIEW_OPTIONS = [
  { value: 'grid' as const, icon: VIEW_MODE_ICONS.cards, label: 'Grid' },
  { value: 'list' as const, icon: VIEW_MODE_ICONS.list, label: 'List' },
  { value: 'compact' as const, icon: VIEW_MODE_ICONS.compact, label: 'Compact' },
  { value: 'table' as const, icon: VIEW_MODE_ICONS.table, label: 'Table' },
] as const satisfies ReadonlyArray<ViewModeOption<'grid' | 'list' | 'compact' | 'table'>>;

export type DmsViewMode = (typeof DMS_VIEW_OPTIONS)[number]['value'];

/** Cards ↔ List — roles, adverts, candidates, any AutoGrid ↔ MaterialTable page. */
export const CARDS_LIST_VIEW_OPTIONS = [
  { value: 'cards' as const, icon: VIEW_MODE_ICONS.cards, label: 'Cards' },
  { value: 'list' as const, icon: VIEW_MODE_ICONS.list, label: 'List' },
] as const satisfies ReadonlyArray<ViewModeOption<'cards' | 'list'>>;

export type CardsListView = (typeof CARDS_LIST_VIEW_OPTIONS)[number]['value'];

/** Grid ↔ List — same glyphs; `grid`/`list` value keys (documents, stages, time entries). */
export const GRID_LIST_VIEW_OPTIONS = [
  { value: 'grid' as const, icon: VIEW_MODE_ICONS.cards, label: 'Cards' },
  { value: 'list' as const, icon: VIEW_MODE_ICONS.list, label: 'List' },
] as const satisfies ReadonlyArray<ViewModeOption<'grid' | 'list'>>;

export type GridListView = (typeof GRID_LIST_VIEW_OPTIONS)[number]['value'];

/** Board ↔ List — pipeline kanban. */
export const BOARD_LIST_VIEW_OPTIONS = [
  { value: 'board' as const, icon: VIEW_MODE_ICONS.board, label: 'Board' },
  { value: 'list' as const, icon: VIEW_MODE_ICONS.list, label: 'List' },
] as const satisfies ReadonlyArray<ViewModeOption<'board' | 'list'>>;

export type BoardListView = (typeof BOARD_LIST_VIEW_OPTIONS)[number]['value'];

/** Cards ↔ Table — employee roster (`table` value key kept for stored prefs). */
export const CARDS_TABLE_VIEW_OPTIONS = [
  { value: 'cards' as const, icon: VIEW_MODE_ICONS.cards, label: 'Cards' },
  { value: 'table' as const, icon: VIEW_MODE_ICONS.list, label: 'List' },
] as const satisfies ReadonlyArray<ViewModeOption<'cards' | 'table'>>;

export type CardsTableView = (typeof CARDS_TABLE_VIEW_OPTIONS)[number]['value'];

/** Board ↔ Table — tasks workspace (`kanban`/`table` keys kept for stored prefs). */
export const KANBAN_TABLE_VIEW_OPTIONS = [
  { value: 'kanban' as const, icon: VIEW_MODE_ICONS.board, label: 'Board' },
  { value: 'table' as const, icon: VIEW_MODE_ICONS.list, label: 'Table' },
] as const satisfies ReadonlyArray<ViewModeOption<'kanban' | 'table'>>;

export type KanbanTableView = (typeof KANBAN_TABLE_VIEW_OPTIONS)[number]['value'];

const TRACK_PAD = '3px';
const BTN_W = 32;
const BTN_H = 28;
const BTN_RADIUS = '7px';
const TRACK_RADIUS = '10px';

/**
 * Outer track chrome — the same shell `ViewModeSwitch` paints.
 * Reuse for a companion icon toggle that must sit flush beside the switch
 * (e.g. time-entry involvement chart) so heights never drift.
 */
export function viewModeSwitchTrackSx(theme: Theme): SxProps<Theme> {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    p: TRACK_PAD,
    gap: TRACK_PAD,
    borderRadius: TRACK_RADIUS,
    border: '1px solid',
    borderColor: 'divider',
    // Strong enough to read on both white ListHeader and tinted page wash —
    // `action.hover` alone vanished on some recruitment tabs and made the
    // control look like two loose icons.
    bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.055),
    flexShrink: 0,
  };
}

/** Active / idle cell inside the track. Shared with companion toggles. */
export function viewModeSwitchButtonSx(active: boolean, theme: Theme): SxProps<Theme> {
  return {
    // Hard reset — Metronic's unlayered Bootstrap `button` rules otherwise
    // inject padding/min-height and make the same kit control look different
    // depending on which page's CSS arrived first.
    appearance: 'none',
    WebkitAppearance: 'none',
    margin: 0,
    padding: 0,
    border: 'none',
    outline: 'none',
    backgroundImage: 'none',
    font: 'inherit',
    lineHeight: 1,
    display: 'grid',
    placeItems: 'center',
    width: BTN_W,
    height: BTN_H,
    minWidth: BTN_W,
    minHeight: BTN_H,
    borderRadius: BTN_RADIUS,
    cursor: 'pointer',
    transition: 'background-color .12s ease, color .12s ease, box-shadow .12s ease',
    bgcolor: active ? 'background.paper' : 'transparent',
    color: active ? 'text.primary' : 'text.secondary',
    boxShadow: active
      ? `0 1px 2px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.45 : 0.1)}`
      : 'none',
    '&:hover': { color: 'text.primary' },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 1,
    },
  };
}

export interface ViewModeSwitchProps<T extends string> {
  options: ReadonlyArray<ViewModeOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  sx?: SxProps<Theme>;
}

/**
 * Prefer a typed preset wrapper (`CardsListViewSwitch`, …) so screens cannot
 * invent a third glyph pair. Pass `options` only for a rare custom set that
 * still uses `VIEW_MODE_ICONS`.
 */
export function ViewModeSwitch<T extends string>({
  options, value, onChange, ariaLabel, sx,
}: ViewModeSwitchProps<T>) {
  const theme = useTheme();
  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={[viewModeSwitchTrackSx(theme), ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      {options.map(({ value: optionValue, icon, label }) => {
        const active = optionValue === value;
        return (
          <Box
            key={optionValue}
            component="button"
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => onChange(optionValue)}
            sx={viewModeSwitchButtonSx(active, theme)}
          >
            <Box component="i" className={icon} aria-hidden sx={{ fontSize: 13, lineHeight: 1 }} />
          </Box>
        );
      })}
    </Box>
  );
}

type PresetSwitchProps<T extends string> = Omit<ViewModeSwitchProps<T>, 'options'>;

/** Roles / adverts / candidates — cards ↔ list. */
export function CardsListViewSwitch(props: PresetSwitchProps<CardsListView>) {
  return <ViewModeSwitch {...props} options={CARDS_LIST_VIEW_OPTIONS} />;
}

/** Documents / stages / time entries — grid ↔ list. */
export function GridListViewSwitch(props: PresetSwitchProps<GridListView>) {
  return <ViewModeSwitch {...props} options={GRID_LIST_VIEW_OPTIONS} />;
}

/** Pipeline — board ↔ list. */
export function BoardListViewSwitch(props: PresetSwitchProps<BoardListView>) {
  return <ViewModeSwitch {...props} options={BOARD_LIST_VIEW_OPTIONS} />;
}

/** Employee roster — cards ↔ table. */
export function CardsTableViewSwitch(props: PresetSwitchProps<CardsTableView>) {
  return <ViewModeSwitch {...props} options={CARDS_TABLE_VIEW_OPTIONS} />;
}

/** Tasks workspace — kanban ↔ table. */
export function KanbanTableViewSwitch(props: PresetSwitchProps<KanbanTableView>) {
  return <ViewModeSwitch {...props} options={KANBAN_TABLE_VIEW_OPTIONS} />;
}

/** Lead DMS file explorer — grid / list / compact / table. */
export function DmsViewSwitch(props: PresetSwitchProps<DmsViewMode>) {
  return <ViewModeSwitch {...props} options={DMS_VIEW_OPTIONS} />;
}

export default ViewModeSwitch;

/**
 * Per-section accent classes, the launcher tile surface, and the page backdrop.
 *
 * Every class string is written out IN FULL and never composed at runtime. Tailwind
 * scans source text for complete class names, so `text-${tone}-600` would produce no CSS
 * at all — the styles would silently vanish in a production build.
 */

export interface SectionAccent {
  /** Glyph colour on the white launcher tile. */
  icon: string;
  /** Pale tinted square — dialog headers and the back bar, not the tiles. */
  iconWrap: string;
  /** Border tint picked up on tile hover. */
  hoverBorder: string;
}

const ACCENTS = {
  slate: {
    icon: 'text-slate-600 dark:text-slate-300',
    iconWrap: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
    hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-500/50',
  },
  blue: {
    icon: 'text-blue-600 dark:text-blue-300',
    iconWrap: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/20',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-500/50',
  },
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-300',
    iconWrap: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/50',
  },
  purple: {
    icon: 'text-purple-600 dark:text-purple-300',
    iconWrap: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-400/20',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-500/50',
  },
  amber: {
    icon: 'text-amber-600 dark:text-amber-300',
    iconWrap: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-500/50',
  },
  teal: {
    icon: 'text-teal-600 dark:text-teal-300',
    iconWrap: 'bg-teal-50 text-teal-600 ring-1 ring-teal-100 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-400/20',
    hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-500/50',
  },
  rose: {
    icon: 'text-rose-600 dark:text-rose-300',
    iconWrap: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-500/50',
  },
  indigo: {
    icon: 'text-indigo-600 dark:text-indigo-300',
    iconWrap: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/20',
    hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500/50',
  },
} as const satisfies Record<string, SectionAccent>;

export type AccentName = keyof typeof ACCENTS;

/** Section id → accent. Ids come from useNavigation's `type:'section'` nodes. */
const ACCENT_BY_SECTION: Record<string, AccentName> = {
  'general-section': 'slate',
  'hr-section': 'blue',
  'crm-section': 'emerald',
  // The rail runs slate · blue · emerald · purple · indigo · rose · teal · amber.
  // Each application takes a hue no other one uses — adjacent applications sharing
  // an accent read as a single group, which is exactly what promoting them out of
  // their parent was meant to undo.
  'projects-section': 'purple',
  'payment-section': 'indigo',
  'finance-section': 'rose',
  'organization-section': 'teal',
  'admin-section': 'amber',
};

export const sectionAccent = (sectionId: string): SectionAccent =>
  ACCENTS[ACCENT_BY_SECTION[sectionId] ?? 'blue'];

/**
 * Centred, wrapping row of launcher tiles.
 *
 * Flex-wrap rather than a grid here on purpose: with only a handful of tiles, grid tracks
 * would strand them against the left edge of a very wide page. Centring is the whole look
 * of a launcher. Each cell has a fixed width so labels of different lengths still line up
 * — that is a tile, not a content card, so it is not the fixed-width-card problem that
 * left dead gutters in the earlier layout.
 */
export const LAUNCHER_ROW = 'flex flex-wrap justify-center gap-x-4 gap-y-7 sm:gap-x-6';

/** One launcher cell. */
export const TILE_CELL =
  'group flex w-24 shrink-0 cursor-pointer flex-col items-center gap-2.5 rounded-xl p-1 text-center sm:w-28 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

/**
 * The white square. Every tile — section, link and group alike — uses this exact class
 * list, so no tile is ever a different size to any other.
 */
export const TILE_SQUARE =
  'relative flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white ' +
  'shadow-[0_2px_6px_rgba(15,23,42,0.07)] transition duration-200 ' +
  'group-hover:-translate-y-1 group-hover:shadow-[0_12px_26px_rgba(15,23,42,0.14)] ' +
  'motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 ' +
  'dark:border-slate-700 dark:bg-slate-800';

/** Label under the tile. Fixed two-line box so labels of different lengths still align. */
export const TILE_LABEL =
  'line-clamp-2 min-h-[2.4rem] w-full text-[13.5px] font-medium leading-snug text-slate-700 dark:text-slate-300';

/** Glyph size inside the square. */
export const TILE_ICON_SIZE = 40;

/**
 * Page backdrop — a soft diagonal wash rather than a flat fill, so the white tiles read
 * as sitting ON something. Kept very low-contrast: this is chrome, not content.
 */
export const PAGE_BACKDROP =
  'bg-gradient-to-br from-[#eef2f9] via-[#f5f8fb] to-[#e9eef8] ' +
  'dark:from-slate-900 dark:via-slate-900 dark:to-slate-800';

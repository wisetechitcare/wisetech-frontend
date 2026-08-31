import { GLYPH_SIZE } from './motion';

/**
 * Workspace shell class tokens — the visual language of the launcher and the rail.
 *
 * ─── NO TRANSFORM UTILITIES. EVER. ──────────────────────────────────────────
 * Framer writes inline `transform` per frame and an inline value always beats a class, so a
 * CSS transition on the same property fights the animation and jitters. Nothing here may
 * carry `transition-*`, `duration-*`, `translate-*`, `scale-*`, `rotate-*` or `ease-*`.
 * Hover lift and press live on motion props, not classes.
 *
 * ─── TAILWIND CONSTRAINT (inherited, non-negotiable) ─────────────────────────
 * Every class string is written out IN FULL and never composed at runtime. Tailwind scans
 * source text for complete class names, and this project has NO tailwind.config.js (v4,
 * CSS-first) and therefore no safelist — so `text-${tone}-600` would emit no CSS at all and
 * the styles would silently vanish in a production build.
 *
 * ─── COLOUR ─────────────────────────────────────────────────────────────────
 * Tailwind's own scale plus `dark:` variants; per-application accents come from
 * `sectionAccent()`, which the legacy launcher already defined. Raw rgba appears only in
 * shadows and the one decorative gradient — the same exception the existing kit makes,
 * because there is no token form for a shadow.
 *
 * ─── CLASS NAMES THAT COLLIDE WITH BOOTSTRAP/METRONIC ───────────────────────
 * Metronic redefines Bootstrap's utility layer with `!important` and ships it UNLAYERED, so
 * any Tailwind class whose NAME matches one of theirs is dead on arrival. Measured in the
 * built CSS:
 *     .border     -> border: var(--bs-border-width) … var(--bs-border-color) !important
 *     .bg-white   -> background-color: rgba(var(--bs-white-rgb), …) !important
 * Both beat `dark:` variants too, which is why module cards rendered WHITE in dark mode with
 * an unreadable label. Fixed by using names Bootstrap does not define: `border-[1px]` and
 * `bg-white/100`.
 *
 * For the same reason every spacing value here is an arbitrary px (`p-[18px]`, not `p-4`):
 * `.p-4`, `.gap-3` etc. all exist in Metronic's utility set, and Metronic sets the root font
 * to 13px so even the ones that survive render at 81% of their nominal rem size. Pixels
 * cannot collide and cannot be rescaled.
 *
 * ─── NEVER PUT THESE ON <h1>…<h6>, <p> OR <a> ───────────────────────────────
 * Metronic ships `h1, .h1 { font-size: calc(1.3rem + 0.6vw) }` and `p { margin-bottom: 1rem }`
 * UNLAYERED. Tailwind v4 emits every utility inside `@layer`, and unlayered CSS beats layered
 * CSS regardless of specificity — so a heading with `text-[38px]` silently renders at
 * Bootstrap's size instead. Measured: `<h1 class="text-[22px]">` → 22.75px; the same class on
 * a `<div>` → 22px.
 *
 * Every title in this shell is therefore a `<div role="heading" aria-level={n}>`. The
 * semantics are identical for assistive technology, the element carries no Bootstrap
 * baggage, and there is no margin to fight either.
 *
 * `<a>` has the same problem for COLOUR — Reboot's `a { color: var(--bs-link-color-rgb) }`
 * beat every `text-*` class, so links rendered brand-navy in both themes (measured
 * rgb(28,65,135) in dark). Anchors therefore carry LAYOUT classes only, and their colour
 * lives on an inner `<span>`. Same reason NavTile keeps its visual classes off the `<a>`.
 */
export { navIcon } from '@components/navigation/NavContainers/navIcons';
export { sectionAccent } from '@components/navigation/NavContainers/navTheme';
export type { SectionAccent } from '@components/navigation/NavContainers/navTheme';

// ─────────────────────────────────────────────────────────────────────────────
// SHELL FRAME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Home: a centred stage that FILLS the content area.
 *
 * `flex-1`, NOT a `calc(100vh - chrome)` guess. The ambient canvas is `absolute inset-0` of
 * this element, so anything it does not cover is a band of bare page — height here is not
 * just layout, it is the extent of the background. Subtracting an assumed header + footer
 * height can never be right on every viewport.
 *
 * `flex-1` only works because premium-layout.css gives `#kt_content_container` a
 * `display: flex; flex-direction: column` while the shell is mounted — Metronic's chain is
 * flex all the way down to `#kt_post` and then stops there. See that rule for the detail.
 *
 * The min-height is a floor for very short viewports, nothing more.
 */
export const SHELL_HOME =
  'relative flex min-h-[520px] w-full flex-1 flex-col items-center justify-center ' +
  'bg-slate-50/100 dark:bg-[var(--gh-canvas)] ' +
  'gap-[40px] px-[16px] py-[48px] sm:gap-[48px] sm:px-[24px] sm:py-[56px] lg:gap-[56px] lg:py-[64px]';

/**
 * Docked: TWO FIXED COLUMNS from lg up; stacked on compact.
 *
 * ─── CSS GRID, NOT FLEX, AND THAT IS THE POINT ──────────────────────────────
 * Column 1 is a fixed track (232px / 268px). Column 2 is `minmax(0, 1fr)`.
 *
 * The workspace's left edge is therefore a GRID TRACK BOUNDARY, not a consequence of
 * anything in the rail. Selecting a different application changes only the active state
 * inside column 1 — it cannot move, widen or shift column 2, because column 2's origin is
 * not computed from column 1's content. With flex, a `flex-1` sibling's position is derived
 * from its neighbour's resolved width, which leaves the door open for content to nudge it.
 * A grid track cannot be nudged.
 *
 * `minmax(0, 1fr)` rather than `1fr`: a bare `1fr` has an implicit `min-width: auto`, so one
 * wide table inside a page would push the whole column and drag the boundary with it.
 */
export const SHELL_DOCKED =
  'relative min-h-[78vh] w-full px-[16px] py-[20px] sm:px-[24px] ' +
  'lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start lg:gap-0 lg:px-0 lg:py-0 ' +
  'xl:grid-cols-[268px_minmax(0,1fr)]';

/**
 * Visual order is flipped with flex `order`, NOT by reordering the JSX.
 * DOM order stays dock-then-workspace in every mode, which keeps tab order stable across the
 * morph and keeps the <nav> landmark first for screen readers.
 */
export const ORDER_DOCK_HOME = 'order-2';
export const ORDER_WORKSPACE_HOME = 'order-1';
export const ORDER_DOCK_DOCKED = 'order-1';
export const ORDER_WORKSPACE_DOCKED = 'order-2';

// ─────────────────────────────────────────────────────────────────────────────
// DOCK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The launcher grid — designed per breakpoint, not shrunk from desktop.
 *   phone   2 columns, tight gutters, cards stay ≥150px so the tap target is comfortable
 *   tablet  3 columns
 *   laptop  4 columns
 *   desktop 5 columns — the natural width of the current application set
 */
// `relative z-10` lifts the tiles above the ambient canvas, which sits at z-0 inside
// SHELL_HOME. Without it the canvas paints over the launcher.
export const DOCK_HOME =
  'relative z-10 grid w-full max-w-[1120px] grid-cols-2 gap-[12px] sm:grid-cols-3 sm:gap-[16px] lg:grid-cols-4 ' +
  'xl:grid-cols-5';

/**
 * The rail — column 1.
 *
 * Carries NO width of its own: the grid track owns that (see SHELL_DOCKED). A width here
 * would be a second source of truth for the column boundary and the two could disagree.
 * Sticky and full-height so its right border reads as a continuous, fixed seam between the
 * two columns rather than a line that stops where the list happens to end.
 */
export const DOCK_DOCKED =
  'flex w-full min-w-0 flex-col gap-[4px] lg:sticky lg:top-[86px] lg:h-[calc(100vh-104px)] ' +
  'lg:self-start lg:overflow-y-auto lg:border-r lg:border-slate-200 lg:py-[20px] ' +
  'lg:pl-[20px] lg:pr-[16px] xl:pl-[24px] xl:pr-[20px] dark:lg:border-slate-800';

/** Rail section label. Present only when docked, and only above lg. */
export const DOCK_EYEBROW =
  'mb-[8px] hidden px-[10px] text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 ' +
  'lg:block dark:text-slate-500';

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION TILE  —  card at Home, row in the rail
// ─────────────────────────────────────────────────────────────────────────────
// Both modes render the SAME elements in the SAME order; only class strings differ. That
// invariant is what lets one persistent node be FLIPped instead of two being cross-faded,
// and it is what keeps focus and tab order intact mid-morph.

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

/**
 * The launcher card. This is the single biggest visual change in the shell: an 80px bare
 * square became a real surface with elevation, a tinted icon plate and a meta line — which
 * is also what makes the morph dramatic, because there is now something substantial to
 * travel and compress.
 */
export const TILE_CELL_HOME =
  'group relative flex cursor-pointer flex-col items-center gap-[14px] rounded-[20px] border-[1px] ' +
  'border-slate-200/90 bg-white/100 p-[18px] text-center ' +
  'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-12px_rgba(15,23,42,0.16)] ' +
  'sm:p-[20px] dark:border-slate-700/80 dark:bg-slate-800/70 ' +
  'dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_10px_24px_-12px_rgba(0,0,0,0.7)] ' +
  FOCUS_RING;

/** The rail row. Same node, different shape. */
export const TILE_CELL_DOCKED =
  'group relative flex cursor-pointer flex-row items-center gap-[12px] rounded-xl border-[1px] ' +
  'border-transparent bg-transparent px-[10px] py-[8px] text-left hover:bg-slate-100 ' +
  'dark:hover:bg-slate-800/70 ' +
  FOCUS_RING;

/** Selected application. A tinted surface plus the accent bar below — quiet but unmissable. */
export const TILE_CELL_ACTIVE =
  'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800';

/**
 * The accent bar on the active rail row. Takes its colour from the section accent's TEXT
 * class via `bg-current`, so there is no second per-application colour map to keep in sync.
 */
export const TILE_ACTIVE_BAR =
  'absolute left-0 top-1/2 h-[24px] w-[3px] -translate-y-1/2 rounded-r-full bg-current';

/**
 * The icon plate. `sectionAccent().iconWrap` supplies the tint, ring and glyph colour, so
 * every application is instantly distinguishable — the change that does most of the work in
 * a before/after screenshot.
 *
 * Note the absent `rounded-*`: the radius is passed through `style` from motion.ts
 * (GLYPH_RADIUS). Framer scales the box to animate its size change, which distorts a
 * class-set border-radius — only a style-set value can be counter-scaled per frame.
 */
const TILE_GLYPH_BASE = 'relative flex shrink-0 items-center justify-center';

export const TILE_GLYPH_HOME = `${TILE_GLYPH_BASE} h-[60px] w-[60px]`;
export const TILE_GLYPH_DOCKED = `${TILE_GLYPH_BASE} h-[40px] w-[40px]`;

/** Text block. Column + centred at Home, column + left in the rail. */
export const TILE_TEXT_HOME = 'flex w-full min-w-0 flex-col items-center gap-0.5';
export const TILE_TEXT_DOCKED = 'flex min-w-0 flex-1 flex-col items-start gap-0';

/** Title. Identical size in both modes on purpose — a font-size change cannot be tweened
 *  without reflowing every frame, so it would have to snap. */
export const TILE_LABEL_HOME =
  'line-clamp-2 w-full text-[14px] font-semibold leading-tight text-slate-800 ' +
  'dark:text-slate-100';

export const TILE_LABEL_DOCKED =
  'w-full truncate text-[13.5px] font-semibold leading-tight text-slate-700 ' +
  'dark:text-slate-200';

/** Meta line. Rendered in BOTH modes — nothing is conditionally mounted inside the tile, so
 *  nothing can pop in or out mid-morph. It simply travels with the card. */
export const TILE_META_HOME = 'text-[11.5px] font-medium text-slate-400 dark:text-slate-500';
export const TILE_META_DOCKED = 'truncate text-[11px] font-medium text-slate-400 dark:text-slate-500';

/** Corner alert. Absolute, so it can never change the plate's size. */
export const TILE_BADGE =
  'absolute -right-[6px] -top-[6px] inline-flex min-w-[19px] items-center justify-center ' +
  'rounded-full bg-rose-600 px-[4px] py-[2px] text-[10.5px] font-bold leading-none text-white ' +
  'ring-2 ring-white dark:ring-slate-800';

/**
 * Icon sizes are DERIVED from the glyph box, not written down, so the ratio cannot drift.
 *
 * That ratio is load-bearing. The icon is never animated: when framer scales the plate during
 * the morph, the icon scales with it for free, and because the ratio is identical in both
 * modes it lands on exactly the size the destination renders — no pop at either end, and no
 * per-frame `fontSize` reflow.
 */
const ICON_TO_GLYPH = 0.5;
export const TILE_ICON_SIZE_HOME = GLYPH_SIZE.home * ICON_TO_GLYPH;
export const TILE_ICON_SIZE_DOCKED = GLYPH_SIZE.docked * ICON_TO_GLYPH;

// ─────────────────────────────────────────────────────────────────────────────
// DOCK — HOME AFFORDANCE
// ─────────────────────────────────────────────────────────────────────────────

export const DOCK_HOME_LINK =
  'group flex w-full flex-row items-center gap-[12px] rounded-xl px-[10px] py-[8px] text-left ' +
  'hover:bg-slate-100 dark:hover:bg-slate-800/70 ' + FOCUS_RING;

export const DOCK_HOME_GLYPH =
  'flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl border-[1px] border-slate-200 ' +
  'bg-white/100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400';

export const DOCK_HOME_LABEL =
  'min-w-0 flex-1 truncate text-[13.5px] font-semibold text-slate-600 dark:text-slate-300';

export const DOCK_DIVIDER = 'my-[12px] h-px w-full bg-slate-200 dark:bg-slate-800';

// ─────────────────────────────────────────────────────────────────────────────
// HOME STAGE  (hero)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `mx-auto` + `max-w-[36rem]`, NOT flex centring.
 *
 * Auto margins on a max-width block centre it inside ANY container, whatever that container's
 * display happens to be. The previous version relied on the parent being a flex row with
 * `justify-center` — and the parent shrink-wrapped, so the hero centred inside a 546px box
 * sitting at the left of the page instead of on the page. Auto margins cannot be defeated
 * that way.
 */
export const HERO_WRAP =
  'mx-auto flex w-full max-w-[36rem] flex-col items-center gap-[10px] text-center';

export const HERO_EYEBROW =
  'text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700/70 dark:text-blue-300/70';

/** The typographic anchor of the whole product. Tight tracking at large sizes is what
 *  separates an enterprise headline from a default h1. */
export const HERO_TITLE =
  'text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900 sm:text-[32px] ' +
  'lg:text-[38px] dark:text-slate-50';

export const HERO_SUBTITLE =
  'max-w-[34rem] text-[14px] leading-relaxed text-slate-500 sm:text-[15px] dark:text-slate-400';

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────

/** Full width; its content centres itself with auto margins (see HERO_WRAP).
 *  `relative z-10` for the same reason as DOCK_HOME — above the ambient canvas. */
export const WORKSPACE_HOME = 'relative z-10 w-full';

/**
 * The workspace — column 2.
 *
 * No `flex-1`: it occupies the second grid track, so its left edge is fixed by the track
 * boundary and its padding is a CONSTANT left margin from that seam. The gutter between
 * navigation and workspace is therefore identical for every application.
 */
export const WORKSPACE_DOCKED =
  'w-full min-w-0 pt-[4px] lg:px-[24px] lg:py-[24px]';

/** No cap and no auto margins: the working area runs the full width of its track. A
 *  max-width here centred the content and left a dead gutter on both sides — ~80px per
 *  side at 1920, on top of the padding above. */
export const WORKSPACE_INNER = 'w-full min-w-0';

export const WORKSPACE_TITLE =
  'text-[22px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[26px] ' +
  'dark:text-slate-50';

export const WORKSPACE_SUBTITLE = 'mt-[4px] text-[13.5px] text-slate-500 dark:text-slate-400';

export const HEADER_WRAP = 'mb-[24px] flex flex-col gap-[16px]';

export const HEADER_IDENTITY = 'flex items-center gap-[14px]';

/** The application's plate, echoed from its dock tile at header size. */
export const HEADER_GLYPH =
  'flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-2xl sm:h-[48px] sm:w-[48px]';

export const HEADER_RULE = 'h-px w-full bg-slate-200 dark:bg-slate-800';

/** Compact-only return path. On phones and portrait tablets there is no rail to go back to. */
export const HEADER_BACK =
  'inline-flex items-center gap-[6px] self-start rounded-lg border-[1px] border-slate-200 px-[10px] ' +
  'py-[6px] lg:hidden dark:border-slate-700 ' + FOCUS_RING;

/** Colour on the inner span, not the <a>. */
export const HEADER_BACK_TEXT = 'text-[12.5px] font-semibold text-slate-600 dark:text-slate-300';

// ─────────────────────────────────────────────────────────────────────────────
// BREADCRUMB
// ─────────────────────────────────────────────────────────────────────────────

export const BREADCRUMB_NAV = 'flex min-w-0 flex-wrap items-center gap-[6px] text-[12.5px]';

/**
 * Crumb colour. Lives on an inner <span>, NEVER on the <a> — Reboot's `a { color }` is
 * unlayered and beats every text-* utility. Hover is a colour change only: no transition, no
 * transform. A link with zero hover affordance is an accessibility problem, not polish.
 */
export const BREADCRUMB_LINK =
  'font-semibold text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300';

export const BREADCRUMB_CURRENT = 'truncate font-semibold text-slate-700 dark:text-slate-300';

export const BREADCRUMB_SEP = 'select-none text-slate-300 dark:text-slate-600';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE STRIP
// ─────────────────────────────────────────────────────────────────────────────
// Horizontal and scrollable rather than wrapping: a wrapping tab row changes the header's
// height as the application changes, which shifts the content underneath it.

export const STRIP_SCROLLER = 'no-scrollbar -mb-px w-full overflow-x-auto';
export const STRIP_ROW = 'flex w-max min-w-full items-stretch gap-1 border-b border-slate-200 dark:border-slate-800';

/** The <a> carries layout + the underline only — no colour (Reboot would win). */
export const STRIP_TAB =
  'relative whitespace-nowrap border-b-2 border-transparent px-[12px] pb-[10px] pt-[4px] ' + FOCUS_RING;

export const STRIP_TAB_ACTIVE = 'border-blue-600 dark:border-blue-400';

/** Colour + weight live on the inner span. */
export const STRIP_TAB_TEXT =
  'text-[13px] font-medium text-slate-500 group-hover:text-slate-800 dark:text-slate-400 ' +
  'dark:group-hover:text-slate-100';

export const STRIP_TAB_TEXT_ACTIVE = 'font-semibold text-slate-900 dark:text-slate-50';

export const STRIP_BADGE =
  'ml-[6px] inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-600 ' +
  'px-[4px] text-[10px] font-bold leading-4 text-white';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE CARDS
// ─────────────────────────────────────────────────────────────────────────────
// Horizontal cards in a responsive grid, not a row of small tiles: they fill wide screens
// instead of stranding a gutter, they stay readable at 30 items, and they collapse to a
// single comfortable column on a phone.

/** One column on a phone, two on a tablet/laptop, three on a desktop, four on ultrawide —
 *  so the grid fills the width it is given instead of stranding a gutter. */
export const MODULE_GRID =
  'grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

export const MODULE_CELL =
  'group flex cursor-pointer items-center gap-[14px] rounded-2xl border-[1px] border-slate-200/90 ' +
  'bg-white/100 p-[14px] text-left ' +
  'shadow-[0_1px_2px_rgba(15,23,42,0.03),0_6px_16px_-10px_rgba(15,23,42,0.14)] ' +
  'dark:border-slate-700/80 dark:bg-slate-800/60 ' +
  'dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_6px_16px_-10px_rgba(0,0,0,0.6)] ' +
  FOCUS_RING;

/** Neutral plate with an accent glyph — one step quieter than the application tiles, so the
 *  rail and the workspace never compete for the same level of attention. */
export const MODULE_GLYPH =
  'relative flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl border-[1px] ' +
  // `bg-slate-50/100`, not `bg-slate-50`: src/main.css defines `.bg-slate-50 { … !important }`
  // for the legacy dashboard, which is unlayered and beat both this and its dark: variant —
  // the plate rendered near-white in dark mode. The opacity modifier yields a class name
  // nothing else defines. Same escape as `bg-white/100`.
  'border-slate-200 bg-slate-50/100 dark:border-slate-700 dark:bg-slate-900/60';

export const MODULE_TEXT = 'flex min-w-0 flex-1 flex-col';

export const MODULE_LABEL =
  'truncate text-[13.5px] font-semibold text-slate-800 dark:text-slate-100';

export const MODULE_META = 'truncate text-[11.5px] text-slate-400 dark:text-slate-500';

export const MODULE_ICON_SIZE = 21;

export const CLUSTER_WRAP = 'flex flex-col gap-[12px]';

export const CLUSTER_HEADING =
  'flex items-center gap-[10px] text-[11px] font-bold uppercase tracking-[0.14em] ' +
  'text-slate-400 dark:text-slate-500';

export const CLUSTER_RULE = 'h-px flex-1 bg-slate-200 dark:bg-slate-800';

/**
 * An application declared ahead of its modules (see NavigationItem.allowEmpty).
 *
 * A dashed border rather than the solid one module cards use: this is a reserved
 * space, and it should not read as a card that failed to load its contents.
 */
export const EMPTY_APP_WRAP =
  'flex flex-col items-center gap-[6px] rounded-[14px] border border-dashed ' +
  'border-slate-300 bg-slate-50/60 px-[24px] py-[44px] text-center ' +
  'dark:border-slate-700 dark:bg-slate-900/40';

export const EMPTY_APP_TITLE =
  'text-[15px] font-semibold text-slate-600 dark:text-slate-300';

export const EMPTY_APP_TEXT =
  'max-w-[46ch] text-[13px] leading-[1.55] text-slate-500 dark:text-slate-400';

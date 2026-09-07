/**
 * The legend, as a control surface rather than a caption.
 *
 * Three changes from the nine static rows it replaces:
 *
 *  - It carries COUNTS, which is the question the screen exists to answer and
 *    which nobody should have to get by counting circles.
 *  - It FILTERS. Isolating "Absent" is the most common thing anyone does with
 *    an attendance calendar after opening it.
 *  - Entries with a zero count are rendered disabled rather than hidden, so the
 *    row does not reflow as you page between months.
 *
 * Counts come from the server alongside the days, so the legend, the summary
 * and the tiles cannot disagree.
 *
 * Each swatch is drawn by the SAME resolver the tiles use — a chip can never
 * drift from the thing it describes.
 */
import { memo, useMemo } from 'react';
import { cn } from '@app/modules/common/components/ui/tw/cn';
import { useIsDark, toneSurface } from '@app/modules/common/components/ui/tw/useIsDark';
import { legendLabel, resolveLegendVisual, shouldPulse, type DayLabelOverrides, type DayToneOverrides, type ModifierToneOverrides } from './dayTokens';
import { LEGEND_TONES } from './appearance';
import type { LegendEntry, LegendKey } from './types';

export interface CalendarLegendProps {
  legend: LegendEntry[];
  active: Set<LegendKey>;
  overrides?: DayToneOverrides;
  /** Admin colours for modifier dots — see dayTokens.ModifierToneOverrides. */
  modifierOverrides?: ModifierToneOverrides;
  /** Admin-renamed entries, from the appearance registry. */
  labels?: DayLabelOverrides;
  onToggle: (key: LegendKey) => void;
  onClear: () => void;
}

export const CalendarLegend = memo(function CalendarLegend({
  legend,
  active,
  overrides,
  modifierOverrides,
  labels,
  onToggle,
  onClear,
}: CalendarLegendProps) {
  const filtering = active.size > 0;

  /**
   * The rows come from the REGISTRY; the server only supplies the numbers.
   *
   * It used to be the other way round, and that made the server's
   * `LEGEND_ORDER` a separate hand-kept list from the one Appearance Settings
   * renders — so the legend and the colour picker showed different things, and
   * `remote` / `on_site` were painted on tiles with no chip to explain them.
   *
   * Anything the server counts but the registry does not name is dropped rather
   * than rendered raw, and anything named but not counted shows a zero, which
   * the chip already renders dimmed.
   */
  const rows = useMemo(() => {
    const counts = new Map(legend.map((e) => [e.key, e.count]));
    return LEGEND_TONES.map((spec) => ({
      key: spec.key as LegendKey,
      label: labels?.[spec.key] || spec.label,
      count: counts.get(spec.key as LegendKey) ?? 0,
    }));
  }, [legend, labels]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500">
          Legend {filtering && <span className="text-[#1E3A8A] dark:text-[#8AA3EC]">· filtered</span>}
        </p>
        {filtering && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-[#1E3A8A] hover:bg-[#EAF0FA] dark:text-[#8AA3EC] dark:hover:bg-white/[0.06]"
          >
            Clear
          </button>
        )}
      </div>

      {/* On narrow viewports this becomes a snap-scrolling strip rather than a
          nine-row wall of text — the failure mode of the current legend. */}
      <div
        role="group"
        aria-label="Filter days by status"
        className={cn(
          'flex gap-1.5',
          'max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:snap-x max-sm:snap-proximity max-sm:-mx-1 max-sm:px-1 max-sm:pb-1',
          'sm:flex-wrap',
        )}
      >
        {rows.map((entry) => (
          <LegendChip
            key={entry.key}
            entry={entry}
            pressed={active.has(entry.key)}
            faded={filtering && !active.has(entry.key)}
            overrides={overrides}
            modifierOverrides={modifierOverrides}
            labels={labels}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
});

function LegendChip({
  entry,
  pressed,
  faded,
  overrides,
  modifierOverrides,
  labels,
  onToggle,
}: {
  entry: LegendEntry;
  pressed: boolean;
  faded: boolean;
  overrides?: DayToneOverrides;
  modifierOverrides?: ModifierToneOverrides;
  labels?: DayLabelOverrides;
  onToggle: (key: LegendKey) => void;
}) {
  const dark = useIsDark();
  const v = resolveLegendVisual(entry.key, overrides, modifierOverrides);
  const t = toneSurface(v.trio, dark);
  const empty = entry.count === 0;

  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={empty}
      onClick={() => onToggle(entry.key)}
      // No `title` — the visible count already says "0", and a raw title would
      // render the browser's own tooltip instead of the app's (lint-enforced).
      aria-label={`${legendLabel(entry.key, labels)}: ${entry.count} ${entry.count === 1 ? 'day' : 'days'}${empty ? '' : pressed ? ' — filter on' : ' — filter off'}`}
      className={cn(
        // rounded-full, not rounded-2xl: at 16px radius on a ~26px chip the corners
        // read as a squared-off rectangle rather than a pill. StatusBadge keeps
        // rounded-2xl because it wraps to two lines; these never do.
        'group inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-2.5 py-[4px]',
        'transition-[opacity,transform,box-shadow] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] dark:focus-visible:ring-[#8AA3EC]',
        !empty && 'hover:-translate-y-px cursor-pointer',
        faded && 'opacity-40',
        empty && 'opacity-30 cursor-default',
        pressed && 'shadow-[0_0_0_1.5px_currentColor]',
      )}
      style={{
        backgroundColor: pressed ? t.bg : 'transparent',
        borderColor: pressed ? t.bd : dark ? '#30363d' : '#E6E9EE',
        color: t.fg,
        // Inline, not the `rounded-full` class. Bootstrap Reboot's
        // `button { border-radius: 0 }` is UNLAYERED and loads after Tailwind,
        // so it beats every rounded-* utility regardless of specificity. An
        // inline style outranks both, and unlike a global override it changes
        // nothing outside this chip.
        borderRadius: 9999,
      }}
    >
      <Swatch
        fill={v.fill}
        ring={v.ring}
        accent={v.trio.c}
        splitWith={v.splitWith?.c}
        dot={v.dots[0]?.trio.c}
        // Only while the entry is actually present this month — pulsing a
        // zero-count chip advertises attention nothing needs.
        pulse={shouldPulse(entry.key) && !empty}
      />
      <span className="text-[11.5px] font-bold leading-[1.3] text-slate-700 dark:text-slate-300 whitespace-nowrap">
        {/* The admin's name outranks the server's: a company that renames
            "Regularised" should see that name here, not the shipped default. */}
        {labels?.[entry.key] || entry.label || legendLabel(entry.key)}
      </span>
      <span className="text-[11.5px] font-extrabold tabular-nums leading-[1.3]" style={{ color: t.fg }}>
        {entry.count}
      </span>
    </button>
  );
}

/**
 * The swatch mirrors the tile's own shape language, not just its colour.
 *
 * `pulse` applies the kit's `wt-dot-pulse`, the animation `StatusBadge` uses
 * for "Approval Pending". The keyframes ring with `currentColor`, so each
 * branch sets `color` to its own accent — otherwise the halo inherits whatever
 * text colour happens to be in scope and the ring reads as a different hue
 * from the dot it surrounds.
 */
function Swatch({
  fill,
  ring,
  accent,
  splitWith,
  dot,
  pulse,
}: {
  fill: string;
  ring: string;
  accent: string;
  splitWith?: string;
  dot?: string;
  pulse?: boolean;
}) {
  const base = 'block size-[9px] shrink-0 rounded-full';
  if (ring !== 'none') {
    return (
      <i
        aria-hidden="true"
        className={cn(base, pulse && 'wt-dot-pulse')}
        style={{
          borderWidth: 2,
          borderStyle: ring === 'dashed' ? 'dashed' : 'solid',
          borderColor: accent,
          color: accent,
        }}
      />
    );
  }
  if (fill === 'split') {
    return (
      <i
        aria-hidden="true"
        className={base}
        style={{ background: `linear-gradient(105deg, ${accent} 0 50%, ${splitWith ?? accent} 50% 100%)` }}
      />
    );
  }
  if (dot) {
    // A modifier: a small dot, matching how it appears beneath the numeral.
    return (
      <span aria-hidden="true" className="grid size-[9px] shrink-0 place-items-end justify-center">
        <i
          className={cn('block size-[5px] rounded-full', pulse && 'wt-dot-pulse')}
          style={{ backgroundColor: dot, color: dot }}
        />
      </span>
    );
  }
  return <i aria-hidden="true" className={base} style={{ backgroundColor: accent, opacity: fill === 'tint' ? 0.45 : 1 }} />;
}

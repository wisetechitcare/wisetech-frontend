import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

export type TileState =
  | 'default'
  | 'today'
  | 'weekend'
  | 'public-holiday'
  | 'past-leave'
  | 'pending-leave'
  | 'disabled'
  | 'efficiency-high'
  | 'efficiency-mid'
  | 'efficiency-low'
  | 'hover-preview'
  | 'in-range'
  | 'range-start'
  | 'range-end';

export interface TileStateContext {
  /** Committed [start, end] — null when no range is committed. */
  committedRange: [Date, Date] | null;
  /** Set after first click while awaiting second. null when no selection in progress. */
  startOnly: Date | null;
  /** Current hovered date (used for preview band in start-set phase). */
  hoveredDate: Date | null;
  holidaySet: Set<string>;
  isWeekend: (date: Date) => boolean;
  isDisabled: (date: Date) => boolean;
  /** Returns a 0–5 adjacency score (higher = more free days around this date). */
  efficiencyScore: (date: Date) => number;
  existingLeaves?: Array<{ dateFrom: string; dateTo: string; status: number }>;
}

// Maps each state to its CSS class (existing naming convention preserved).
const STATE_CLASS: Partial<Record<TileState, string>> = {
  'range-start':     'leave-request-calendar__tile--range-start',
  'range-end':       'leave-request-calendar__tile--range-end',
  'in-range':        'leave-request-calendar__tile--selected-range',
  'hover-preview':   'leave-request-calendar__tile--hover-preview',
  'public-holiday':  'leave-request-calendar__tile--holiday',
  'weekend':         'leave-request-calendar__tile--weekend',
  'efficiency-high': 'leave-request-calendar__tile--eff-high',
  'efficiency-mid':  'leave-request-calendar__tile--eff-mid',
  'efficiency-low':  'leave-request-calendar__tile--eff-low',
  'today':           'leave-request-calendar__tile--today',
  'past-leave':      'leave-request-calendar__tile--past-leave',
  'pending-leave':   'leave-request-calendar__tile--pending-leave',
};

// When a higher-priority state is present, these background states lose their CSS class.
// Semantic tags (H, W) rendered via tileContent are unaffected.
const SUPPRESS: Partial<Record<TileState, TileState[]>> = {
  'in-range':      ['efficiency-high', 'efficiency-mid', 'efficiency-low'],
  'hover-preview': ['efficiency-high', 'efficiency-mid', 'efficiency-low'],
  'range-start':   ['efficiency-high', 'efficiency-mid', 'efficiency-low'],
  'range-end':     ['efficiency-high', 'efficiency-mid', 'efficiency-low'],
  'disabled':      ['in-range', 'hover-preview', 'range-start', 'range-end',
                    'efficiency-high', 'efficiency-mid', 'efficiency-low',
                    'public-holiday', 'weekend'],
};

/**
 * Derives the ordered list of states for a single calendar tile.
 * Priority: disabled > range > hover-preview > existing-leave > holiday > weekend > today > efficiency.
 */
export function resolveTileStates(date: Date, ctx: TileStateContext): TileState[] {
  const { committedRange, startOnly, hoveredDate, holidaySet, isWeekend, isDisabled, efficiencyScore, existingLeaves } = ctx;
  const d = dayjs(date);
  const dateStr = d.format('YYYY-MM-DD');
  const states: TileState[] = [];

  // ── Priority 1: Disabled ──────────────────────────────────────────────
  if (isDisabled(date)) return ['disabled'];

  // ── Priority 2–3: Committed range ────────────────────────────────────
  if (committedRange) {
    const [start, end] = committedRange;
    const isStart = d.isSame(dayjs(start), 'day');
    const isEnd   = d.isSame(dayjs(end),   'day');
    const inRange = d.isBetween(dayjs(start), dayjs(end), 'day', '[]');

    if (isStart) states.push('range-start');
    if (isEnd)   states.push('range-end');
    if (inRange && !isStart && !isEnd) states.push('in-range');
  }

  // ── Priority 3: Hover preview / start-only marker ─────────────────────
  if (!committedRange && startOnly) {
    if (!hoveredDate) {
      // No hover yet — show start tile as a single-day circle.
      if (d.isSame(dayjs(startOnly), 'day')) {
        states.push('range-start');
        states.push('range-end');
      }
    } else {
      // Hover active — draw provisional band in both directions.
      const fwd = dayjs(startOnly).isBefore(dayjs(hoveredDate));
      const previewStart = fwd ? startOnly  : hoveredDate;
      const previewEnd   = fwd ? hoveredDate : startOnly;

      if (d.isBetween(dayjs(previewStart), dayjs(previewEnd), 'day', '[]')) {
        const isPS = d.isSame(dayjs(previewStart), 'day');
        const isPE = d.isSame(dayjs(previewEnd),   'day');
        if      (isPS) states.push('range-start');
        else if (isPE) states.push('range-end');
        else           states.push('hover-preview');
      }
    }
  }

  // ── Priority 4: Existing leave overlay ───────────────────────────────
  if (existingLeaves?.length) {
    const match = existingLeaves.find(l =>
      d.isBetween(dayjs(l.dateFrom), dayjs(l.dateTo), 'day', '[]')
    );
    if (match) states.push(match.status === 1 ? 'past-leave' : 'pending-leave');
  }

  // ── Priority 5–6: Holiday + Weekend ──────────────────────────────────
  if (holidaySet.has(dateStr)) states.push('public-holiday');
  if (isWeekend(date))         states.push('weekend');

  // ── Priority 7: Today ────────────────────────────────────────────────
  if (d.isSame(dayjs(), 'day')) states.push('today');

  // ── Priority 8–9: Efficiency (only for plain working days) ───────────
  const hasSelectionState = states.some(s =>
    ['range-start', 'range-end', 'in-range', 'hover-preview', 'past-leave', 'pending-leave'].includes(s)
  );
  const isSpecialDay = states.some(s => ['public-holiday', 'weekend'].includes(s));

  if (!hasSelectionState && !isSpecialDay) {
    const eff = efficiencyScore(date);
    if      (eff >= 3) states.push('efficiency-high');
    else if (eff === 2) states.push('efficiency-mid');
    else                states.push('efficiency-low');
  }

  return states.length > 0 ? states : ['default'];
}

/**
 * Converts a resolved states array into CSS class strings,
 * applying background-suppression rules before mapping.
 */
export function statesToClassNames(states: TileState[]): string[] {
  const suppressed = new Set<TileState>();
  states.forEach(s => SUPPRESS[s]?.forEach(t => suppressed.add(t)));

  return states
    .filter(s => !suppressed.has(s))
    .flatMap(s => (STATE_CLASS[s] ? [STATE_CLASS[s]!] : []));
}

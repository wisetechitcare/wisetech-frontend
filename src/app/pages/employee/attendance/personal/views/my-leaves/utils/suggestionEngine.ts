import dayjs from 'dayjs';
import { computeLeaveBreakdown } from '@utils/leaveCalcEngine';

// ─── Public types ────────────────────────────────────────────────────────────

export type EfficiencyTier = 'JACKPOT' | 'EXCELLENT' | 'GOOD' | 'DECENT';
export type BridgePattern = 'PRE_BRIDGE' | 'POST_BRIDGE' | 'DOUBLE_BRIDGE' | 'SANDWICH_BRIDGE';

export interface Suggestion {
  start: Date;
  end: Date;
  leaveDays: number;
  daysOff: number;
  efficiency: number;
  tier: EfficiencyTier;
  pattern: BridgePattern;
  description: string;
  /** Human-readable explanation of why this appeared in "For You" */
  reason?: string;
}

export interface SuggestionEngineInput {
  windowStart: Date;
  windowEnd: Date;
  holidays: Set<string>;
  isWeekendFn: (d: Date) => boolean;
  balanceAvailable: number;
  capRemaining: number;
  existingLeaves: Array<{ dateFrom: string; dateTo: string }>;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface DayEntry {
  iso: string;
  date: Date;
  isWorking: boolean;
}

interface FreeBlock {
  startIdx: number;
  endIdx: number;
}

interface Candidate {
  startIdx: number;
  endIdx: number;
  pattern: BridgePattern;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assignTier(e: number): EfficiencyTier {
  if (e >= 4.0) return 'JACKPOT';
  if (e >= 3.0) return 'EXCELLENT';
  if (e >= 2.0) return 'GOOD';
  return 'DECENT';
}

function rangesOverlap(
  aFrom: string, aTo: string,
  bFrom: string, bTo: string,
): boolean {
  return aFrom <= bTo && bFrom <= aTo;
}

function overlapsExisting(
  startIso: string,
  endIso: string,
  existingLeaves: SuggestionEngineInput['existingLeaves'],
): boolean {
  return existingLeaves.some(l => rangesOverlap(startIso, endIso, l.dateFrom.slice(0, 10), l.dateTo.slice(0, 10)));
}

function candidatesOverlap(a: Candidate, b: Candidate): boolean {
  return a.startIdx <= b.endIdx && b.startIdx <= a.endIdx;
}

// ─── Phase 1 — SCAN ──────────────────────────────────────────────────────────

function buildDayMap(input: SuggestionEngineInput): DayEntry[] {
  const days: DayEntry[] = [];
  let cur = dayjs(input.windowStart).startOf('day');
  const end = dayjs(input.windowEnd).startOf('day');
  while (cur.isBefore(end) || cur.isSame(end, 'day')) {
    const date = cur.toDate();
    const iso = cur.format('YYYY-MM-DD');
    days.push({ iso, date, isWorking: !input.isWeekendFn(date) && !input.holidays.has(iso) });
    cur = cur.add(1, 'day');
  }
  return days;
}

// ─── Phase 2 — CLUSTER ───────────────────────────────────────────────────────

function findFreeBlocks(days: DayEntry[]): FreeBlock[] {
  const blocks: FreeBlock[] = [];
  let i = 0;
  while (i < days.length) {
    if (!days[i].isWorking) {
      const start = i;
      while (i < days.length && !days[i].isWorking) i++;
      blocks.push({ startIdx: start, endIdx: i - 1 });
    } else {
      i++;
    }
  }
  return blocks;
}

// ─── Phase 3 — BRIDGE ────────────────────────────────────────────────────────

function collectWorkdaysBefore(days: DayEntry[], blockStartIdx: number, count: number): number {
  let found = 0;
  let idx = blockStartIdx - 1;
  while (idx >= 0 && found < count) {
    if (days[idx].isWorking) found++;
    idx--;
  }
  // Return the index of the furthest workday we stepped back to
  return idx + 1;
}

function collectWorkdaysAfter(days: DayEntry[], blockEndIdx: number, count: number): number {
  let found = 0;
  let idx = blockEndIdx + 1;
  while (idx < days.length && found < count) {
    if (days[idx].isWorking) found++;
    idx++;
  }
  return idx - 1;
}

function generateCandidates(days: DayEntry[], blocks: FreeBlock[]): Candidate[] {
  const candidates: Candidate[] = [];
  const tomorrow = dayjs().add(1, 'day').startOf('day');

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];

    // PRE_BRIDGE — 1, 2, 3 workdays before
    for (let n = 1; n <= 3; n++) {
      const startIdx = collectWorkdaysBefore(days, block.startIdx, n);
      if (startIdx < 0) break;
      if (!dayjs(days[startIdx].iso).isBefore(tomorrow) || dayjs(days[startIdx].iso).isSame(tomorrow, 'day')) {
        candidates.push({ startIdx, endIdx: block.endIdx, pattern: 'PRE_BRIDGE' });
      }
    }

    // POST_BRIDGE — 1, 2, 3 workdays after
    for (let n = 1; n <= 3; n++) {
      const endIdx = collectWorkdaysAfter(days, block.endIdx, n);
      if (endIdx >= days.length) break;
      candidates.push({ startIdx: block.startIdx, endIdx, pattern: 'POST_BRIDGE' });
    }

    // DOUBLE_BRIDGE — workdays on both sides
    for (let before = 1; before <= 2; before++) {
      for (let after = 1; after <= 2; after++) {
        const startIdx = collectWorkdaysBefore(days, block.startIdx, before);
        const endIdx = collectWorkdaysAfter(days, block.endIdx, after);
        if (startIdx < 0 || endIdx >= days.length) continue;
        candidates.push({ startIdx, endIdx, pattern: 'DOUBLE_BRIDGE' });
      }
    }

    // SANDWICH_BRIDGE — gap between this block and next (≤ 3 working days)
    if (bi + 1 < blocks.length) {
      const next = blocks[bi + 1];
      const gapStart = block.endIdx + 1;
      const gapEnd = next.startIdx - 1;
      // Count working days in gap
      let workingInGap = 0;
      for (let g = gapStart; g <= gapEnd; g++) {
        if (days[g].isWorking) workingInGap++;
      }
      if (workingInGap > 0 && workingInGap <= 3) {
        candidates.push({ startIdx: block.startIdx, endIdx: next.endIdx, pattern: 'SANDWICH_BRIDGE' });
      }
    }
  }

  return candidates;
}

// ─── Phase 4 — SCORE ─────────────────────────────────────────────────────────

function scoreCandidate(
  candidate: Candidate,
  days: DayEntry[],
  input: SuggestionEngineInput,
): (Suggestion & { compositeScore: number }) | null {
  const startDay = days[candidate.startIdx];
  const endDay = days[candidate.endIdx];

  // Must start in the future
  const tomorrow = dayjs().add(1, 'day').startOf('day');
  if (dayjs(startDay.iso).isBefore(tomorrow)) return null;

  const breakdown = computeLeaveBreakdown(startDay.date, endDay.date, input.holidays, input.isWeekendFn);
  const { chargeable: leaveDays, totalCalendarDays: daysOff } = breakdown;

  if (leaveDays === 0) return null;

  const efficiency = daysOff / leaveDays;
  if (efficiency <= 1.0) return null;
  if (leaveDays > input.balanceAvailable) return null;
  if (leaveDays > input.capRemaining) return null;
  if (overlapsExisting(startDay.iso, endDay.iso, input.existingLeaves)) return null;

  const daysUntilStart = dayjs(startDay.iso).diff(dayjs().startOf('day'), 'day');
  const proximity = daysUntilStart > 0 ? Math.min(1, 1 / daysUntilStart) : 0;
  const economy = 1 / leaveDays;
  const balanceHealth = input.balanceAvailable > 0
    ? Math.max(0, (input.balanceAvailable - leaveDays) / input.balanceAvailable)
    : 0;

  const compositeScore =
    efficiency * 0.50 +
    economy    * 0.25 +
    proximity  * 0.15 +
    balanceHealth * 0.10;

  const tier = assignTier(efficiency);
  const description = `Take ${leaveDays} ${leaveDays === 1 ? 'leave' : 'leaves'} for ${daysOff} days off`;

  return {
    start: startDay.date,
    end: endDay.date,
    leaveDays,
    daysOff,
    efficiency,
    tier,
    pattern: candidate.pattern,
    description,
    compositeScore,
  };
}

// ─── Phase 5 — FILTER + RANK ─────────────────────────────────────────────────

function deduplicateCandidates(
  scored: Array<Candidate & { compositeScore: number }>,
): Array<Candidate & { compositeScore: number }> {
  const kept: Array<Candidate & { compositeScore: number }> = [];
  for (const c of scored) {
    if (!kept.some(k => candidatesOverlap(k, c))) {
      kept.push(c);
    }
  }
  return kept;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateSmartSuggestions(
  input: SuggestionEngineInput,
  maxSuggestions = 3,
): Suggestion[] {
  if (input.balanceAvailable <= 0 && isFinite(input.capRemaining) && input.capRemaining <= 0) {
    return [];
  }

  // Phase 1
  const days = buildDayMap(input);
  // Phase 2
  const blocks = findFreeBlocks(days);
  if (blocks.length === 0) return [];
  // Phase 3
  const candidates = generateCandidates(days, blocks);
  // Phase 4 — score and filter
  const scored: Array<Suggestion & { compositeScore: number }> = [];
  for (const c of candidates) {
    const result = scoreCandidate(c, days, input);
    if (result) scored.push(result);
  }
  // Phase 5 — sort, deduplicate, top N
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const deduplicated: Array<Suggestion & { compositeScore: number }> = [];
  for (const s of scored) {
    if (deduplicated.length >= maxSuggestions) break;
    const overlaps = deduplicated.some(k =>
      dayjs(k.start).isBefore(dayjs(s.end)) && dayjs(s.start).isBefore(dayjs(k.end)),
    );
    if (!overlaps) deduplicated.push(s);
  }

  return deduplicated.map(({ compositeScore: _c, ...s }) => s);
}

// ─── Personalization ─────────────────────────────────────────────────────────

interface EmployeePreferences {
  preferredMonths: Set<number>;
  avgDuration: number;
}

function extractPreferences(
  history: Array<{ dateFrom: string; dateTo: string; statusNumber?: number }>,
): EmployeePreferences {
  const approved = history.filter(l => l.statusNumber === 1);
  if (approved.length < 2) {
    return {
      preferredMonths: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
      avgDuration: 3,
    };
  }
  const preferredMonths = new Set(approved.map(l => dayjs(l.dateFrom).month()));
  const durations = approved.map(l => dayjs(l.dateTo).diff(dayjs(l.dateFrom), 'day') + 1);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  return { preferredMonths, avgDuration };
}

export interface PersonalizedSuggestionInput extends SuggestionEngineInput {
  leaveHistory: Array<{ dateFrom: string; dateTo: string; statusNumber?: number }>;
}

export function generatePersonalizedSuggestions(
  input: PersonalizedSuggestionInput,
  generalSuggestions: Suggestion[],
  max = 2,
): Suggestion[] {
  const approved = input.leaveHistory.filter(l => l.statusNumber === 1);
  const hasSufficientHistory = approved.length >= 2;

  const windowEnd = hasSufficientHistory
    ? dayjs(input.windowStart).add(365, 'day').toDate()
    : dayjs(input.windowStart).add(60, 'day').toDate();

  const prefs = extractPreferences(input.leaveHistory);

  const wideInput: SuggestionEngineInput = { ...input, windowEnd };

  if (wideInput.balanceAvailable <= 0 && isFinite(wideInput.capRemaining) && wideInput.capRemaining <= 0) {
    return [];
  }

  const days = buildDayMap(wideInput);
  const blocks = findFreeBlocks(days);
  if (blocks.length === 0) return [];
  const candidates = generateCandidates(days, blocks);

  const scored: Array<Suggestion & { compositeScore: number; personalScore: number }> = [];
  for (const c of candidates) {
    const result = scoreCandidate(c, days, wideInput);
    if (!result) continue;
    const month = dayjs(result.start).month();
    const monthMatches = hasSufficientHistory && prefs.preferredMonths.has(month);
    const durationMatches = hasSufficientHistory && Math.abs(result.daysOff - prefs.avgDuration) <= 2;
    const monthBoost = monthMatches ? 1.5 : 0.7;
    const durationBoost = durationMatches ? 1.2 : 0.9;
    const personalScore = result.compositeScore * monthBoost * durationBoost;

    let reason: string | undefined;
    if (hasSufficientHistory) {
      const monthName = dayjs().month(month).format('MMMM');
      const avgDays = Math.round(prefs.avgDuration);
      if (monthMatches && durationMatches) {
        reason = `You often take leave in ${monthName} · close to your usual ${avgDays}-day trips`;
      } else if (monthMatches) {
        reason = `You often take leave in ${monthName}`;
      } else if (durationMatches) {
        reason = `Matches your usual ${avgDays}-day trips`;
      }
    }

    scored.push({ ...result, reason, personalScore });
  }

  scored.sort((a, b) => b.personalScore - a.personalScore);

  const result: Array<Suggestion & { compositeScore: number; personalScore: number }> = [];
  for (const s of scored) {
    if (result.length >= max) break;
    const overlapsGeneral = generalSuggestions.some(
      g => dayjs(g.start).isBefore(dayjs(s.end)) && dayjs(s.start).isBefore(dayjs(g.end)),
    );
    if (overlapsGeneral) continue;
    const overlapsResult = result.some(
      k => dayjs(k.start).isBefore(dayjs(s.end)) && dayjs(s.start).isBefore(dayjs(k.end)),
    );
    if (!overlapsResult) result.push(s);
  }

  return result.map(({ compositeScore: _c, personalScore: _p, ...s }) => s);
}

// ─── Backwards-compatible wrapper ────────────────────────────────────────────

export function generateMonthlySuggestions(
  month: Date,
  holidays: Set<string>,
  maxLeave: number,
  maxSuggestions = 3,
): Suggestion[] {
  const today = new Date();
  const windowEnd = dayjs(today).add(90, 'day').toDate();
  return generateSmartSuggestions(
    {
      windowStart: today,
      windowEnd,
      holidays,
      isWeekendFn: (d) => d.getDay() === 0 || d.getDay() === 6,
      balanceAvailable: maxLeave,
      capRemaining: Infinity,
      existingLeaves: [],
    },
    maxSuggestions,
  );
}

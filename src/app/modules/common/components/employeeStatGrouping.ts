import type { ReactNode } from 'react';

/**
 * employeeStatGrouping — the pure data layer behind the attendance stat modals.
 *
 * WHY THIS EXISTS
 * A stat modal lists one row per *occurrence*: one attendance row, one leave day,
 * one absent day. Over a single day that is also one row per employee, so the flat
 * list reads fine. Over a week or a month it is not: the same employee reappears
 * once per offending day, so a month of "Absent" for 30 people is ~600 cards and
 * the question the modal exists to answer — *who keeps doing this* — can only be
 * answered by scrolling and counting by hand.
 *
 * Grouping collapses those occurrences to one row per employee with a total. That
 * is a correctness/readability fix first and a performance fix second: the DOM
 * drops from O(occurrences) to O(employees), which for a month is roughly a 20×
 * reduction in rendered cards, and the drill-in only ever mounts one group.
 *
 * No React, no dayjs, no MUI — only the item shape (whose `meta` is opaque JSX) is
 * React-typed, and that import is erased at build. Keeping this module pure makes
 * the grouping/sorting independently testable and reusable by any future surface
 * (exports, reports, the personal attendance page) that needs the same rollup.
 *
 * Complexity: `groupEmployeeStatItems` is a single O(n) pass — one Map probe per
 * item, min/max tracked incrementally by lexicographic compare on ISO date strings
 * (no date parsing in the hot loop). Within-group ordering costs Σ kᵢ log kᵢ ≤
 * n log n, and in practice kᵢ ≤ 31. Space is O(g + n) holding *references* to the
 * caller's items — nothing is copied or re-rendered into a new shape.
 */

/** Sort options shared by the flat list, the grouped list and the modal's Sort By menu. */
export type StatSortOption =
    | 'name-asc'
    | 'name-desc'
    | 'checkin-asc'
    | 'checkin-desc'
    /** Highest total first — the default in weekly/monthly, so repeat offenders lead. */
    | 'count-desc'
    | 'count-asc'
    | 'none';

export interface EmployeeStatItem {
    /** Stable React key for this OCCURRENCE — usually the attendance id, or employee id + date. */
    key: string;
    name: string;
    code?: string | null;
    avatarUrl?: string | null;
    designation?: string | null;
    /** Caller-rendered extra content. Omit and the card stays a tight identity row. */
    meta?: ReactNode;
    /**
     * Stable EMPLOYEE identity. Distinct from `key`, which identifies the occurrence —
     * this is what collapses repeated rows into one group. Falls back to `code`, then
     * to the normalised name, so callers that cannot supply an id still group sanely.
     */
    employeeId?: string | null;
    /**
     * The day this occurrence belongs to, as ISO `YYYY-MM-DD` (`DATE_FORMATS.WIRE`).
     * ISO is deliberate: it sorts and compares correctly as a plain string, so the
     * grouping pass never parses a date. Formatting for display happens in the view.
     */
    date?: string | null;
    /**
     * Contribution to the group total. Defaults to 1. Half-day leave passes 0.5 so a
     * grouped total matches the stat card, which weights half-days at 0.5.
     */
    weight?: number;
    /**
     * Orderable instant for this occurrence (epoch ms — usually the check-in). `date`
     * alone can only order occurrences to the day, which makes "Check-in (Earliest)"
     * meaningless on a single day, where every row shares one date. Optional: rows with
     * no time (leave, absent) simply fall back to date ordering.
     */
    time?: number | null;
}

export interface EmployeeStatGroup {
    /** Stable identity for the group — namespaced so an id can never collide with a code. */
    key: string;
    name: string;
    code?: string | null;
    avatarUrl?: string | null;
    designation?: string | null;
    /** Every occurrence for this employee, ascending by date (undated items keep input order, last). */
    items: EmployeeStatItem[];
    /** Σ weight — what the user sees, and what reconciles with the stat card (half-days = 0.5). */
    total: number;
    /** items.length. Always an integer, unlike `total`. */
    count: number;
    /** ISO bounds across the group; null when no occurrence carries a date. */
    firstDate: string | null;
    lastDate: string | null;
    /**
     * Epoch-ms bounds across the group; null when no occurrence carries a `time`.
     * Drives check-in ordering, which needs sub-day resolution to mean anything.
     */
    firstTime: number | null;
    lastTime: number | null;
}

/**
 * One collator for the whole module rather than a `localeCompare` call per comparison:
 * `String.prototype.localeCompare` can construct a collator on every invocation, which
 * turns an O(n log n) sort into O(n log n) collator allocations. `numeric` also makes
 * "Employee 10" sort after "Employee 9" instead of before it.
 */
const COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Namespaced so an employeeId can never collide with an employeeCode from another row. */
function groupKeyOf(item: EmployeeStatItem): string {
    const id = item.employeeId?.trim();
    if (id) return `id:${id}`;
    const code = item.code?.trim();
    if (code) return `code:${code}`;
    return `name:${(item.name || '').trim().toLowerCase()}`;
}

/** Defensive: a NaN/negative/absent weight must not poison the total. */
function weightOf(item: EmployeeStatItem): number {
    const w = item.weight;
    return typeof w === 'number' && Number.isFinite(w) && w >= 0 ? w : 1;
}

/** A finite epoch-ms `time`, or null — guards against NaN from an unparsed date. */
function timeOf(item: EmployeeStatItem): number | null {
    const t = item.time;
    return typeof t === 'number' && Number.isFinite(t) ? t : null;
}

/**
 * Undated occurrences sort last, and keep their relative input order (Array#sort is
 * stable). Within one date the clock time breaks the tie, so a single-day group lists
 * its rows in check-in order rather than in whatever order the API returned them.
 */
function byDateAsc(a: EmployeeStatItem, b: EmployeeStatItem): number {
    const da = a.date || '';
    const db = b.date || '';
    if (da !== db) {
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : 1;
    }
    const ta = timeOf(a);
    const tb = timeOf(b);
    if (ta === null || tb === null) return 0;
    return ta - tb;
}

/**
 * Collapse per-occurrence rows into one group per employee. Input order decides group
 * order, so a caller that already sorted its rows gets a stable, meaningful default.
 */
export function groupEmployeeStatItems(items: readonly EmployeeStatItem[]): EmployeeStatGroup[] {
    // Map preserves insertion order, which is exactly the "first seen wins" ordering we want.
    const byKey = new Map<string, EmployeeStatGroup>();

    for (const item of items) {
        const key = groupKeyOf(item);
        let group = byKey.get(key);
        if (!group) {
            group = {
                key,
                name: item.name,
                code: item.code,
                avatarUrl: item.avatarUrl,
                designation: item.designation,
                items: [],
                total: 0,
                count: 0,
                firstDate: null,
                lastDate: null,
                firstTime: null,
                lastTime: null,
            };
            byKey.set(key, group);
        } else {
            // Occurrences can be assembled from different sources (roster row vs attendance
            // row), so backfill identity fields the first occurrence happened not to carry.
            if (!group.code && item.code) group.code = item.code;
            if (!group.avatarUrl && item.avatarUrl) group.avatarUrl = item.avatarUrl;
            if (!group.designation && item.designation) group.designation = item.designation;
        }

        group.items.push(item);
        group.count += 1;
        group.total += weightOf(item);

        const date = item.date;
        if (date) {
            // ISO strings compare lexicographically — no parsing in the hot loop.
            if (group.firstDate === null || date < group.firstDate) group.firstDate = date;
            if (group.lastDate === null || date > group.lastDate) group.lastDate = date;
        }

        const time = timeOf(item);
        if (time !== null) {
            if (group.firstTime === null || time < group.firstTime) group.firstTime = time;
            if (group.lastTime === null || time > group.lastTime) group.lastTime = time;
        }
    }

    for (const group of byKey.values()) {
        if (group.items.length > 1) group.items.sort(byDateAsc);
        // 0.5 weights are exact in IEEE-754, but round defensively so a future 1/3-day
        // policy can never surface 2.9999999999999996 on a card.
        group.total = Math.round(group.total * 100) / 100;
    }

    return Array.from(byKey.values());
}

const byNameAsc = (a: EmployeeStatGroup, b: EmployeeStatGroup) => COLLATOR.compare(a.name, b.name);

/**
 * Earliest/latest edge of a group for check-in ordering. Clock time wins when both
 * groups have one — on a single day every group shares the same `firstDate`, so date
 * ordering alone would degenerate to the name tiebreak. Groups with no time at all
 * (leave / absent) fall back to the date, and sort last against timed groups.
 */
function byEdge(
    a: EmployeeStatGroup,
    b: EmployeeStatGroup,
    pick: 'first' | 'last',
    dir: 1 | -1,
): number {
    const ta = pick === 'first' ? a.firstTime : a.lastTime;
    const tb = pick === 'first' ? b.firstTime : b.lastTime;
    if (ta !== null && tb !== null) return (ta - tb) * dir;
    if (ta !== null) return -1;
    if (tb !== null) return 1;
    const da = (pick === 'first' ? a.firstDate : a.lastDate) || '';
    const db = (pick === 'first' ? b.firstDate : b.lastDate) || '';
    return da.localeCompare(db) * dir;
}

/**
 * Order groups for display. Returns the input array untouched for `none` — sorting is
 * the only case that needs a copy, so the common path allocates nothing.
 *
 * `checkin-*` maps to the group's earliest/latest OCCURRENCE — the clock time when the
 * rows carry one, the date otherwise. On a single day that is the literal check-in
 * order; over a week or month it answers "who started offending first / most recently".
 */
export function sortEmployeeStatGroups(
    groups: EmployeeStatGroup[],
    option: StatSortOption,
): EmployeeStatGroup[] {
    if (option === 'none') return groups;
    const sorted = [...groups];
    switch (option) {
        case 'name-asc':
            return sorted.sort(byNameAsc);
        case 'name-desc':
            return sorted.sort((a, b) => COLLATOR.compare(b.name, a.name));
        case 'count-desc':
            // Name breaks ties so the order is deterministic across renders — without it,
            // equal-count groups would shuffle whenever the source array order changed.
            return sorted.sort((a, b) => b.total - a.total || byNameAsc(a, b));
        case 'count-asc':
            return sorted.sort((a, b) => a.total - b.total || byNameAsc(a, b));
        case 'checkin-asc':
            return sorted.sort((a, b) => byEdge(a, b, 'first', 1) || byNameAsc(a, b));
        case 'checkin-desc':
            return sorted.sort((a, b) => byEdge(a, b, 'last', -1) || byNameAsc(a, b));
        default:
            return sorted;
    }
}

/** Total across groups — Σ group.total, rounded like the group totals. */
export function totalOfGroups(groups: readonly EmployeeStatGroup[]): number {
    let sum = 0;
    for (const g of groups) sum += g.total;
    return Math.round(sum * 100) / 100;
}

/** `3` not `3.0`, `3.5` stays `3.5` — half-day leave totals must not read as "3 days". */
export function formatStatTotal(total: number): string {
    if (!Number.isFinite(total)) return '0';
    // String() already drops a trailing .0, so rounding is the only work needed.
    return String(Math.round(total * 100) / 100);
}

/** "day" / "days", weighted totals included ("0.5 days", not "0.5 day"). */
export function pluralizeUnit(total: number, unit: string): string {
    return total === 1 ? unit : `${unit}s`;
}

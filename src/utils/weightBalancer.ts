/**
 * Weights that always add up to 100.
 *
 * PURE. No React, no network — so the invariant can be tested exactly rather than
 * observed through a component.
 *
 * WHY THIS EXISTS. Scoring weights were four free-typed decimals (0.3, 0.3, 0.15, 0.25)
 * with no visible relationship to each other. The scorer normalises by their sum, so the
 * numbers are meaningful only as proportions — but nothing on screen said so, and nothing
 * stopped a set that means something different from what it looks like. "0.3" answers
 * neither "how much does this matter" nor "how much does it matter compared to that".
 *
 * Percentages that visibly sum to 100 answer both. The scorer needs no change: it divides
 * by the weight sum, so 30/30/15/25 and 0.3/0.3/0.15/0.25 produce identical scores.
 *
 * Used by BOTH the four rule-score weights and the scorecard template's weighted criteria.
 * Two copies of a 100% invariant is two places for it to drift.
 */

export type WeightMap<K extends string = string> = Record<K, number>;

const TOTAL = 100;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Scale any set of non-negative numbers onto percentages summing to exactly 100.
 *
 * Accepts whatever is already stored — fractions (0.3), relative units (3), or
 * percentages (30) — because the scorer only ever cared about the ratio. That makes this
 * safe to run on load without a migration, and idempotent once values are already
 * percentages.
 *
 * An all-zero set has no ratio to preserve, so it becomes an even split rather than
 * staying at zero: a weight set that sums to nothing would make every score identical.
 */
export function toPercentages<T extends WeightMap>(weights: T): T {
    const keys = Object.keys(weights) as (keyof T & string)[];
    if (!keys.length) return {} as T;

    // Coerced explicitly: T[keyof T] is not narrowed to number by the constraint alone.
    const safe = keys.map((k) => {
        const v = Number(weights[k]);
        return Number.isFinite(v) && v > 0 ? v : 0;
    });
    const sum = safe.reduce((a, b) => a + b, 0);

    const shares = sum === 0
        ? keys.map(() => TOTAL / keys.length)
        : safe.map((v) => (v / sum) * TOTAL);

    return settle(keys, shares) as T;
}

/**
 * Move one weight to `nextValue` and absorb the difference across the others.
 *
 * Redistribution is PROPORTIONAL to what the others already hold, not equal. Equal
 * redistribution would quietly promote a factor the admin had deliberately pushed near
 * zero — drag "Salary fit" up and "Title match" would climb with it despite having been
 * set to 5. Proportional keeps the relationship between the untouched weights intact,
 * which is the only thing the admin did not just ask to change.
 */
export function rebalance<T extends WeightMap>(
    weights: T,
    changedKey: string,
    nextValue: number,
): T {
    const keys = Object.keys(weights) as (keyof T & string)[];
    if (!keys.includes(changedKey as keyof T & string)) return toPercentages(weights);
    if (keys.length === 1) return { [changedKey]: TOTAL } as unknown as T;

    const next = clamp(Math.round(Number(nextValue) || 0), 0, TOTAL);
    const others = keys.filter((k) => k !== changedKey);
    const remaining = TOTAL - next;
    const held = (k: keyof T & string) => Math.max(0, Number(weights[k]) || 0);
    const othersSum = others.reduce((a, k) => a + held(k), 0);

    // Every other weight is zero, so there is no proportion to preserve — split evenly.
    const shares = othersSum === 0
        ? others.map(() => remaining / others.length)
        : others.map((k) => (held(k) / othersSum) * remaining);

    const out = settle(others, shares) as WeightMap;
    out[changedKey] = next;
    return out as unknown as T;
}

/**
 * Round a set of shares to integers that sum to exactly their own total.
 *
 * Rounding four shares independently can miss by a point or two, and a panel that reads
 * 99 undermines the one thing this component promises. The drift lands on the largest
 * share, where a single point is the smallest proportional distortion.
 */
function settle<K extends string>(keys: K[], shares: number[]): WeightMap<K> {
    const target = Math.round(shares.reduce((a, b) => a + b, 0));
    const out = {} as WeightMap<K>;
    keys.forEach((k, i) => { out[k] = Math.round(shares[i]); });

    let drift = target - keys.reduce((a, k) => a + out[k], 0);
    while (drift !== 0 && keys.length) {
        // Largest when adding, largest non-zero when subtracting — never push one negative.
        const pool = drift > 0 ? keys : keys.filter((k) => out[k] > 0);
        if (!pool.length) break;
        const biggest = pool.reduce((a, b) => (out[a] >= out[b] ? a : b));
        out[biggest] += drift > 0 ? 1 : -1;
        drift += drift > 0 ? -1 : 1;
    }
    return out;
}

/** Does this set already satisfy the invariant? Useful as a render-time assertion. */
export function sumsTo100(weights: WeightMap): boolean {
    return Object.values(weights).reduce((a, b) => a + b, 0) === TOTAL;
}

import { describe, it, expect } from "vitest";
import { toPercentages, rebalance, sumsTo100 } from "./weightBalancer";

/** The four real scoring weights, as they are stored today. */
const STORED = { ctcFit: 0.3, experience: 0.3, noticePeriod: 0.15, keywordMatch: 0.25 };

const total = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe("toPercentages", () => {
    it("converts the stored fractions to the percentages they always meant", () => {
        expect(toPercentages(STORED)).toEqual({ ctcFit: 30, experience: 30, noticePeriod: 15, keywordMatch: 25 });
    });

    it("is idempotent once values are already percentages", () => {
        const once = toPercentages(STORED);
        expect(toPercentages(once)).toEqual(once);
    });

    it("accepts any scale, because only the ratio ever mattered", () => {
        // 3/3/1.5/2.5 and 0.3/0.3/0.15/0.25 are the same weighting to the scorer.
        expect(toPercentages({ a: 3, b: 3, c: 1.5, d: 2.5 })).toEqual(toPercentages({ a: 0.3, b: 0.3, c: 0.15, d: 0.25 }));
    });

    it("always sums to exactly 100, including when rounding does not cooperate", () => {
        // Three equal shares are 33.33… each; independent rounding gives 99.
        expect(total(toPercentages({ a: 1, b: 1, c: 1 }))).toBe(100);
        expect(total(toPercentages({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1, g: 1 }))).toBe(100);
    });

    it("an all-zero set becomes an even split, never stays at zero", () => {
        // Weights summing to nothing would make every candidate score identically.
        expect(toPercentages({ a: 0, b: 0, c: 0, d: 0 })).toEqual({ a: 25, b: 25, c: 25, d: 25 });
    });

    it("ignores negatives and junk rather than propagating them", () => {
        const out = toPercentages({ a: -5, b: 10, c: Number.NaN, d: 10 });
        expect(out.a).toBe(0);
        expect(out.c).toBe(0);
        expect(total(out)).toBe(100);
    });

    it("an empty set is empty, not a crash", () => {
        expect(toPercentages({})).toEqual({});
    });
});

describe("rebalance", () => {
    const START = { ctcFit: 30, experience: 30, noticePeriod: 15, keywordMatch: 25 };

    it("holds the invariant whatever is moved, and to whatever value", () => {
        for (const key of Object.keys(START)) {
            for (const v of [0, 1, 17, 50, 99, 100]) {
                expect(total(rebalance(START, key, v))).toBe(100);
            }
        }
    });

    it("sets the moved weight to exactly what was asked", () => {
        expect(rebalance(START, "ctcFit", 50).ctcFit).toBe(50);
        expect(rebalance(START, "noticePeriod", 0).noticePeriod).toBe(0);
    });

    it("redistributes PROPORTIONALLY, not equally", () => {
        // The point of the whole function. ctcFit 30 -> 10 frees 20 points; the other
        // three held 30/15/25 and share the remaining 90 in that ratio:
        //   30/70 × 90 = 38.57 → 39      15/70 × 90 = 19.29 → 19      25/70 × 90 = 32.14 → 32
        // Equal redistribution would instead have given 36.67 each.
        const out = rebalance(START, "ctcFit", 10);
        expect(out).toEqual({ ctcFit: 10, experience: 39, noticePeriod: 19, keywordMatch: 32 });
        expect(total(out)).toBe(100);

        // The ratio survives, but only to within integer rounding — 39/19 is 2.05, not the
        // exact 2.0 it was. That distortion is the unavoidable cost of whole numbers that
        // must sum to 100, and it is recorded here rather than hidden behind a tolerance.
        expect(out.experience / out.noticePeriod).toBeCloseTo(2, 0);
    });

    it("does not promote a weight the admin deliberately pushed to zero", () => {
        // Equal redistribution would give the zeroed factor a share it was denied.
        const start = { a: 50, b: 50, c: 0 };
        const out = rebalance(start, "a", 20);
        expect(out.c).toBe(0);
        expect(out.b).toBe(80);
    });

    it("spreads evenly only when there is no proportion left to preserve", () => {
        const out = rebalance({ a: 100, b: 0, c: 0 }, "a", 40);
        expect(out).toEqual({ a: 40, b: 30, c: 30 });
    });

    it("clamps out-of-range input instead of letting it through", () => {
        expect(rebalance(START, "ctcFit", 999).ctcFit).toBe(100);
        expect(rebalance(START, "ctcFit", -50).ctcFit).toBe(0);
        expect(total(rebalance(START, "ctcFit", 999))).toBe(100);
    });

    it("taking one weight to 100 leaves the others at zero", () => {
        const out = rebalance(START, "experience", 100);
        expect(out).toEqual({ ctcFit: 0, experience: 100, noticePeriod: 0, keywordMatch: 0 });
    });

    it("a single weight is always the whole of it", () => {
        expect(rebalance({ only: 40 }, "only", 40)).toEqual({ only: 100 });
    });

    it("an unknown key normalises rather than corrupting the set", () => {
        expect(total(rebalance(START, "nope" as keyof typeof START, 50))).toBe(100);
    });

    it("survives being dragged repeatedly, which is how a slider is actually used", () => {
        let w: Record<string, number> = { ...START };
        for (const [k, v] of [["ctcFit", 45], ["experience", 5], ["keywordMatch", 60], ["noticePeriod", 12], ["ctcFit", 0]] as const) {
            w = rebalance(w, k, v);
            expect(total(w)).toBe(100);
            expect(Object.values(w).every((n) => n >= 0 && Number.isInteger(n))).toBe(true);
        }
    });
});

describe("sumsTo100", () => {
    it("is the assertion a caller can make at render time", () => {
        expect(sumsTo100({ a: 30, b: 70 })).toBe(true);
        expect(sumsTo100({ a: 30, b: 69 })).toBe(false);
    });
});

import { describe, expect, it } from "vitest";
import { autoFixPercentages, pct, stageTotal, toPlanStage } from "./paymentPlanStages";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("autoFixPercentages", () => {
  it("always lands on exactly 100", () => {
    for (const values of [[14, 14, 14, 14, 14, 14, 14], [30, 20, 20, 20, 5, 5], [1], [3, 3, 3], []]) {
      const fixed = autoFixPercentages(values);
      expect(sum(fixed)).toBe(values.length === 0 ? 0 : 100);
    }
  });

  it("keeps the proportions the user typed", () => {
    // 60/30/10 of the total, whatever scale it was entered at.
    expect(autoFixPercentages([120, 60, 20])).toEqual([60, 30, 10]);
  });

  it("splits evenly when there is nothing to scale", () => {
    expect(autoFixPercentages([0, 0, 0])).toEqual([34, 33, 33]);
  });

  it("gives leftover points to the largest fractions, not to the last row", () => {
    // Three equal rows → 33.33 each; the extra point goes to one row, never to all.
    const fixed = autoFixPercentages([10, 10, 10]);
    expect(sum(fixed)).toBe(100);
    expect(fixed.filter((v) => v === 34)).toHaveLength(1);
  });
});

describe("stageTotal", () => {
  it("treats a half-typed field as zero rather than NaN", () => {
    expect(pct("")).toBe(0);
    expect(stageTotal([toPlanStage("Advance", "30"), toPlanStage("Concept", "")])).toBe(30);
  });

  it("rounds away float noise so 100 reads as 100", () => {
    const stages = [0.1, 0.2, 99.7].map((v, i) => toPlanStage(`Stage ${i}`, v));
    expect(stageTotal(stages)).toBe(100);
  });
});

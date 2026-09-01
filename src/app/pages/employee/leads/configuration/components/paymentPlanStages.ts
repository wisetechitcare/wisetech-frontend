/**
 * Stage maths for the payment-plan editor.
 *
 * Lives outside the .tsx so the percentage rules can be tested without a DOM — they are
 * the only part of the editor that can be silently wrong.
 */

/** A payment-plan stage as the editor holds it while being edited. */
export interface PlanStage {
  /** Server id. Absent until the plan is saved — deliverables can only hang off a saved stage. */
  id?: string;
  /** Client row key. Rows are reorderable and a new one has no id yet, so identity cannot
   *  come from the server and must not come from the index. */
  uid: string;
  name: string;
  /** Held as typed: "" is a half-typed field, not 0. */
  percentage: number | string;
  /**
   * Deliverables on this stage as the SERVER last reported it. Undefined for a stage that
   * has never been saved. The editor prefers its own live tally once a branch has been
   * opened and edited — this is the at-rest figure, so a closed stage still says whether
   * it holds anything.
   */
  deliverableCount?: number;
  // No numbering field: the Sr No comes from the PLAN's chosen group, by position.
}

let seq = 0;
export const stageUid = (): string => `stage-${++seq}`;

export const toPlanStage = (
  name: string,
  percentage: number | string,
  id?: string,
  deliverableCount?: number,
): PlanStage => ({
  ...(id ? { id } : {}),
  uid: stageUid(),
  name,
  percentage,
  ...(deliverableCount === undefined ? {} : { deliverableCount }),
});

export const pct = (value: number | string): number => parseFloat(String(value)) || 0;

/** Rounded to 3dp to match the backend's Decimal(6,3): summing floats otherwise gives
 *  100.00000000000001, which fails the `=== 100` check and prints nonsense in the total. */
export const stageTotal = (stages: PlanStage[]): number =>
  Math.round(stages.reduce((sum, s) => sum + pct(s.percentage), 0) * 1000) / 1000;

/**
 * Rescale to whole-number percentages that total exactly 100.
 *
 * Largest-remainder: floor each scaled value, then hand the leftover points to the rows
 * with the biggest fractions. Proportional rounding alone leaves a gap (7 rows → 14 each
 * → 98), and dumping the remainder on the last row alone skews that row.
 */
export function autoFixPercentages(values: number[]): number[] {
  const count = values.length;
  if (count === 0) return [];

  const sum = values.reduce((a, b) => a + b, 0);
  // Nothing meaningful to scale (empty or negative total) → split evenly.
  const raw = sum > 0 ? values.map((v) => (v * 100) / sum) : values.map(() => 100 / count);

  const floors = raw.map((v) => Math.floor(v));
  const leftover = 100 - floors.reduce((a, b) => a + b, 0);
  const bump = new Set(
    raw
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
      .slice(0, Math.max(0, leftover))
      .map((r) => r.i),
  );

  return floors.map((floor, i) => floor + (bump.has(i) ? 1 : 0));
}

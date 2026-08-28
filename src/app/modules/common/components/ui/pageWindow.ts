/**
 * Which page numbers a pager shows — pure, no React/MUI, so `pageWindow.test.ts`
 * can exercise it without bundling the UI layer.
 *
 * Returns 0-based page indices in display order, with `ELLIPSIS` marking a gap.
 * First and last are always present, so jumping to either end never needs paging
 * toward it.
 *
 * The slot count is CONSTANT once the gaps appear (`siblings * 2 + 5`). The naive
 * "clamp the window to [1, pageCount-2]" version shrinks at the ends — four pills
 * on page 1, seven in the middle — so the control changes width as you page
 * through it and the arrows walk sideways under the cursor. Here a side that
 * cannot use its slots donates them to the other side instead.
 */

/** Gap marker. Negative so it can never collide with a real 0-based page index. */
export const ELLIPSIS = -1;

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const pageWindow = (
  pageIndex: number,
  pageCount: number,
  siblings = 1,
): number[] => {
  if (pageCount <= 0) return [];

  // Clamp rather than trust: a stale index (filters narrowed the result set between
  // render and click) would otherwise centre the window past the end.
  const current = Math.min(Math.max(pageIndex, 0), pageCount - 1);

  // first + last + both ellipses + current + siblings either side.
  const slots = siblings * 2 + 5;
  if (pageCount <= slots) return range(0, pageCount - 1);

  const gapLeft = current > siblings + 2;
  const gapRight = current < pageCount - siblings - 3;

  // Head: no room for a left gap, so its two slots go to the run after page 0.
  if (!gapLeft) return [...range(0, slots - 3), ELLIPSIS, pageCount - 1];

  // Tail: mirror image.
  if (!gapRight) return [0, ELLIPSIS, ...range(pageCount - (slots - 2), pageCount - 1)];

  return [0, ELLIPSIS, ...range(current - siblings, current + siblings), ELLIPSIS, pageCount - 1];
};

import { describe, expect, it } from "vitest";
import { mergeVisibleOrder } from "./SortableList";

/**
 * A drop only ever reorders what was ON SCREEN. Every surface using this engine hides part of
 * its list — a table pages and filters its rows, and hides columns outright — so the new order
 * has to be folded back into the stored one without disturbing anything that was not visible.
 */
describe("mergeVisibleOrder", () => {
    it("reorders only the items that were on screen", () => {
        // b and c were visible; a and d were not, and must not move.
        expect(mergeVisibleOrder(["a", "b", "c", "d"], ["c", "b"])).toEqual(["a", "c", "b", "d"]);
    });

    it("keeps hidden items in place when the visible ones are not adjacent", () => {
        // THE CASE SLICING WOULD BREAK. Under a filter the visible items are scattered, so the
        // move has to be expressed as "refill these positions" — splice a block back in and the
        // hidden items between them get dragged along.
        expect(mergeVisibleOrder(["a", "hidden", "b"], ["b", "a"])).toEqual(["b", "hidden", "a"]);
    });

    it("is a no-op when the visible order did not change", () => {
        expect(mergeVisibleOrder(["a", "b", "c"], ["a", "b"])).toEqual(["a", "b", "c"]);
    });

    it("survives a visible id that is not in the full list", () => {
        // Items can disappear between render and drop. Falling back to the id already in that
        // position beats writing `undefined` into a stored order.
        expect(mergeVisibleOrder(["a", "b"], ["b"])).toEqual(["a", "b"]);
    });
});

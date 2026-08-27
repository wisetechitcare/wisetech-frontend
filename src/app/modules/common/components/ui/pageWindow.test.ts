import { describe, expect, it } from "vitest";
import { ELLIPSIS, pageWindow } from "./pageWindow";

describe("pageWindow", () => {
  it("shows every page when they all fit", () => {
    expect(pageWindow(0, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(pageWindow(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("handles an empty or single-page result", () => {
    expect(pageWindow(0, 0)).toEqual([]);
    expect(pageWindow(0, 1)).toEqual([0]);
  });

  it("keeps first and last reachable, with a gap in between", () => {
    expect(pageWindow(10, 20)).toEqual([0, ELLIPSIS, 9, 10, 11, ELLIPSIS, 19]);
  });

  it("donates the unused side's slots to the other side at the ends", () => {
    expect(pageWindow(0, 20)).toEqual([0, 1, 2, 3, 4, ELLIPSIS, 19]);
    expect(pageWindow(19, 20)).toEqual([0, ELLIPSIS, 15, 16, 17, 18, 19]);
  });

  it("keeps a constant slot count across every page", () => {
    const widths = new Set(
      Array.from({ length: 20 }, (_, index) => pageWindow(index, 20).length),
    );
    expect([...widths]).toEqual([7]);
  });

  it("always renders the current page", () => {
    for (let count = 1; count <= 40; count++) {
      for (let index = 0; index < count; index++) {
        expect(pageWindow(index, count)).toContain(index);
      }
    }
  });

  it("never emits a duplicate, an out-of-order page, or a one-page gap", () => {
    for (let count = 1; count <= 40; count++) {
      for (let index = 0; index < count; index++) {
        const window = pageWindow(index, count);
        const pages = window.filter((page) => page !== ELLIPSIS);
        expect(new Set(pages).size).toBe(pages.length);
        expect([...pages].sort((a, b) => a - b)).toEqual(pages);
        expect(pages.every((page) => page >= 0 && page < count)).toBe(true);
        // An ellipsis standing in for a single page is the same width as the page
        // it hides and strictly less useful.
        window.forEach((page, slot) => {
          if (page !== ELLIPSIS) return;
          expect(window[slot + 1] - window[slot - 1]).toBeGreaterThan(2);
        });
      }
    }
  });

  it("clamps a stale page index instead of centring past the end", () => {
    expect(pageWindow(99, 20)).toEqual(pageWindow(19, 20));
    expect(pageWindow(-4, 20)).toEqual(pageWindow(0, 20));
  });
});

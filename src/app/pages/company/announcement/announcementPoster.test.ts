import { describe, expect, it } from "vitest";
import {
  MAX_ANIMATED_POSTER_BYTES, MAX_POSTER_BYTES, judgePoster, posterByteLimit,
} from "./announcementPoster";

describe("posterByteLimit", () => {
  it("holds a GIF to a tighter ceiling — it is stored uncompressed", () => {
    expect(posterByteLimit("payday.gif", "image/gif")).toBe(MAX_ANIMATED_POSTER_BYTES);
    expect(MAX_ANIMATED_POSTER_BYTES).toBeLessThan(MAX_POSTER_BYTES);
  });

  it("gives stills the full allowance — the server re-encodes them to WebP", () => {
    expect(posterByteLimit("payday.png", "image/png")).toBe(MAX_POSTER_BYTES);
    expect(posterByteLimit("payday.jpg", "image/jpeg")).toBe(MAX_POSTER_BYTES);
  });

  it("catches a GIF by extension when the browser reports no MIME type", () => {
    // Drag-and-drop out of an archive routinely gives File.type === "".
    expect(posterByteLimit("payday.GIF", "")).toBe(MAX_ANIMATED_POSTER_BYTES);
  });
});

describe("judgePoster", () => {
  it("accepts any shape — the card fits a poster rather than cropping to it", () => {
    // A portrait Canva flyer, a square, and a wide banner: all legitimate.
    expect(judgePoster(1122, 1402).ok).toBe(true);
    expect(judgePoster(1200, 1200).ok).toBe(true);
    expect(judgePoster(1600, 560).ok).toBe(true);
  });

  it("refuses a poster too small for the space it lands in", () => {
    const v = judgePoster(300, 375);
    expect(v.ok).toBe(false);
    expect(v.reason).toContain("too small");
  });

  it("names the size THAT file would need, not a generic minimum", () => {
    // The floor is shape-dependent, so a portrait and a banner get different targets.
    const portrait = judgePoster(300, 375).reason ?? "";
    const banner = judgePoster(600, 210).reason ?? "";
    expect(portrait).toMatch(/at least \d+ × \d+ px/);
    expect(banner).toMatch(/at least \d+ × \d+ px/);
    expect(portrait).not.toEqual(banner);
  });

  it("scales the stated target so it actually clears the bar", () => {
    const v = judgePoster(300, 375);
    const [, w, h] = /at least (\d+) × (\d+) px/.exec(v.reason ?? "") ?? [];
    expect(judgePoster(Number(w), Number(h)).ok).toBe(true);
  });

  it("is bounded by height for a tall poster and by width for a wide one", () => {
    // 640px tall clears the 320px-tall card at 1.5×, however narrow it is.
    expect(judgePoster(200, 640).ok).toBe(true);
    // 1350px wide clears the 900px-wide card at 1.5×, however short it is.
    expect(judgePoster(1350, 120).ok).toBe(true);
  });

  it("refuses a file that reports no dimensions", () => {
    expect(judgePoster(0, 0).ok).toBe(false);
  });
});

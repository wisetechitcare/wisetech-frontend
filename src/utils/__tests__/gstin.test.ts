import { describe, expect, it } from "vitest";
import { GST_STATE_CODES, GST_STATE_NAMES, gstinStateMismatch, isValidGstin, typeGstin, typePan } from "../gstin";

describe("gstin", () => {
  it("pins Maharashtra to 27", () => {
    expect(GST_STATE_CODES["27"]).toBe("Maharashtra");
    expect(GST_STATE_NAMES).toContain("Maharashtra");
  });
  it("checks shape and state agreement", () => {
    expect(isValidGstin("27AACCW0060D1ZS")).toBe(true);
    expect(gstinStateMismatch("27AACCW0060D1ZS", "Maharashtra")).toBeNull();
    expect(gstinStateMismatch("27AACCW0060D1ZS", "Gujarat")).toMatch(/registered in Maharashtra/);
    expect(gstinStateMismatch("", "Gujarat")).toBeNull();
  });
});

describe("typing filters", () => {
  it("only lets a character into a position that can hold it", () => {
    expect(typeGstin("27aapfu0939f1zv", "")).toBe("27AAPFU0939F1ZV");
    expect(typeGstin("27 AAPFU-0939F1ZV", "")).toBe("27AAPFU0939F1ZV");
    expect(typeGstin("27AAPFU0939F1ZVX", "27AAPFU0939F1ZV")).toBe("27AAPFU0939F1ZV"); // max 15
    expect(typeGstin("2A", "2")).toBe("2"); // letter where a digit belongs
    expect(typeGstin("27AAPFU0939F1Y", "27AAPFU0939F1")).toBe("27AAPFU0939F1"); // 14th must be Z
    expect(typeGstin("27APFU0939F1ZV", "27AAPFU0939F1ZV")).toBe("27APFU0939F1ZV"); // deletions always allowed
    expect(typePan("ABCDE1234F9", "ABCDE1234F")).toBe("ABCDE1234F");
    expect(typePan("ABCD1", "ABCD")).toBe("ABCD");
  });
});

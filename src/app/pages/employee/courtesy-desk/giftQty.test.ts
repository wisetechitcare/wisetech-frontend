import { describe, expect, it } from "vitest";
import { formatGiftQty, giftRunTotalAmount, giftSizeError, giftsFromAmount } from "./types";

describe("giftsFromAmount (per-person entry)", () => {
  const half = { sizePerGift: "0.5", sizeUnitCountable: false };
  it("kg / L take any positive decimal, stored as gifts of the run's size", () => {
    expect(giftsFromAmount("0.5", half)).toBe(1);
    expect(giftsFromAmount("0.25", half)).toBe(0.5);
    expect(giftsFromAmount("1", half)).toBe(2);
    expect(giftsFromAmount("0.1", { sizePerGift: "0.3", sizeUnitCountable: false })).toBeCloseTo(0.333333, 6);
  });
  it("countable units take whole gifts", () => {
    expect(giftsFromAmount("2", { sizePerGift: "1", sizeUnitCountable: true })).toBe(2);
    expect(giftsFromAmount("2.4", { sizePerGift: "1", sizeUnitCountable: true })).toBe(2);
  });
  it("rejects 0, negatives and text", () => {
    for (const bad of ["0", "-1", "abc", "", "0."]) expect(giftsFromAmount(bad, half)).toBeNull();
  });
});

const box = { sizePerGift: "1", sizeUnitSymbol: "Box" };
const kg = { sizePerGift: "0.25", sizeUnitSymbol: "kg" };

describe("formatGiftQty", () => {
  it("shows the configured quantity and unit, nothing else", () => {
    expect(formatGiftQty(1, kg)).toBe("0.25 kg");
    expect(formatGiftQty(1, { sizePerGift: "2", sizeUnitSymbol: "kg" })).toBe("2 kg");
    expect(formatGiftQty(4, { sizePerGift: "0.25", sizeUnitSymbol: "kg" })).toBe("1 kg");
    expect(formatGiftQty(1, { sizePerGift: "1", sizeUnitSymbol: "L" })).toBe("1 L");
    expect(formatGiftQty(1, { sizePerGift: "1", sizeUnitSymbol: "unit" })).toBe("1 unit");
    expect(formatGiftQty(5, box)).toBe("5 Box");
    expect(formatGiftQty(2, { sizePerGift: "1", sizeUnitSymbol: "Office Kit" })).toBe("2 Office Kit");
  });

  it("totals are gifts × size, in the same unit", () => {
    expect(formatGiftQty(16, kg)).toBe("4 kg");
    expect(formatGiftQty(3, { sizePerGift: "0.1", sizeUnitSymbol: "kg" })).toBe("0.3 kg");
  });

  it("no unit → just the number", () => {
    expect(formatGiftQty(16, {})).toBe("16");
  });
});

describe("giftSizeError", () => {
  it("countable units take whole gifts each (≥ 1)", () => {
    expect(giftSizeError(true, "1")).toBeNull();
    expect(giftSizeError(true, "2")).toBeNull();
    for (const bad of ["", "0", "1.5", "-1", "abc"]) expect(giftSizeError(true, bad)).not.toBeNull();
  });
  it("measurable sizes are > 0 with at most 3 decimals", () => {
    expect(giftSizeError(false, "250")).toBeNull();
    expect(giftSizeError(false, "0.5")).toBeNull();
    expect(giftSizeError(false, "0.25")).toBeNull();
    for (const bad of ["", "0", "-1", "abc", "0.0001", "1e3"]) {
      expect(giftSizeError(false, bad)).not.toBeNull();
    }
  });
});

describe("giftRunTotalAmount (unchanged by units)", () => {
  it("is cost × gift count, whatever the unit", () => {
    const recipients = Array.from({ length: 7 }, () => ({ quantity: 1 }));
    expect(giftRunTotalAmount({ costPerGift: 120, recipients })).toBe(840);
    expect(giftRunTotalAmount({ costPerGift: 120, ...kg, recipients } as never)).toBe(840);
  });
  it("0.5 kg per person at 500 each: 7 people = 3,500; one person on 1 kg pays double", () => {
    const seven = Array.from({ length: 7 }, () => ({ quantity: 1 }));
    expect(giftRunTotalAmount({ costPerGift: 500, recipients: seven })).toBe(3500);
    expect(giftRunTotalAmount({ costPerGift: 500, recipients: [...seven.slice(1), { quantity: 2 }] })).toBe(4000);
    expect(giftRunTotalAmount({ costPerGift: 500, recipients: [{ quantity: 0.5 }] })).toBe(250);
  });
});

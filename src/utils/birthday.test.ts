import { describe, expect, it } from "vitest";
import { ageFrom, daysInMonth, formatBirthday, fromBirthdayValue, toBirthdayValue } from "./birthday";

describe("birthday without a year", () => {
  it("stores an unknown year as the leap placeholder, and reads it back as unknown", () => {
    expect(toBirthdayValue(12, 3, null)).toBe("1904-03-12");
    expect(fromBirthdayValue("1904-03-12")).toEqual({ day: 12, month: 3, year: null });
    expect(fromBirthdayValue("1990-03-12")).toEqual({ day: 12, month: 3, year: 1990 });
  });

  it("needs day and month; year is optional", () => {
    expect(toBirthdayValue(12, null, 1990)).toBe("");
    expect(toBirthdayValue(12, 3, 1990)).toBe("1990-03-12");
  });

  it("shows no year and no age for an unknown year", () => {
    expect(formatBirthday("1904-03-12")).toBe("12 Mar");
    expect(formatBirthday("1990-03-12")).toBe("12 Mar 1990");
    expect(ageFrom("1904-03-12")).toBeNull();
    expect(ageFrom("1990-03-12", new Date("2026-03-12"))).toBe(36);
  });

  it("allows 29 February when the year is unknown or a leap year", () => {
    expect(daysInMonth(2, null)).toBe(29);
    expect(daysInMonth(2, 2024)).toBe(29);
    expect(daysInMonth(2, 2023)).toBe(28);
    expect(toBirthdayValue(29, 2, null)).toBe("1904-02-29");
  });
});

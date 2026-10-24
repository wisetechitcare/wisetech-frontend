import { describe, expect, it } from "vitest";
import type { CourtesyRecipient } from "../types";
import {
  EMPTY_GIFT_RUN_FILTERS,
  giftRunActiveFilterCount,
  matchesGiftRunFilters,
} from "./giftRunFilters";

const recipient: CourtesyRecipient = {
  id: "recipient-1",
  memberType: "EMPLOYEE",
  personId: "person-1",
  fullName: "Aabsar Borkar",
  area: "Pune",
  status: "PENDING",
  mode: "COURIER",
  quantity: 1,
  assigneeEmployeeId: "employee-1",
  assigneeName: "Mustafa Khan",
  updatedAt: "2026-10-23T00:00:00.000Z",
};

describe("giftRunFilters", () => {
  it("combines filters and counts only active criteria", () => {
    const filters = {
      ...EMPTY_GIFT_RUN_FILTERS,
      status: "PENDING",
      area: "Pune",
      assignee: "employee-1",
    };

    expect(giftRunActiveFilterCount(filters)).toBe(3);
    expect(
      matchesGiftRunFilters(recipient, filters, {
        gender: "Male",
        designation: "Architect",
      }),
    ).toBe(true);
    expect(
      matchesGiftRunFilters(
        recipient,
        { ...filters, assignee: "UNASSIGNED" },
        { gender: "Male", designation: "Architect" },
      ),
    ).toBe(false);
  });
});

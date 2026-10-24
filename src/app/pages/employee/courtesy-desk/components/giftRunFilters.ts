import type { CourtesyRecipient } from "../types";

export interface GiftRunFilters {
  status: string;
  source: "ALL" | "CONTACT" | "EMPLOYEE";
  gender: string;
  designation: string;
  mode: string;
  area: string;
  assignee: string;
}

export const EMPTY_GIFT_RUN_FILTERS: GiftRunFilters = {
  status: "ALL",
  source: "ALL",
  gender: "ALL",
  designation: "ALL",
  mode: "ALL",
  area: "ALL",
  assignee: "ALL",
};

export function giftRunActiveFilterCount(filters: GiftRunFilters) {
  return Object.values(filters).filter((value) => value !== "ALL").length;
}

export function matchesGiftRunFilters(
  recipient: CourtesyRecipient,
  filters: GiftRunFilters,
  profile: { gender: string; designation: string },
) {
  if (filters.status !== "ALL" && recipient.status !== filters.status)
    return false;
  if (filters.source !== "ALL" && recipient.memberType !== filters.source)
    return false;
  if (filters.gender !== "ALL" && profile.gender !== filters.gender)
    return false;
  if (
    filters.designation !== "ALL" &&
    profile.designation !== filters.designation
  )
    return false;
  if (filters.mode !== "ALL" && recipient.mode !== filters.mode) return false;
  if (filters.area !== "ALL" && (recipient.area || "") !== filters.area)
    return false;
  if (filters.assignee === "UNASSIGNED")
    return !recipient.assigneeEmployeeId && !recipient.assigneeName;
  if (
    filters.assignee !== "ALL" &&
    recipient.assigneeEmployeeId !== filters.assignee
  )
    return false;
  return true;
}

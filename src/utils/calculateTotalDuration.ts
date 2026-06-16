import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";
import { store } from "@redux/store";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

function parseFlexibleTime(timeStr: string): number | null {
  const parts = timeStr.trim().split(":");
  if (parts.length !== 2) return null;

  const [hh, mm] = parts.map((x) => parseInt(x, 10));
  if (isNaN(hh) || isNaN(mm)) return null;

  return hh * 60 + mm;
}

export function calculateTotalDuration(entries: any | any[]): string {
  // if nothing is passed
  if (!entries) return "0H 0M";
  const appSettingWorkingHours = store.getState().appSettings?.workingHours;

  // normalize input → always work with an array
  let entryArray: any[] = [];
  if (Array.isArray(entries)) {
    entryArray = entries;
  } else if (typeof entries === "object" && entries !== null) {
    entryArray = [entries];
  } else {
    return "0H 0M"; // invalid input
  }

  // Accumulate in ms and truncate once at the end — eliminates the per-entry second loss
  // that caused 2-3 minute drift vs the KPI's ms-based monthly total.
  let totalMs = 0;

  const leaveManagement = store.getState().featureConfiguration?.leaveManagement;
  const disableLunchTimeDeduction = store.getState().featureConfiguration?.disableLaunchDeductionTime;
  const lunchTime = leaveManagement?.["Lunch Time"];

  let lunchMinutesToDeduct = 0;

  if (disableLunchTimeDeduction === true && lunchTime) {
    const [startRaw, endRaw] = lunchTime.replace(/\s*-\s*/, "-").split("-");
    const startMin = parseFlexibleTime(startRaw);
    const endMin = parseFlexibleTime(endRaw);

    if (startMin !== null && endMin !== null) {
      lunchMinutesToDeduct = endMin - startMin;
    }
  }

  const lunchMs = lunchMinutesToDeduct * 60_000;
  // Threshold = (half working hours) + lunch duration — matches backend salary and KPI formula.
  const halfDayThresholdMs = ((appSettingWorkingHours || 0) / 2) * 3_600_000 + lunchMs;

  for (const entry of entryArray) {
    if (!entry || !entry.checkIn || !entry.checkOut) continue;

    const checkInTime = dayjs(entry.checkIn).tz("Asia/Kolkata");
    const checkOutTime = dayjs(entry.checkOut).tz("Asia/Kolkata");

    if (!checkInTime.isValid() || !checkOutTime.isValid()) continue;

    let diffMs = checkOutTime.diff(checkInTime, "millisecond");

    if (diffMs <= 0) continue;

    // Deduct lunch if enabled and session exceeds threshold
    if (disableLunchTimeDeduction === true && lunchMs > 0 && diffMs > halfDayThresholdMs) {
      diffMs -= lunchMs;
    }

    totalMs += diffMs;
  }

  const totalMinutes = Math.floor(totalMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}H ${minutes}M`;
} 

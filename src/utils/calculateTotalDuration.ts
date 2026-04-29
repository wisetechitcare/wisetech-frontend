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

  let totalMinutes = 0;

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

  for (const entry of entryArray) {
    if (!entry || !entry.checkIn || !entry.checkOut) continue;

    const checkInTime = dayjs(entry.checkIn).tz("Asia/Kolkata");
    const checkOutTime = dayjs(entry.checkOut).tz("Asia/Kolkata");

    if (!checkInTime.isValid() || !checkOutTime.isValid()) continue;

    let diffMinutes = checkOutTime.diff(checkInTime, "minute");

    // Deduct lunch if enabled
    if (
      disableLunchTimeDeduction === true &&
      lunchMinutesToDeduct > 0 &&
      // diffMinutes > lunchMinutesToDeduct + 60
      diffMinutes > (((appSettingWorkingHours || 0)/2)*60 + (lunchMinutesToDeduct|| 0))
      
    ) {
      diffMinutes -= lunchMinutesToDeduct;
    }

    if (diffMinutes > 0) {
      totalMinutes += diffMinutes;
    }
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}H ${minutes}M`;
} 

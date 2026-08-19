import { safeJsonParse } from '@utils/safeJson';
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { fetchConfiguration } from "@services/company";
import { store } from "@redux/store";
import {
  ENFORCE_ONSITE_DEADLINE_KEY,
  GRACE_TIME_ON_SITE_KEY,
  LEAVE_MANAGEMENT,
} from "@constants/configurations-key";
import {
  isOnsiteDeadlineEnforced,
  isOnsiteHolidayWeekendExemptionEnabled,
} from "@utils/attendanceColorUtils";

dayjs.extend(duration);

function parseOnsiteClockThreshold(graceRaw: string): string {
  const trimmed = String(graceRaw ?? "").trim().split(/\s+/)[0] ?? "11:00";
  const parts = trimmed.split(":").map(Number);
  const hour = Number.isFinite(parts[0]) ? parts[0] : 11;
  const minute = Number.isFinite(parts[1]) ? parts[1] : 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:59`;
}

// Helper function to calculate thresholds for a specific grace time
const calculateThresholds = (checkInTime: string, checkOutTime: string, graceTimeRaw: string) => {
  const checkIn = dayjs(checkInTime, "h:mm A");
  const checkOut = dayjs(checkOutTime, "h:mm A");
  
  const graceStr = String(graceTimeRaw || "").replace("Hrs", "").trim();
  const parts = graceStr.split(":").map(Number).filter(n => !isNaN(n));
  // console.log("Grace time parts:", parts, "for grace:", graceTimeRaw);
  
  const [hours = 0, minutes = 0, seconds = 0] = parts;
  const graceDuration = dayjs.duration({ hours, minutes, seconds });

  const lateCheckIn = checkIn.add(graceDuration);
  const earlyCheckOut = checkOut;

  return {
    lateCheckInThreshold: lateCheckIn.format("HH:mm:ss"),
    earlyCheckOutThreshold: earlyCheckOut.format("HH:mm:ss"),
  };
};

export const getGraceBasedThresholds = async (
  attendance: any[] = [],
  scope?: { companyId?: string; branchId?: string },
) => {
  try {

    // Scope late thresholds to the VIEWED employee's org/branch so they match that employee's
    // shift config (branch override → org → global) — i.e. the same scope the backend graph
    // uses. Callers viewing another employee (admin) must pass that employee's scope; when no
    // scope is given we fall back to the logged-in user (the self-view case). Empty = global.
    const thresholdScope = (scope && (scope.companyId || scope.branchId))
      ? scope
      : {
          companyId: store.getState().employee?.currentEmployee?.companyId,
          branchId: store.getState().employee?.currentEmployee?.branchId,
        };
    const { data: { configuration: configurationRecord } } = await fetchConfiguration(LEAVE_MANAGEMENT, undefined, undefined, thresholdScope);
    const configuration = configurationRecord?.configuration;
    const settings = safeJsonParse(configuration);

    const checkInTime = settings["Check-in time"]; // "9:30 AM"
    const checkOutTime = settings["Check-out time"]; // "5:30 PM"
    const defaultGraceTime = settings["Grace Time"] || "00:30:00 Hrs";
    const graceTimeOnSite = settings[GRACE_TIME_ON_SITE_KEY] || "11:00";
    // Master policy switch outranks the on-site deadline: when ON, on-site check-ins
    // are never late, so the threshold is pushed to end-of-day. Matches backend ladder rule 2.
    const enforceOnsite =
      !isOnsiteHolidayWeekendExemptionEnabled(settings) && isOnsiteDeadlineEnforced(settings);

    const defaultThresholds = calculateThresholds(checkInTime, checkOutTime, defaultGraceTime);
    const onSiteLateThreshold = enforceOnsite
      ? parseOnsiteClockThreshold(graceTimeOnSite)
      : "23:59:59";
    const onSiteThresholds = {
      lateCheckInThreshold: onSiteLateThreshold,
      earlyCheckOutThreshold: defaultThresholds.earlyCheckOutThreshold,
    };

    const processedAttendance = attendance.map(employee => {
      let employeeThresholds;
      let appliedGraceType;

      if (employee.workingMethod === "On-site") {
        employeeThresholds = onSiteThresholds;
        appliedGraceType = enforceOnsite
          ? "On-site Deadline"
          : "On-site (no enforcement)";
      } else {
        employeeThresholds = defaultThresholds;
        appliedGraceType = "Office Grace";
      }

      return {
        ...employee,
        lateCheckInThreshold: employeeThresholds.lateCheckInThreshold,
        earlyCheckOutThreshold: employeeThresholds.earlyCheckOutThreshold,
        appliedGraceType,
      };
    });

    return {
      employeesWithThresholds: processedAttendance,

      // The resolved config for this scope. Callers that colour on-site check-ins need it
      // (resolveCheckInColor reads the deadline + enforce toggle from it) and must NOT
      // re-fetch it unscoped — that is how the group default leaked onto branch employees.
      leaveConfig: settings as Record<string, unknown>,

      // Pre-calculated thresholds for easy access
      defaultThresholds,
      onSiteThresholds,
      
      // Summary info
      totalEmployees: attendance.length,
      onSiteCount: attendance.filter(emp => emp.workingMethod === "On-site").length,
      officeCount: attendance.filter(emp => emp.workingMethod === "Office").length,
      hybridCount: attendance.filter(emp => emp.workingMethod === "Hybrid").length,
      
      // Helper function to get thresholds for a specific employee
      getThresholdForEmployee: (employeeId: string) => {
        const employee = processedAttendance.find(emp => emp.employeeId === employeeId);
        return employee ? {
          lateCheckInThreshold: employee.lateCheckInThreshold,
          earlyCheckOutThreshold: employee.earlyCheckOutThreshold
        } : defaultThresholds;
      }
    };
  } catch (err) {
    console.log("Error in getGraceBasedThresholds:", err);
    return null;
  }
};

/**
 * Same as `getGraceBasedThresholds`, but for boards that list employees from SEVERAL
 * orgs/branches at once (the admin Overview). Each row is resolved against its OWN
 * `{companyId, branchId}` — one config fetch per DISTINCT scope, not per row — so a
 * branch that overrides its shift or on-site deadline colours only its own employees.
 *
 * Rows with no scope on them fall back to the logged-in user's scope, exactly as before.
 */
export const getScopedGraceThresholds = async (attendance: any[] = []) => {
  const rowsByScope = new Map<string, any[]>();
  attendance.forEach((row) => {
    const key = `${row?.companyId ?? ""}|${row?.branchId ?? ""}`;
    const bucket = rowsByScope.get(key);
    if (bucket) bucket.push(row);
    else rowsByScope.set(key, [row]);
  });

  const resolved = await Promise.all(
    Array.from(rowsByScope.entries()).map(async ([key, rows]) => {
      const [companyId, branchId] = key.split("|");
      const thresholds = await getGraceBasedThresholds(rows, {
        companyId: companyId || undefined,
        branchId: branchId || undefined,
      });
      return { rows, thresholds };
    })
  );

  const employeesWithThresholds: any[] = [];
  const leaveConfigByEmployeeId = new Map<string, Record<string, unknown>>();
  // Table-wide fallback for rows we couldn't scope — first scope that resolved wins.
  const defaultThresholds = resolved.find((r) => r.thresholds)?.thresholds?.defaultThresholds ?? null;

  resolved.forEach(({ rows, thresholds }) => {
    if (!thresholds) return;
    employeesWithThresholds.push(...thresholds.employeesWithThresholds);
    rows.forEach((row) => {
      if (row?.employeeId) leaveConfigByEmployeeId.set(row.employeeId, thresholds.leaveConfig);
    });
  });

  return { employeesWithThresholds, leaveConfigByEmployeeId, defaultThresholds };
};
 
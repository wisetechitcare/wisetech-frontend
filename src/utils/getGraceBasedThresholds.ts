import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { fetchConfiguration } from "@services/company";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";

dayjs.extend(duration);

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

export const getGraceBasedThresholds = async (attendance: any[] = []) => {
  try {

    const { data: { configuration: { configuration } } } = await fetchConfiguration(LEAVE_MANAGEMENT);
    const settings = JSON.parse(configuration);

    const checkInTime = settings["Check-in time"]; // "9:30 AM"
    const checkOutTime = settings["Check-out time"]; // "5:30 PM"
    const defaultGraceTime = settings["Grace Time"] || "00:30:00 Hrs"; // For Office/Hybrid employees
    const graceTimeOnSite = settings["Grace Time - On Site"] || "00:10:00 Hrs"; // For On-site employees

    // console.log("checkInTime:: ",checkInTime);
    // console.log("checkOutTime:: ",checkOutTime);
    // console.log("defaultGraceTime:: ",defaultGraceTime);
    // console.log("graceTimeOnSite:: ",graceTimeOnSite);

    const defaultThresholds = calculateThresholds(checkInTime, checkOutTime, defaultGraceTime);
    const onSiteThresholds = calculateThresholds(checkInTime, checkOutTime, graceTimeOnSite);

    const processedAttendance = attendance.map(employee => {
      
      let employeeThresholds;
      let appliedGraceType;
      
      if (employee.workingMethod === "On-site") {
        employeeThresholds = onSiteThresholds;
        appliedGraceType = "On-site Grace";
        // console.log(`Using on-site grace for ${employee.name}: ${graceTimeOnSite}`);
      } else {
        employeeThresholds = defaultThresholds;
        appliedGraceType = "Default Grace";
        // console.log(`Using default grace for ${employee.name} (${employee.workingMethod}): ${defaultGraceTime}`);
      }

      return {
        ...employee,
        lateCheckInThreshold: employeeThresholds.lateCheckInThreshold,
        earlyCheckOutThreshold: employeeThresholds.earlyCheckOutThreshold,
        appliedGraceType: appliedGraceType
      };
    });

    return {
      employeesWithThresholds: processedAttendance,
      
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
 
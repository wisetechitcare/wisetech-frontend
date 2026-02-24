import dayjs from "dayjs";

interface EmployeeRejoinHistory {
  id: string;
  employeeId: string;
  dateOfReJoining: string | null;
  dateOfReExit: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  dateOfJoining?: string | null;
  dateOfExit?: string | null;
  EmployeeRejoinHistory?: EmployeeRejoinHistory[];
  [key: string]: any;
}

/**
 * Calculate employee status dynamically based on dateOfExit and rejoin history
 * @param employee - Employee object with dateOfExit and EmployeeRejoinHistory
 * @returns 1 for Active, 0 for Inactive
 */
export const getEmployeeStatus = (employee: Employee): number => {
  if (!employee) {
    return 0;
  }

  const today = dayjs();
  
  // If no dateOfExit, employee is active
  if (!employee.dateOfExit) {
    return 1;
  }

  // If dateOfExit exists, check rejoin history
  const rejoinHistory = employee.EmployeeRejoinHistory;
  
  // If there's rejoin history, check the most recent entry
  if (rejoinHistory && rejoinHistory.length > 0) {
    // Sort by dateOfReJoining to get the most recent rejoin entry
    const sortedHistory = [...rejoinHistory].sort((a, b) => {
      // Handle null values - put them at the end
      if (!a.dateOfReJoining) return 1;
      if (!b.dateOfReJoining) return -1;
      return dayjs(b.dateOfReJoining).diff(dayjs(a.dateOfReJoining));
    });
    
    const mostRecentEntry = sortedHistory[0];
    
    // If most recent entry has no dateOfReExit, employee is active
    if (!mostRecentEntry.dateOfReExit) {
      return 1;
    }
    
    // If most recent entry has dateOfReExit, check if it's before today
    const reExitDate = dayjs(mostRecentEntry.dateOfReExit);
    if (reExitDate.isBefore(today, 'day') || reExitDate.isSame(today, 'day')) {
      return 0; // Inactive
    }
    
    return 1; // Active
  }
  
  // No rejoin history, check original dateOfExit
  const exitDate = dayjs(employee.dateOfExit);
  if (exitDate.isBefore(today, 'day') || exitDate.isSame(today, 'day')) {
    return 0; // Inactive
  }
  
  return 1; // Active
};

/**
 * Get employee status as string
 * @param employee - Employee object
 * @returns "Active" or "Inactive"
 */
export const getEmployeeStatusString = (employee: Employee): string => {
  let res = getEmployeeStatus(employee) === 0 && employee?.isActive==false
  return res==true ? "Inactive" : "Active";
};
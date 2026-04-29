export const shouldShowBranchSetupGuide = ( workingAndOffDays?: Record<string, string> ): boolean => {
    if (!workingAndOffDays || typeof workingAndOffDays !== 'object') return true;
  
    const values = Object.values(workingAndOffDays);
    const totalWorkingDays = values.filter(val => val === "1").length;
  
    return totalWorkingDays === 0; // Show guide if no working day is set
  };
  
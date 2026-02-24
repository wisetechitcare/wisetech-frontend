import { LeaveTypes, LeaveStatus } from "@constants/attendance";
import { SANDWICH_LEAVE_KEY } from "@constants/configurations-key";
import { Employee } from "@redux/slices/employee";
import { store } from "@redux/store";
import { fetchConfiguration, fetchBranchById } from "@services/company";
import { fetchEmployeeLeaves } from "@services/employee";
import dayjs, { Dayjs } from "dayjs";
import { generateFiscalYearFromGivenYear } from "./file";



interface SandwichRulesConfig {
    isSandwichLeaveFirstEnabled: boolean;   // Scenario 1: All Paid
    isSandwichLeaveSecondEnabled: boolean;  // Scenario 2: All Unpaid  
    isSandwichLeaveThirdEnabled: boolean;   // Scenario 3: Start Paid, End Unpaid
    isSandwichLeaveFourthEnabled: boolean;  // Scenario 4: Special Case
    isSandwichLeaveFifthEnabled: boolean;   // Scenario 5: Friday-Saturday Paid, Sunday-Monday Unpaid
    isSandwichLeaveSixthEnabled: boolean;   // Scenario 6: Only Friday Paid
    isSandwichLeaveSeventhEnabled: boolean; // Scenario 7: Only Friday Paid
}

const DEFAULT_SANDWICH_RULES: SandwichRulesConfig = {
    isSandwichLeaveFirstEnabled: false,
    isSandwichLeaveSecondEnabled: false,
    isSandwichLeaveThirdEnabled: false,
    isSandwichLeaveFourthEnabled: false,
    isSandwichLeaveFifthEnabled: false,
    isSandwichLeaveSixthEnabled: false,
    isSandwichLeaveSeventhEnabled: false
};

interface LeaveBlock {
    startDate: Dayjs;
    endDate: Dayjs;
    startType: 'Paid Leaves' | 'Unpaid Leaves';
    endType: 'Paid Leaves' | 'Unpaid Leaves';
    intermediateDays: Array<{
        date: Dayjs;
        isWeekend: boolean;
        isPublicHoliday: boolean;
        originalType?: string;
        dayName: string;
    }>;
    totalDays: number;
    scenario?: number;
    blockKey: string; // For logging purposes
}


export async function fetchSandwhichConfiguration() {
    const sandwhichConfiguration = await fetchConfiguration(SANDWICH_LEAVE_KEY)
    const jsonObjectSandwhich = JSON.parse(sandwhichConfiguration.data.configuration.configuration);
    return jsonObjectSandwhich;
}

export async function getAllWeekends(): Promise<number[]> {
    const currentEmployee = store.getState().employee.currentEmployee;
    const branchId = currentEmployee?.branchId;

    if (!branchId) {
        console.warn("BranchId not found");
        return [];
    }
    try {
        const { data } = await fetchBranchById(branchId);
        const rawString = data?.branch?.workingAndOffDays;
        if (!rawString) {
            console.warn("workingAndOffDays not found or empty");
            return [];
        }

        const weekendsConfig = JSON.parse(rawString);

        const dayMap: { [key: string]: number } = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
        };
        
        const weekends: number[] = Object.keys(dayMap)
            .filter(day => weekendsConfig[day]?.trim?.() === "0")
            .map(day => dayMap[day]);

        return weekends;
    } catch (error) {
        console.error("Error in getAllWeekends:", error);
        return [];
    }
}

export async function getAllLeaves(fromAdmin?: boolean, employee?: Employee[]) {
    const selectedEmployeeId = employee?.[0]?.id;
    if(!selectedEmployeeId) return;
    try {
        const fetchAllLeaves = await fetchEmployeeLeaves(selectedEmployeeId);
        return fetchAllLeaves.data?.leaves || [];
    } catch (error) {
        console.log("Error fetching getAllLeaves:", error);
        return [];
    }
}


export async function expandLeaveRange(leave: any): Promise<Array<{ date: any, type: string }>> {
    const result = [];
    const startDate = dayjs(leave.date || leave.dateFrom).startOf('day');
    const endDate = leave.dateTo ? dayjs(leave.dateTo).startOf('day') : startDate;
    
    // Get weekend days for the branch
    const weekendDays = await getAllWeekends();
    
    // Create an entry for each day in the range, excluding weekends
    let currentDate = startDate.clone();
    while (currentDate.isSameOrBefore(endDate)) {
        // Check if current day is not a weekend
        const dayOfWeek = currentDate.day(); // 0 for Sunday, 1 for Monday, etc.
        
        if (!weekendDays.includes(dayOfWeek)) {
            result.push({
                date: currentDate.clone(),
                type: leave.leaveOptions.leaveType as LeaveTypes
            });
        } else {
            console.log(`Skipping weekend day: ${currentDate.format('YYYY-MM-DD')}`);
        }
        
        currentDate = currentDate.add(1, 'day');
    }
    
    // console.log(`Expanded to ${result.length} individual leave days, excluding weekends`);
    return result;
}

//  helper function to check if a date is a public holiday
function isPublicHoliday(date: Dayjs, publicHolidays: any[]): boolean {
    if (!publicHolidays || publicHolidays.length === 0) return false;
    
    const dateStr = date.format('YYYY-MM-DD');
    return publicHolidays.some(holiday => {
        const holidayDate = dayjs(holiday.date).format('YYYY-MM-DD');
        return holidayDate === dateStr && holiday.isActive !== false;
    });
}

//  helper function to check if a date is a weekend
function isWeekend(date: Dayjs, weekendDays: number[]): boolean {
    return weekendDays.includes(date.day());
}

// Identify continuous blocks that need sandwich rule processing
function identifyLeaveBlocks(
    leaveMap: Map<string, string>,
    weekendDays: number[],
    publicHolidays: any[],
    startDate: Dayjs,
    endDate: Dayjs
): LeaveBlock[] {
    const blocks: LeaveBlock[] = [];
    const processedDates = new Set<string>();
    
    // Convert leaveMap to sorted array of dates
    const leaveDates = Array.from(leaveMap.keys())
        .map(dateStr => ({ 
            date: dayjs(dateStr), 
            type: leaveMap.get(dateStr)! 
        }))
        .filter(leave => leave.date.isBetween(startDate, endDate, 'day', '[]'))
        .sort((a, b) => a.date.unix() - b.date.unix());
    
    
    for (let i = 0; i < leaveDates.length; i++) {
        const currentLeave = leaveDates[i];
        const currentDateStr = currentLeave.date.format('YYYY-MM-DD');
        
        if (processedDates.has(currentDateStr)) continue;
        
        // Look for potential blocks starting from this leave
        for (let j = i + 1; j < leaveDates.length; j++) {
            const nextLeave = leaveDates[j];
            const daysBetween = nextLeave.date.diff(currentLeave.date, 'days');
            
            // Skip if too far apart (more than 7 days gap)
            if (daysBetween > 7 || daysBetween < 2) continue;
            
            // Check if there are only weekends/holidays between these leaves
            const intermediateDays: LeaveBlock['intermediateDays'] = [];
            let hasOnlyWeekendsOrHolidays = true;
            
            let tempDate = currentLeave.date.clone().add(1, 'day');
            while (tempDate.isBefore(nextLeave.date)) {
                const isWE = isWeekend(tempDate, weekendDays);
                const isPH = isPublicHoliday(tempDate, publicHolidays);
                const tempDateStr = tempDate.format('YYYY-MM-DD');
                const hasExistingLeave = leaveMap.has(tempDateStr);
                
                // Allow existing leaves in the middle (they might be manually set)
                if (!isWE && !isPH && !hasExistingLeave) {
                    hasOnlyWeekendsOrHolidays = false;
                    break;
                }
                
                intermediateDays.push({
                    date: tempDate.clone(),
                    isWeekend: isWE,
                    isPublicHoliday: isPH,
                    originalType: leaveMap.get(tempDateStr),
                    dayName: tempDate.format('dddd')
                });
                
                tempDate = tempDate.add(1, 'day');
            }
            
            // If we found a valid block, create it
            if (hasOnlyWeekendsOrHolidays && intermediateDays.length > 0) {
                const blockKey = `${currentLeave.date.format('MMM D')} - ${nextLeave.date.format('MMM D')}`;
                
                const block: LeaveBlock = {
                    startDate: currentLeave.date,
                    endDate: nextLeave.date,
                    startType: currentLeave.type as 'Paid Leaves' | 'Unpaid Leaves',
                    endType: nextLeave.type as 'Paid Leaves' | 'Unpaid Leaves',
                    intermediateDays,
                    totalDays: intermediateDays.length + 2, // +2 for start and end days
                    blockKey
                };
                
                blocks.push(block);
                
                // Mark dates as processed to avoid overlapping blocks
                processedDates.add(currentDateStr);
                processedDates.add(nextLeave.date.format('YYYY-MM-DD'));
                
                // console.log(`Identified block: ${blockKey} (${block.totalDays} total days)`);
                break; // Found a block starting from current leave, move to next
            }
        }
    }
    
    return blocks;
}

//  scenario classification with  priority logic
function classifyScenario(block: LeaveBlock, weekendDays: number[]): number {
    const { startDate, endDate, startType, endType, intermediateDays } = block;
    const hasPublicHoliday = intermediateDays.some(day => day.isPublicHoliday);
    const totalDays = block.totalDays;
    
    const startDay = startDate.day(); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
    const endDay = endDate.day();

    const saturday = intermediateDays.find(day => day.date.day() === 6);
    const sunday = intermediateDays.find(day => day.date.day() === 0);

    // console.log(`Classifying block: Start=${startType}, End=${endType}, TotalDays=${totalDays}, StartDay=${startDay}, EndDay=${endDay}`);
    // console.log(`HasPublicHoliday=${hasPublicHoliday}, IntermediateDays=${intermediateDays.length}`);

    // PRIORITY ORDER: Check specific patterns first, then general patterns

    // Scenario 6: (Friday=paid, saturday=weekends, sunday=weekend, monday=paid/unpaid) total= paid 1, unpaid=3
    if (startDay === 5 && // Friday
        endDay === 1 && // Monday
        startType === 'Paid Leaves' &&
        totalDays === 4 &&
        intermediateDays.length === 2 &&
        (sunday?.isWeekend || sunday?.isPublicHoliday) && // Has Saturday
        (saturday?.isWeekend || saturday?.isPublicHoliday)) { // Has Sunday
        return 6;
    }

    // Scenario 5: (friday paid, saturday paid, sunday=weekends/holidays, monday=unpaid) total= paid 2, unpaid=2 
    if (startDay === 5 && // Friday
        endDay === 1 && // Monday
        startType === 'Paid Leaves' &&
        totalDays === 4 &&
        intermediateDays.length === 2 &&
        saturday?.originalType === 'Paid Leaves' && // Has Saturday
        (sunday?.isWeekend || sunday?.isPublicHoliday)) { // Has Sunday
        // console.log(`Classified as Scenario 5 (Friday-Saturday Paid, Sunday-Monday Unpaid)`);
        return 5;
    }

    // GENERAL PATTERNS (Core sandwich logic)

    // Scenario 1: All Paid - Both paid, make everything paid, there should be 2 days(2weekends or 2holidays) between leave. then apply
    if (startType === 'Paid Leaves' && 
        endType === 'Paid Leaves' && 
        intermediateDays.length === 2 &&
        intermediateDays.every(day => day.isWeekend || day.isPublicHoliday)) {
        // console.log(`Classified as Scenario 1 (All Paid)`);
        return 1;
    }

    // Scenario 2: All Unpaid - Both unpaid, make everything unpaid, there should be 2 days(2weekends or 2 holidays) between leave. then apply
    if (startType === 'Unpaid Leaves' && 
        endType === 'Unpaid Leaves' && 
        intermediateDays.length === 2 &&
        intermediateDays.every(day => day.isWeekend || day.isPublicHoliday)) {
        // console.log(`Classified as Scenario 2 (All Unpaid)`);
        return 2;
    }

    // Scenario 3: Start Paid, End Unpaid - Middle follows start, there should be 2 days(2weekends or 2 holidays) between leave. then apply
    if ((startType === 'Paid Leaves' || startType === 'Unpaid Leaves') && 
        (endType === 'Paid Leaves' || endType === 'Unpaid Leaves') && 
        intermediateDays.length === 2 &&
        intermediateDays.every(day => day.isWeekend || day.isPublicHoliday)) {
        // console.log(`Classified as Scenario 3 (Start Paid or Unpaid, End Paid or Unpaid)`);
        return 3;
    }

    // Scenario 4: Special Case - (1day=paid, 2day=paid/unpaid, 3day=1weekend/1holiday, 4day=paid) total=paid=2 and unpaid=2
    if (startType === 'Paid Leaves' && 
        endType === 'Paid Leaves' &&
        totalDays === 4 &&
        intermediateDays.length === 2 &&
        intermediateDays.some(day => day.isWeekend || day.isPublicHoliday)) {
        // console.log(`Classified as Scenario 4 (Special Case: Start Paid, End Paid with 2 paid/2 unpaid)`);
        return 4;
    }

    // console.log(`No scenario matched`);
    return 0; // No scenario matches
}

// Apply sandwich rules based on scenario with detailed tracking
function applySandwichRule(
    block: LeaveBlock,
    scenario: number,
    leaveMap: Map<string, string>
): { appliedRule: string; changes: string[] } {
    const changes: string[] = [];
    let appliedRule = '';
    
    switch (scenario) {
        case 1: // All Paid - Both start and end are paid, make everything paid
            appliedRule = 'Scenario 1: All Paid';
            block.intermediateDays.forEach(day => {
                const dateKey = day.date.format('YYYY-MM-DD');
                const currentType = leaveMap.get(dateKey);
                if (currentType !== 'Paid Leaves') {
                    leaveMap.set(dateKey, 'Paid Leaves');
                    changes.push(`Set ${dateKey} (${day.dayName}) as Paid Leaves`);
                }
            });
            break;
            
        case 2: // All Unpaid - Both start and end are unpaid, make everything unpaid
            appliedRule = 'Scenario 2: All Unpaid';
            block.intermediateDays.forEach(day => {
                const dateKey = day.date.format('YYYY-MM-DD');
                const currentType = leaveMap.get(dateKey);
                if (currentType !== 'Unpaid Leaves') {
                    leaveMap.set(dateKey, 'Unpaid Leaves');
                    changes.push(`Set ${dateKey} (${day.dayName}) as Unpaid Leaves`);
                }
            });
            break;
            
        case 3: // Start Paid , End Unpaid - Middle follows start (paid)
            appliedRule = 'Scenario 3: Start Paid, End Unpaid';
            block.intermediateDays.forEach(day => {
                const dateKey = day.date.format('YYYY-MM-DD');
                const currentType = leaveMap.get(dateKey);
                if (currentType !== 'Paid Leaves') {
                    leaveMap.set(dateKey, 'Paid Leaves');
                    changes.push(`Set ${dateKey} (${day.dayName}) as Paid Leaves (following start)`);
                }
            });
            // End date remains unpaid as originally set
            break;
            
        case 4: // Special Case - 2 paid, 2 unpaid pattern
            appliedRule = 'Scenario 4: Special Case';
            // 2 paid days, 2 unpaid days
            let paidAssigned = 1; // Start day is already paid
            const targetPaid = 2;
            
            block.intermediateDays.forEach((day, index) => {
                const dateKey = day.date.format('YYYY-MM-DD');
                
                if (paidAssigned < targetPaid) {
                    if (day.isPublicHoliday || index === 0) { // Prioritize holidays or first intermediate
                        leaveMap.set(dateKey, 'Paid Leaves');
                        changes.push(`Set ${dateKey} (${day.dayName}) as Paid Leaves (special case)`);
                        paidAssigned++;
                    } else {
                        leaveMap.set(dateKey, 'Unpaid Leaves');
                        changes.push(`Set ${dateKey} (${day.dayName}) as Unpaid Leaves (special case)`);
                    }
                } else {
                    leaveMap.set(dateKey, 'Unpaid Leaves');
                    changes.push(`Set ${dateKey} (${day.dayName}) as Unpaid Leaves (special case)`);
                }
            });
            
            // Ensure end date is unpaid for special case
            const endDateKey = block.endDate.format('YYYY-MM-DD');
            leaveMap.set(endDateKey, 'Unpaid Leaves');
            changes.push(`Set ${endDateKey} as Unpaid Leaves (special case end)`);
            break;
            
        case 5: // Friday-Saturday Paid, Sunday-Monday Unpaid
            appliedRule = 'Scenario 5: Friday-Saturday Paid, Sunday-Monday Unpaid';
            // Total: 2 paid days (Fri+Sat), 2 unpaid days (Sun+Mon)
            block.intermediateDays.forEach(day => {
                const dateKey = day.date.format('YYYY-MM-DD');
                const dayOfWeek = day.date.day();
                
                if (dayOfWeek === 6) { // Saturday - make paid
                    leaveMap.set(dateKey, 'Paid Leaves');
                    changes.push(`Set ${dateKey} (Saturday) as Paid Leaves`);
                } else { // Sunday or other - make unpaid
                    leaveMap.set(dateKey, 'Unpaid Leaves');
                    changes.push(`Set ${dateKey} (${day.dayName}) as Unpaid Leaves`);
                }
            });
            
            // Force Monday (end date) to unpaid
            const mondayKey = block.endDate.format('YYYY-MM-DD');
            leaveMap.set(mondayKey, 'Unpaid Leaves');
            changes.push(`Set ${mondayKey} (Monday) as Unpaid Leaves (scenario 5 override)`);
            break;
            
        case 6: // Only Friday Paid - 1 paid (Friday), 3 unpaid (Sat+Sun+Mon)
            appliedRule = 'Scenario 6: Only Friday Paid';
            // Override all intermediate and end days to unpaid
            block.intermediateDays.forEach(day => {
                const dateKey = day.date.format('YYYY-MM-DD');
                leaveMap.set(dateKey, 'Unpaid Leaves');
                changes.push(`Set ${dateKey} (${day.dayName}) as Unpaid Leaves (Friday-only override)`);
            });
            
            // Force end date to unpaid regardless of original type
            const endKey = block.endDate.format('YYYY-MM-DD');
            leaveMap.set(endKey, 'Unpaid Leaves');
            changes.push(`Set ${endKey} as Unpaid Leaves (Friday-only override)`);
            break;
            
        default:
            appliedRule = 'No Rule Applied';
            break;
    }
    
    return { appliedRule, changes };
}

// main function with direct configuration fetching
async function resolveLeavesWithSandwich(
    year: Dayjs,
    month: Dayjs,
    sandwichRules?: SandwichRulesConfig, // Making optional since we'll fetch it from api, to reduce prop drilling
    fromAdmin?: boolean,
    employee?: Employee[]
): Promise<Map<string, string>> {
    
    // Fetch sandwich configuration directly to avoid stale prop issues
    let actualSandwichRules: SandwichRulesConfig;
    
    try {
        actualSandwichRules = await fetchSandwhichConfiguration();
    } catch (error) {
        console.warn("Failed to fetch sandwich configuration, using fallback:", error);
        // Fallback to passed prop or default
        actualSandwichRules = sandwichRules || DEFAULT_SANDWICH_RULES;
    }
    
    // DEBUG: Log the actual sandwich rules configuration being used

    
    const weekends = await getAllWeekends(); // [0, 6] for Sunday & Saturday    
    const leavesData = await getAllLeaves(fromAdmin, employee);
    const publicHolidays = store.getState().attendanceStats.publicHolidays;
    
    const startDate = month.startOf('month');
    // console.log("startDateInSandwich",startDate);
    
    // const endDate = dayjs(); // current date for only count salary report till current date
    const endDate = month.endOf('month');
    // console.log("endDateInSandwich",endDate);
    
    // For tracking which rules were applied - updated to match existing log format
    const appliedRules = {
        rule1: [] as string[], 
        rule2: [] as string[], 
        rule3: [] as string[], 
        rule4: [] as string[], 
        rule5: [] as string[], 
        rule6: [] as string[]  
    };    
    
    let approvedLeaves: Array<{ date: any, type: string }> = [];
    
    const relevantLeaves = leavesData.filter((leave: any) => {
        if (leave.status !== LeaveStatus.Approved) return false;
        
        // Check if the leave overlaps with current month
        const leaveStart = dayjs(leave.date || leave.dateFrom);
        const leaveEnd = leave.dateTo ? dayjs(leave.dateTo) : leaveStart;
        
        return leaveStart.isBefore(endDate) && leaveEnd.isAfter(startDate) || 
               leaveStart.isSame(startDate) || leaveEnd.isSame(endDate);
    });
    
    // Use Promise.all to wait for all expandLeaveRange calls to complete
    const expandedLeavesArrays = await Promise.all(
        relevantLeaves.map((leave: any) => expandLeaveRange(leave))
    );
    
    // Flatten the array of arrays into a single array
    approvedLeaves = expandedLeavesArrays.flat();
    
    // Filter to only include days within current month
    approvedLeaves = approvedLeaves.filter(leave => 
        leave.date.isBetween(startDate, endDate, 'day', '[]'));

    const paidTypes = [
        LeaveTypes.SICK_LEAVE,
        LeaveTypes.ANNUAL_LEAVE,
        LeaveTypes.FLOATER_LEAVE,
        LeaveTypes.CASUAL_LEAVE,
        LeaveTypes.MATERNAL_LEAVE
    ];

    // Handle multiple leaves on the same day
    const leaveMap = new Map<string, string>();
    const leavesByDate = new Map<string, Array<{type: string, isPaid: boolean}>>();

    // Group leaves by date
    approvedLeaves.forEach((leave: any) => {
        const dateKey = leave.date.format('YYYY-MM-DD');
        const isPaid = paidTypes.includes(leave.type);
        const leaveInfo = { type: leave.type, isPaid };
        
        if (leavesByDate.has(dateKey)) {
            leavesByDate.get(dateKey)!.push(leaveInfo);
        } else {
            leavesByDate.set(dateKey, [leaveInfo]);
        }
    });

    // Process multiple leaves for the same day and set initial leave map
    leavesByDate.forEach((leaves, dateKey) => {
        const hasPaidLeave = leaves.some(leave => leave.isPaid);
        leaveMap.set(dateKey, hasPaidLeave ? 'Paid Leaves' : 'Unpaid Leaves');
    });

    
    // Identify and process blocks using new algorithm
    const blocks = identifyLeaveBlocks(leaveMap, weekends, publicHolidays, startDate, endDate);
    
    // Process each block
    blocks.forEach((block, index) => {
        const scenario = classifyScenario(block, weekends);
        block.scenario = scenario;
        
        // Check if this scenario is enabled using correct property names
        let isEnabled = false;
        let rulePropertyName = '';
        switch (scenario) {
            case 1: 
                isEnabled = actualSandwichRules.isSandwichLeaveFirstEnabled; 
                rulePropertyName = 'isSandwichLeaveFirstEnabled';
                break;
            case 2: 
                isEnabled = actualSandwichRules.isSandwichLeaveSecondEnabled; 
                rulePropertyName = 'isSandwichLeaveSecondEnabled';
                break;
            case 3: 
                isEnabled = actualSandwichRules.isSandwichLeaveThirdEnabled; 
                rulePropertyName = 'isSandwichLeaveThirdEnabled';
                break;
            case 4: 
                isEnabled = actualSandwichRules.isSandwichLeaveFourthEnabled; 
                rulePropertyName = 'isSandwichLeaveFourthEnabled';
                break;
            case 5: 
                isEnabled = actualSandwichRules.isSandwichLeaveFifthEnabled; 
                rulePropertyName = 'isSandwichLeaveFifthEnabled';
                break;
            case 6: 
                isEnabled = actualSandwichRules.isSandwichLeaveSixthEnabled; 
                rulePropertyName = 'isSandwichLeaveSixthEnabled';
                break;
            default: 
                isEnabled = false;
                rulePropertyName = 'unknown';
        }
        
        // console.log(`  Rule check: ${rulePropertyName} = ${isEnabled}`);
        
        if (scenario > 0 && isEnabled) {
            const result = applySandwichRule(block, scenario, leaveMap);
            
            // Update appliedRules tracking to match existing format
            const ruleKey = `rule${scenario}` as keyof typeof appliedRules;
            appliedRules[ruleKey].push(block.blockKey);
            
            // console.log(`APPLIED: ${result.appliedRule}`);
            result.changes.forEach(change => console.log(`    - ${change}`));
        } else {
            const enabledStatus = scenario > 0 ? `${rulePropertyName} is ${isEnabled}` : 'no scenario matched';
            // console.log(`SKIPPED: Scenario ${scenario} (${enabledStatus})`);
        }
    });
    
    // Calculate final summary
    let paidCount = 0;
    let unpaidCount = 0;
    leaveMap.forEach(value => {
        if (value === 'Paid Leaves') paidCount++;
        else if (value === 'Unpaid Leaves') unpaidCount++;
    });
    
    // Generate summary matching existing log format
    // console.log("\n===== SANDWICH RULES SUMMARY =====");
    for (const [rule, dates] of Object.entries(appliedRules)) {
        if (dates.length > 0) {
            // console.log(`${rule.toUpperCase()}: Applied to ${dates.length} weekend block(s): ${dates.join(', ')}`);
        }
    }
    
    // Log totals
    // console.log(`Total Paid: ${paidCount}, Total Unpaid: ${unpaidCount}`);
    // console.log("Final Leave Map with Sandwich Logic:", leaveMap);

    return leaveMap;
}


export async function getAllPaidLeavesCurrentMonthWithSandwich(
    year: Dayjs, 
    month: Dayjs, 
    sandwichRules: SandwichRulesConfig,
    fromAdmin?: boolean,
    employee?: Employee[]
): Promise<number> {
    const leaveMap = await resolveLeavesWithSandwich(year, month, sandwichRules,fromAdmin, employee);
    return Array.from(leaveMap.values()).filter(v => v === 'Paid Leaves').length;
}

export async function getAllUnPaidLeavesCurrentMonthWithSandwich(
    year: Dayjs, 
    month: Dayjs, 
    sandwichRules: SandwichRulesConfig,
    fromAdmin?: boolean,
    employee?: Employee[]
): Promise<number> {
    const leaveMap = await resolveLeavesWithSandwich(year, month, sandwichRules,fromAdmin, employee);
    return Array.from(leaveMap.values()).filter(v => v === 'Unpaid Leaves').length;
}

export async function getAllPaidLeavesCurrentMonth(
    year: Dayjs, 
    month: Dayjs, 
    sandwichRules: SandwichRulesConfig,
    fromAdmin?: boolean,
    employee?: Employee[]
) {
    if(sandwichRules) {
        return await getAllPaidLeavesCurrentMonthWithSandwich(year, month, sandwichRules,fromAdmin, employee);
    }
    
    // Rest of the function remains the same
    const {startDate, endDate} = await generateFiscalYearFromGivenYear(year, true);
    const yearValue = year.year();
    const monthValue = month.month() + 1;

    const formattedMonth = String(monthValue).padStart(2, '0');

    const currentMonth = dayjs(`${yearValue}-${formattedMonth}-01`, 'YYYY-MM-DD');
    const startDateOfCurrentMonth = currentMonth.startOf('month').format('YYYY-MM-DD');
    const endDateOfCurrentMonth = currentMonth.endOf('month').format('YYYY-MM-DD');
    
    if (!currentMonth.isValid()) {
        console.error("Invalid date created:", `${yearValue}-${formattedMonth}-01`);
        return 0;
    }

    // Get all approved leaves
    const totalApprovedLeaves = store.getState().attendanceStats.leaves.filter((leave: any) => leave.status == LeaveStatus.Approved);
    const leavesInRange: { date: string; type: LeaveTypes }[] = [];
    
    // Process each leave for date range
    for (const leave of totalApprovedLeaves) {
        const leaveStart = dayjs(leave.date || leave.dateFrom);
        const leaveEnd = leave.dateTo ? dayjs(leave.dateTo) : leaveStart;
        
        // Create an entry for each day in the leave range
        let currentDate = leaveStart.clone();
        while (currentDate.isSameOrBefore(leaveEnd)) {
            // Only include if within current month
            if (currentDate.format('YYYY-MM') === currentMonth.format('YYYY-MM')) {
                leavesInRange.push({
                    date: currentDate.format('YYYY-MM-DD'),
                    type: leave.leaveOptions.leaveType as LeaveTypes
                });
            }
            currentDate = currentDate.add(1, 'day');
        }
    }
    
    // Filter by paid leave types
    const paidLeaveTypes = [
        LeaveTypes.CASUAL_LEAVE,
        LeaveTypes.MATERNAL_LEAVE,
        LeaveTypes.FLOATER_LEAVE,
        LeaveTypes.SICK_LEAVE,
        LeaveTypes.ANNUAL_LEAVE
    ];
    
    const paidLeaves = leavesInRange.filter(leave => paidLeaveTypes.includes(leave.type));
    return paidLeaves.length;
}

export async function getAllPaidLeavesCurrentMonthFilteredByStartAndEndDate(
    year: Dayjs, 
    month: Dayjs, 
    sandwichRules: SandwichRulesConfig,
    startDateOfMonthOrYear: Dayjs,
    fromAdmin?: boolean,
    employee?: Employee[],
) {
    if(sandwichRules) {
        return await getAllPaidLeavesCurrentMonthWithSandwich(year, month, sandwichRules,fromAdmin, employee);
    }
    
    // Rest of the function remains the same
    // const {startDate, endDate} = await generateFiscalYearFromGivenYear(year, true);
    const yearValue = year.year();
    const monthValue = month.month() + 1;

    const formattedMonth = String(monthValue).padStart(2, '0');

    const currentMonth = dayjs(`${yearValue}-${formattedMonth}-01`, 'YYYY-MM-DD');
    const startDateOfCurrentMonth = startDateOfMonthOrYear.startOf('month').format('YYYY-MM-DD');
    const endDateOfCurrentMonth =  dayjs(startDateOfMonthOrYear).endOf("month").isSameOrBefore(dayjs()) ? dayjs(startDateOfMonthOrYear).endOf("month").format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    
    if (!currentMonth.isValid()) {
        console.error("Invalid date created:", `${yearValue}-${formattedMonth}-01`);
        return 0;
    }

    // Get all approved leaves
    const totalApprovedLeaves = store.getState().attendanceStats.leaves.filter((leave: any) => leave.status == LeaveStatus.Approved);
    const leavesInRange: { date: string; type: LeaveTypes }[] = [];
    
    // Process each leave for date range
    for (const leave of totalApprovedLeaves) {
        const leaveStart = dayjs(leave.date || leave.dateFrom);
        const leaveEnd = leave.dateTo ? dayjs(leave.dateTo) : leaveStart;
        
        // Create an entry for each day in the leave range
        let currentDate = leaveStart.clone();
        while (currentDate.isSameOrBefore(leaveEnd) && currentDate.isSameOrBefore(endDateOfCurrentMonth) && currentDate.isSameOrAfter(startDateOfCurrentMonth)) {
            // Only include if within current month
            if (currentDate.format('YYYY-MM') === currentMonth.format('YYYY-MM')) {
                leavesInRange.push({
                    date: currentDate.format('YYYY-MM-DD'),
                    type: leave.leaveOptions.leaveType as LeaveTypes
                });
            }
            currentDate = currentDate.add(1, 'day');
        }
    }
    
    // Filter by paid leave types
    const paidLeaveTypes = [
        LeaveTypes.CASUAL_LEAVE,
        LeaveTypes.MATERNAL_LEAVE,
        LeaveTypes.FLOATER_LEAVE,
        LeaveTypes.SICK_LEAVE,
        LeaveTypes.ANNUAL_LEAVE
    ];
    
    const paidLeaves = leavesInRange.filter(leave => paidLeaveTypes.includes(leave.type));
    return paidLeaves.length;
}

export async function getAllUnPaidLeavesCurrentMonth(
    year: Dayjs, 
    month: Dayjs, 
    sandwichRules: SandwichRulesConfig,
    fromAdmin?:boolean,
    employee?: Employee[]
) {
    if(sandwichRules) {
        return await getAllUnPaidLeavesCurrentMonthWithSandwich(year, month, sandwichRules,fromAdmin, employee);
    }
    
    // Rest of the function with date range support
    const weekends = await getAllWeekends();
    
    const {startDate, endDate} = await generateFiscalYearFromGivenYear(year, true);
    const yearValue = year.year();
    const monthValue = month.month() + 1;

    const formattedMonth = String(monthValue).padStart(2, '0');

    const currentMonth = dayjs(`${yearValue}-${formattedMonth}-01`, 'YYYY-MM-DD');
    const startDateOfCurrentMonth = currentMonth.startOf('month').format('YYYY-MM-DD');
    const endDateOfCurrentMonth = currentMonth.endOf('month').format('YYYY-MM-DD');
    
    if (!currentMonth.isValid()) {
        console.error("Invalid date created:", `${yearValue}-${formattedMonth}-01`);
        return 0;
    }
    
    // Get all approved leaves
    const totalApprovedLeaves = store.getState().attendanceStats.leaves.filter((leave: any) => leave.status == LeaveStatus.Approved);
    
    const unpaidLeavesInRange: { date: string }[] = [];
    
    // Process each leave for date range
    for (const leave of totalApprovedLeaves) {
        if (leave.leaveOptions.leaveType !== LeaveTypes.UNPAID_LEAVE) continue;
        
        const leaveStart = dayjs(leave.date || leave.dateFrom);
        const leaveEnd = leave.dateTo ? dayjs(leave.dateTo) : leaveStart;
        
        // Create an entry for each day in the leave range
        let currentDate = leaveStart.clone();
        while (currentDate.isSameOrBefore(leaveEnd)) {
            // Only include if within current month
            if (currentDate.format('YYYY-MM') === currentMonth.format('YYYY-MM')) {
                unpaidLeavesInRange.push({
                    date: currentDate.format('YYYY-MM-DD')
                });
            }
            currentDate = currentDate.add(1, 'day');
        }
    }
    
    return unpaidLeavesInRange.length;
}

// for yearly sandwich 
export async function resolveLeavesWithSandwichInRange(
    start: Dayjs,
    end: Dayjs,
    sandwichRules?: SandwichRulesConfig,
    fromAdmin?: boolean,
    employee?: Employee[]
): Promise<Map<string, string>> {
    // Fetch sandwich configuration directly to avoid stale prop issues
    let actualSandwichRules: SandwichRulesConfig;

    try {
        actualSandwichRules = await fetchSandwhichConfiguration();
    } catch (error) {
        // Fallback to passed prop or default
        actualSandwichRules = sandwichRules || DEFAULT_SANDWICH_RULES;
    }

    // DEBUG: Log the actual sandwich rules configuration being used

    const weekends = await getAllWeekends(); // [0, 6] for Sunday & Saturday
    const leavesData = await getAllLeaves(fromAdmin, employee);
    const publicHolidays = store.getState().attendanceStats.publicHolidays;

    // For tracking which rules were applied - updated to match existing log format
    const appliedRules = {
        rule1: [] as string[],
        rule2: [] as string[],
        rule3: [] as string[],
        rule4: [] as string[],
        rule5: [] as string[],
        rule6: [] as string[]
    };

    let approvedLeaves: Array<{ date: any, type: string }> = [];

    const relevantLeaves = leavesData.filter((leave: any) => {
        if (leave.status !== LeaveStatus.Approved) return false;

        // Check if the leave overlaps with the fiscal year
        const leaveStart = dayjs(leave.date || leave.dateFrom);
        const leaveEnd = leave.dateTo ? dayjs(leave.dateTo) : leaveStart;

        return leaveStart.isBefore(end) && leaveEnd.isAfter(start) ||
               leaveStart.isSame(start) || leaveEnd.isSame(end);
    });

    // Use Promise.all to wait for all expandLeaveRange calls to complete
    const expandedLeavesArrays = await Promise.all(
        relevantLeaves.map((leave: any) => expandLeaveRange(leave))
    );

    // Flatten the array of arrays into a single array
    approvedLeaves = expandedLeavesArrays.flat();

    // Filter to only include days within the fiscal year
    approvedLeaves = approvedLeaves.filter(leave =>
        leave.date.isBetween(start, end, 'day', '[]'));

    const paidTypes = [
        LeaveTypes.SICK_LEAVE,
        LeaveTypes.ANNUAL_LEAVE,
        LeaveTypes.FLOATER_LEAVE,
        LeaveTypes.CASUAL_LEAVE,
        LeaveTypes.MATERNAL_LEAVE
    ];

    // Handle multiple leaves on the same day
    const leaveMap = new Map<string, string>();
    const leavesByDate = new Map<string, Array<{type: string, isPaid: boolean}>>();
    
    // Group leaves by date
    approvedLeaves.forEach((leave: any) => {
        const dateKey = leave.date.format('YYYY-MM-DD');
        const isPaid = paidTypes.includes(leave.type);
        const leaveInfo = { type: leave.type, isPaid };

        if (leavesByDate.has(dateKey)) {
            leavesByDate.get(dateKey)!.push(leaveInfo);
        } else {
            leavesByDate.set(dateKey, [leaveInfo]);
        }
    });

    // Process multiple leaves for the same day and set initial leave map
    leavesByDate.forEach((leaves, dateKey) => {
        const hasPaidLeave = leaves.some(leave => leave.isPaid);
        leaveMap.set(dateKey, hasPaidLeave ? 'Paid Leaves' : 'Unpaid Leaves');
    });

    // console.log(`\n===== NEW SANDWICH RULES PROCESSING =====`);
    // console.log(`Initial leave map size: ${leaveMap.size}`);

    // Identify and process blocks using new algorithm
    const blocks = identifyLeaveBlocks(leaveMap, weekends, publicHolidays, start, end);
    // console.log(`Found ${blocks.length} potential sandwich blocks`);

    // Process each block
    blocks.forEach((block, index) => {
        const scenario = classifyScenario(block, weekends);
        block.scenario = scenario;

        // console.log(`\nBlock ${index + 1}: ${block.blockKey}`);
        // console.log(`  Start: ${block.startDate.format('MMM D')} (${block.startType})`);
        // console.log(`  End: ${block.endDate.format('MMM D')} (${block.endType})`);
        // console.log(`  Intermediate days: ${block.intermediateDays.length}`);
        // console.log(`  Total days: ${block.totalDays}`);

        // Check if this scenario is enabled using correct property names
        let isEnabled = false;
        let rulePropertyName = '';
        switch (scenario) {
            case 1:
                isEnabled = actualSandwichRules.isSandwichLeaveFirstEnabled;
                rulePropertyName = 'isSandwichLeaveFirstEnabled';
                break;
            case 2:
                isEnabled = actualSandwichRules.isSandwichLeaveSecondEnabled;
                rulePropertyName = 'isSandwichLeaveSecondEnabled';
                break;
            case 3:
                isEnabled = actualSandwichRules.isSandwichLeaveThirdEnabled;
                rulePropertyName = 'isSandwichLeaveThirdEnabled';
                break;
            case 4:
                isEnabled = actualSandwichRules.isSandwichLeaveFourthEnabled;
                rulePropertyName = 'isSandwichLeaveFourthEnabled';
                break;
            case 5:
                isEnabled = actualSandwichRules.isSandwichLeaveFifthEnabled;
                rulePropertyName = 'isSandwichLeaveFifthEnabled';
                break;
            case 6:
                isEnabled = actualSandwichRules.isSandwichLeaveSixthEnabled;
                rulePropertyName = 'isSandwichLeaveSixthEnabled';
                break;
            default:
                isEnabled = false;
                rulePropertyName = 'unknown';
        }

        // console.log(`  Rule check: ${rulePropertyName} = ${isEnabled}`);

        if (scenario > 0 && isEnabled) {
            const result = applySandwichRule(block, scenario, leaveMap);

            // Update appliedRules tracking to match existing format
            const ruleKey = `rule${scenario}` as keyof typeof appliedRules;
            appliedRules[ruleKey].push(block.blockKey);

            // console.log(`   APPLIED: ${result.appliedRule}`);
            result.changes.forEach(change => console.log(`    - ${change}`));
        } else {
            const enabledStatus = scenario > 0 ? `${rulePropertyName} is ${isEnabled}` : 'no scenario matched';
            // console.log(`   SKIPPED: Scenario ${scenario} (${enabledStatus})`);
        }
    });

    // Calculate final summary
    let paidCount = 0;
    let unpaidCount = 0;
    leaveMap.forEach(value => {
        if (value === 'Paid Leaves') paidCount++;
        else if (value === 'Unpaid Leaves') unpaidCount++;
    });

    // Generate summary matching existing log format
    // console.log("\n===== SANDWICH RULES SUMMARY =====");
    for (const [rule, dates] of Object.entries(appliedRules)) {
        if (dates.length > 0) {
            // console.log(`${rule.toUpperCase()}: Applied to ${dates.length} weekend block(s): ${dates.join(', ')}`);
        }
    }

    // Log totals

    return leaveMap;
}

export async function getAllPaidLeavesWithSandwichInRange(
    start: Dayjs,
    end: Dayjs,
    sandwichRules: SandwichRulesConfig,
    fromAdmin?: boolean,
    employee?: Employee[]
): Promise<number> {
    const leaveMap = await resolveLeavesWithSandwichInRange(start, end, sandwichRules, fromAdmin, employee);
    
    return Array.from(leaveMap.values()).filter(v => v === 'Paid Leaves').length;
}

export async function getAllUnpaidLeavesWithSandwichInRange(
    start: Dayjs,
    end: Dayjs,
    sandwichRules: SandwichRulesConfig,
    fromAdmin?: boolean,
    employee?: Employee[]
): Promise<number> {
    const leaveMap = await resolveLeavesWithSandwichInRange(start, end, sandwichRules, fromAdmin, employee);
    return Array.from(leaveMap.values()).filter(v => v === 'Unpaid Leaves').length;
}

export async function getAllPaidLeaveOfYear(
    year: Dayjs,
    sandwichRules: SandwichRulesConfig = DEFAULT_SANDWICH_RULES,
    fromAdmin?: boolean,
    employee?: Employee[]
) {
    const {startDate, endDate} = await generateFiscalYearFromGivenYear(year, true);
    const startDateDayjs = dayjs(startDate);
    const endDateDayjs = dayjs(endDate);
    
    if(sandwichRules) {
        const data = await getAllPaidLeavesWithSandwichInRange(startDateDayjs, endDateDayjs, sandwichRules, fromAdmin, employee);
        
        return data;
    }

    // Process all leaves with date range support
    const totalApprovedLeaves = store.getState().attendanceStats.leaves.filter((leave: any) => leave.status == LeaveStatus.Approved);
    const leavesInRange: { date: string; type: LeaveTypes }[] = [];
    
    // Expand date ranges for all leaves
    for (const leave of totalApprovedLeaves) {
        const leaveStart = dayjs(leave.date || leave.dateFrom);
        const leaveEnd = leave.dateTo ? dayjs(leave.dateTo) : leaveStart;

        // Only process if leave falls within fiscal year
        if (leaveEnd.isBefore(startDateDayjs) || leaveStart.isAfter(endDateDayjs)) continue;

        // Create an entry for each day in the leave range
        let currentDate = leaveStart.clone();
        while (currentDate.isSameOrBefore(leaveEnd)) {
            // Only include if within fiscal year
            if (currentDate.isBetween(startDateDayjs, endDateDayjs, 'day', '[]')) {
                leavesInRange.push({
                    date: currentDate.format('YYYY-MM-DD'),
                    type: leave.leaveOptions.leaveType as LeaveTypes
                });
            }
            currentDate = currentDate.add(1, 'day');
        }
    }

    // Filter by paid leave types
    const paidLeaveTypes = [
        LeaveTypes.CASUAL_LEAVE,
        LeaveTypes.MATERNAL_LEAVE,
        LeaveTypes.FLOATER_LEAVE,
        LeaveTypes.SICK_LEAVE,
        LeaveTypes.ANNUAL_LEAVE
    ];

    const paidLeaves = leavesInRange.filter(leave => paidLeaveTypes.includes(leave.type));
    return paidLeaves.length;
}

export async function getAllPaidLeaveOfYearFilteredByStartAndEndDate(
    year: Dayjs,
    sandwichRules: SandwichRulesConfig = DEFAULT_SANDWICH_RULES,
    fromAdmin?: boolean,
    employee?: Employee[],
    startDateOfMonthOrYear?: Dayjs,
) {
    const {startDate, endDate} = await generateFiscalYearFromGivenYear(year, true);
    const startDateDayjs = dayjs(startDateOfMonthOrYear);
    const endDateDayjs = dayjs(endDate).isSameOrBefore(dayjs())? dayjs(endDate): dayjs();
    
    if(sandwichRules) {
        const data = await getAllPaidLeavesWithSandwichInRange(startDateDayjs, endDateDayjs, sandwichRules, fromAdmin, employee);        
        return data;
    }

    // Process all leaves with date range support
    const totalApprovedLeaves = store.getState().attendanceStats.leaves.filter((leave: any) => leave.status == LeaveStatus.Approved);
    const leavesInRange: { date: string; type: LeaveTypes }[] = [];
    
    // Expand date ranges for all leaves
    for (const leave of totalApprovedLeaves) {
        const leaveStart = dayjs(leave.date || leave.dateFrom);
        const leaveEnd = leave.dateTo ? dayjs(leave.dateTo) : leaveStart;

        // Only process if leave falls within fiscal year
        if (leaveEnd.isBefore(startDateDayjs) || leaveStart.isAfter(endDateDayjs)) continue;

        // Create an entry for each day in the leave range
        let currentDate = leaveStart.clone();
        while (currentDate.isSameOrBefore(leaveEnd)) {
            // Only include if within fiscal year
            if (currentDate.isBetween(startDateDayjs, endDateDayjs, 'day', '[]')) {
                leavesInRange.push({
                    date: currentDate.format('YYYY-MM-DD'),
                    type: leave.leaveOptions.leaveType as LeaveTypes
                });
            }
            currentDate = currentDate.add(1, 'day');
        }
    }

    // Filter by paid leave types
    const paidLeaveTypes = [
        LeaveTypes.CASUAL_LEAVE,
        LeaveTypes.MATERNAL_LEAVE,
        LeaveTypes.FLOATER_LEAVE,
        LeaveTypes.SICK_LEAVE,
        LeaveTypes.ANNUAL_LEAVE
    ];

    const paidLeaves = leavesInRange.filter(leave => paidLeaveTypes.includes(leave.type));
    return paidLeaves.length;
}

export async function getAllUnPaidLeavesForCurrentYear(
    year: Dayjs,
    sandwichRules: SandwichRulesConfig = DEFAULT_SANDWICH_RULES,
    fromAdmin?: boolean,
    employee?: Employee[],
    startDateOfMonthOrYear?: Dayjs
) {
    const {startDate, endDate} = await generateFiscalYearFromGivenYear(year, true);
    const startDateDayjs = dayjs(startDateOfMonthOrYear);
    const endDateDayjs = dayjs(endDate).isSameOrBefore(dayjs())? dayjs(endDate): dayjs();

    if(sandwichRules) {
        return await getAllUnpaidLeavesWithSandwichInRange(startDateDayjs, endDateDayjs, sandwichRules, fromAdmin, employee);
    }

    // Process unpaid leaves with date range support
    const totalApprovedLeaves = store.getState().attendanceStats.leaves.filter((leave: any) => leave.status == LeaveStatus.Approved);

    const unpaidLeavesInRange: { date: string }[] = [];

    // Expand date ranges for unpaid leaves
    for (const leave of totalApprovedLeaves) {
        if (leave.leaveOptions.leaveType !== LeaveTypes.UNPAID_LEAVE) continue;

        const leaveStart = dayjs(leave.date || leave.dateFrom);
        const leaveEnd = leave.dateTo ? dayjs(leave.dateTo) : leaveStart;

        // Create an entry for each day in the leave range
        let currentDate = leaveStart.clone();
        while (currentDate.isSameOrBefore(leaveEnd)) {
            // Only include if within fiscal year
            if (currentDate.isBetween(startDateDayjs, endDateDayjs, 'day', '[]')) {
                unpaidLeavesInRange.push({
                    date: currentDate.format('YYYY-MM-DD')
                });
            }
            currentDate = currentDate.add(1, 'day');
        }
    }

    return unpaidLeavesInRange.length;
}

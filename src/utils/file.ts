import { saveCurrentCompanyInfo } from "@redux/slices/company";
import { ICustomColorCode, setCustomColors } from "@redux/slices/customColors";
import { store } from "@redux/store";
import { fetchCompanyOverview } from "@services/company";
import { createColors, fetchAllColors } from "@services/options";
import dayjs, { Dayjs } from "dayjs";
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

export function dataURLtoFile(dataurl: any, filename: string) {
    const arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[arr.length - 1]);
    let n = bstr.length,
        u8arr = new Uint8Array(n)
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2:number) {

        function toRadians(degrees: any) {            
            return degrees * Math.PI / 180;
        }
    
        const R = 6371000;
    
        const lat1Rad = toRadians(lat1);
        const lon1Rad = toRadians(lon1);
        const lat2Rad = toRadians(lat2);
        const lon2Rad = toRadians(lon2);
    
        const dLat = lat2Rad - lat1Rad;
        const dLon = lon2Rad - lon1Rad;
    
        const a = Math.sin(dLat / 2)**2 + 
                  Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
                  Math.sin(dLon / 2)**2;
    
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
        const distance = R * c;
        return distance;
}

export async function generateFiscalYearFromGivenYear(year: dayjs.Dayjs, fromAdmin: boolean = false) {
    
    // --- Retrieve company details as before ---
    const currEmployee = fromAdmin 
        ? store.getState().employee.selectedEmployee 
        : store.getState().employee.currentEmployee;
    const currEmplyeeCompanyId = currEmployee?.companyId;
    let companyDetails = store.getState().company.currentCompany;
    if (!companyDetails?.id) {
        const { data: { companyOverview } } = await fetchCompanyOverview();
        companyDetails = companyOverview.filter((el: any) => el.id == currEmplyeeCompanyId)[0];
        if (!companyDetails) {
            companyDetails = companyOverview[0];
        }
        store.dispatch(saveCurrentCompanyInfo({
            id: companyDetails?.id,
            name: companyDetails?.name,
            fiscalYear: companyDetails?.fiscalYear,
            showDateIn12HourFormat: companyDetails?.showDateIn12HourFormat || "0"
        }));
    }

    const fiscalYearDetails = companyDetails?.fiscalYear;
    if (!fiscalYearDetails) {
        // Default fiscal year: April 1 to March 31
        const today = dayjs();
        const providedYear = year.year();

        // Determine fiscal year based on current date
        // If today is April or later, fiscal year starts this year
        // If today is Jan-March, fiscal year started last year
        let fiscalStartYear: number;
        if (today.month() >= 3) { // April = month 3 (0-indexed)
            fiscalStartYear = today.year();
        } else {
            fiscalStartYear = today.year() - 1;
        }

        // Apply offset if a different year was requested
        const offset = providedYear - today.year();
        fiscalStartYear = fiscalStartYear + offset;

        return {
            startDate: dayjs(`${fiscalStartYear}-04-01`).format('YYYY-MM-DD'),
            endDate: dayjs(`${fiscalStartYear + 1}-03-31`).format('YYYY-MM-DD')
        };
    }

    // --- Parse the fiscal year details from DB ---
    // Expected format: "2020-04-01 to 2021-03-31"
    const [fromDateDetails, toDateDetails] = fiscalYearDetails.split('to').map((val: string) => val.trim());
    let [dbFromYear, dbFromMonth, dbFromDay] = fromDateDetails.split('-').map(Number);
    let [dbToYear, dbToMonth, dbToDay] = toDateDetails.split('-').map(Number);

    let finalFromDate: dayjs.Dayjs, finalToDate: dayjs.Dayjs;
    const today = dayjs();
    const providedYear = year.year();  // The calendar year passed as parameter

    // In the DB, if the fiscal period spans two calendar years, then we expect (dbToYear - dbFromYear) === 1
    if (dbToYear - dbFromYear === 1) {
        // Step 1: Determine the candidate fiscal base year for today based on month–day.
        // If today is on or after the fiscal start (dbFromMonth/dbFromDay), candidate is today.year(), else one less.
        let candidateYearForToday: number;
        if (
            (today.month() + 1) > dbFromMonth || 
            ((today.month() + 1) === dbFromMonth && today.date() >= dbFromDay)
        ) {
            candidateYearForToday = today.year();
        } else {
            candidateYearForToday = today.year() - 1;
        }
        
        // Step 2: Compute offset as the difference between the provided year and today's calendar year.
        // This ensures we “shift” the fiscal range by the same amount as the difference between the provided parameter and today.
        const offset = providedYear - today.year();
        const finalCandidateYear = candidateYearForToday + offset;
        
        finalFromDate = dayjs(`${finalCandidateYear}-${dbFromMonth}-${dbFromDay}`, "YYYY-M-D");
        finalToDate = dayjs(`${finalCandidateYear + 1}-${dbToMonth}-${dbToDay}`, "YYYY-M-D");
    } else if (dbToYear - dbFromYear === 0) {
        // For a fiscal period defined within a single calendar year.
        // First, decide the candidate fiscal year for today based on month/day comparison.
        const todayMD = dayjs(`${today.month() + 1}-${today.date()}`, "M-D");
        const fiscalStartMD = dayjs(`${dbFromMonth}-${dbFromDay}`, "M-D");
        let candidateYearForToday = todayMD.isBefore(fiscalStartMD) ? today.year() - 1 : today.year();
        
        const offset = providedYear - today.year();
        const finalCandidateYear = candidateYearForToday + offset;
        
        finalFromDate = dayjs(`${finalCandidateYear}-${dbFromMonth}-${dbFromDay}`, "YYYY-M-D");
        finalToDate = dayjs(`${finalCandidateYear}-${dbToMonth}-${dbToDay}`, "YYYY-M-D");
    } else {
        // If the DB format is unrecognized, fall back to the provided year's calendar boundaries.
        finalFromDate = year.startOf('year');
        finalToDate = year.endOf('year');
    }
    
    
    return {
        startDate: finalFromDate.format('YYYY-MM-DD'),
        endDate: finalToDate.format('YYYY-MM-DD')
    };
}



export const checkIfAnyValueIsUndefined = (obj: Record<string, any>) => {
    if (!obj) return true;
  
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (!obj[key]) {
          return true;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkIfAnyValueIsUndefined(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
};

export const deleteUndefinedValuesFromObject = (obj: Record<string, any>) => {
    const newObj = {...obj};
    for (const key in newObj) {
        if (Object.prototype.hasOwnProperty.call(newObj, key)) {
            if (!newObj[key]) {
                delete newObj[key];
            }
            if (typeof newObj[key] === 'object' && newObj[key] !== null) {                
                newObj[key] = deleteUndefinedValuesFromObject(newObj[key]);
            }
        }
    }
    return newObj;
};

export async function fetchColorAndStoreInSlice(){
    const colorsData = store.getState().customColors;

    if(checkIfAnyValueIsUndefined(colorsData)){
        const res = await fetchAllColors();
        
        let { data: { colors } } = res;

        const currColorValues: ICustomColorCode = {
            id: colors[0]?.id,
            attendanceCalendar: {
                todayColor: "#3498DB",
                presentColor: "#2ECC71",
                absentColor: "#DAF7A6",
                onLeaveColor: "#FFC300",
                weekendColor: "#E74C3C",
                workingWeekendColor: "#900C3F",
                markedPresentViaRequestRaisedColor: "#FF5733",
            },
            attendanceOverview: {
                presentColor: "#FF5733",
                onLeaveColor: "#FFC300",
                absentColor: "#DAF7A6",
                holidayColor: "#900C3F",
                extraDayColor: "#581845",
            },
            workingPattern: {
                totalWorkingDaysColor: '#3498DB',
                checkInColor:'#3498DB',
                checkoutColor:'#3498DB',
                earlyCheckinColor: '#9B59B6',
                lateCheckinColor: '#E74C3C',
                earlyCheckoutColor: '#2ECC71',
                lateCheckoutColor: '#E74C3C',
                missingCheckoutColor: '#2ECC71',
            },
            workingLocation: {
                officeColor: '#3498DB',
                onSiteColor: '#A93226',
                remoteColor: '#F7DC6F',
            },
            momentsThatMatter: {
                birthdaysColor: '#3498DB',
                anniversariesColor: '#A93226',
            },
            leaveTypes: {
                sickLeaveColor: '#E74C3C',
                casualLeaveColor: '#3498DB',
                annualLeaveColor: '#2ECC71',
                maternalLeaveColor: '#9B59B6',
                floaterLeaveColor: '#F39C12',
                unpaidLeaveColor: '#95A5A6',
            },
        };

        if(!colors?.length && !res?.hasError){
            const res = await createColors(currColorValues);
            const id = res?.data?.id;
            if(id){
                store.dispatch(setCustomColors({...currColorValues, id}));
            }
            return currColorValues;
        }

        const currColor : Record<string, any> = {};        

        Object.entries(colors[0])?.forEach(([key, val]) => {
            if (key !== 'id') {
                try {
                    if(val){
                        currColor[key] = JSON.parse(val as string);
                    }
                } catch (error) {
                    console.error(`Error parsing JSON for key ${key}:`, error);
                    currColor[key] = val;
                }
            }else{
                currColor[key]=val as string;
            }
        });

        const finalColors = deleteUndefinedValuesFromObject(currColor);
        store.dispatch(setCustomColors({...currColorValues, ...finalColors}));

        return currColorValues;
    }
    return colorsData;
}
import dayjs, { Dayjs } from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';
import { store } from "@redux/store";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

export const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

export const generateDatesForMonth = (monthDate: string) => {
    const dates = [];
    const date = new Date(monthDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let day = 1; day <= daysInMonth; day++) {
        const formattedDay = day.toString().padStart(2, '0');
        const formattedDbMonth = (month).toString().padStart(2, '0');
        const formattedMonth = monthNames[month - 1];
        const formattedDate = `${formattedDay} ${formattedMonth}, ${year}`;
        const formattedDbDate = `${formattedDay}/${formattedDbMonth}/${year}`;
        dates.push({ date: formattedDate, dbDate: formattedDbDate });
    }

    return dates;
}

export const generateDatesForMonth2 = (monthDate: Date) => {
    const dates = [];
    const date = new Date(monthDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let day = 1; day <= daysInMonth; day++) {
        const formattedDay = day.toString().padStart(2, '0');
        const formattedDbMonth = (month).toString().padStart(2, '0');
        const formattedMonth = monthNames[month - 1];
        const formattedDate = `${formattedDay} ${formattedMonth}, ${year}`;
        const formattedDbDate = `${formattedDay}/${formattedDbMonth}/${year}`;
        dates.push({ date: formattedDate, dbDate: formattedDbDate });
    }

    return dates;
}

export const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

export const findTimeDifference = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return '-NA-';
    const checkInMinutes = timeToMinutes(checkIn);
    const checkOutMinutes = timeToMinutes(checkOut);
    let differenceInMinutes = checkOutMinutes - checkInMinutes;

    if (differenceInMinutes >= 60) {
        const diffHours = (differenceInMinutes / 60).toFixed(2);
        return `${diffHours} Hrs`;
    } else {
        return `${differenceInMinutes} Mins`;
    }
}

export function decimalHoursToHHMM(decimalStr: string): string {
    const decimal = parseFloat(decimalStr);
    if (isNaN(decimal)) return "-NA-";

    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}


// export const formatTime = (dtTime: Dayjs) => {
//     if (!dtTime || !dtTime.isValid()) {
//         return '';
//     }

//     // Get the 12-hour format setting from Redux store
//     const state = store.getState();
//     const showIn12HourFormat = state?.company?.currentCompany?.showDateIn12HourFormat === "1";

//     // Format based on the setting
//     if (showIn12HourFormat) {
//         const formattedTime = dtTime.format('h:mm:ss A');
//         return formattedTime === "Invalid Date" ? '' : formattedTime;
//     } else {
//         const formattedTime = dtTime.format('HH:mm:ss');
//         return formattedTime === "Invalid Date" ? '' : formattedTime;
//     }
// }

export const formatTime = (dtTime: Dayjs) => {
    if (!dtTime || !dtTime.isValid()) {
        return '';
    }

    // Always use 12-hour format with AM/PM
    const formattedTime = dtTime.format('h:mm:ss A');
    return formattedTime === "Invalid Date" ? '' : formattedTime;
}

// Always returns time in 24-hour format for internal calculations
export const formatTime24Hour = (dtTime: Dayjs) => {
    if (!dtTime || !dtTime.isValid()) {
        return '';
    }
    const formattedTime = dtTime.format('HH:mm:ss');
    return formattedTime === "Invalid Date" ? '' : formattedTime;
}

export const convertToTimeZone = (date: string, timeZone: string) => {
    return dayjs(date).utc().tz(timeZone);
};

export const calculateDuration = (startDate: string) => {
    const start = dayjs(startDate);
    const now = dayjs();

    const diffYears = now.diff(start, 'year');
    const diffMonths = now.diff(start, 'month') % 12;
    const diffDays = now.diff(start, 'day') % 30;

    return {
        years: diffYears,
        months: diffMonths,
        days: diffDays,
    };
};

export function formatDate(date: Date) {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    let suffix = 'th';
    const exceptions = [11, 12, 13];
    const lastDigit = day % 10;
    if (!exceptions.includes(day % 100)) {
        if (lastDigit === 1) suffix = 'st';
        else if (lastDigit === 2) suffix = 'nd';
        else if (lastDigit === 3) suffix = 'rd';
    }

    return `${day}${suffix} ${month}, ${year}`;
}

export const isDateBeforeOrSameAsCurrDate = (date: string) => {
    const [day, month, year] = date.split('/');
    const pastDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const presentDate = new Date();
    presentDate.setHours(0, 0, 0, 0);

    return pastDate <= presentDate;
}

export const isDateAfterOrSameAsEmployeeOnboardingDate = (date: string) => {
    const employeeCreationDate = store.getState().employee.currentEmployee?.dateOfJoining;
    const employeeOnboardingDate = dayjs(employeeCreationDate).format('DD/MM/YYYY');

    if(!employeeCreationDate) return true;

    const [day, month, year] = date.split('/');
    const currDatePassed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const employeeOnboardingDatePassed = new Date(parseInt(employeeOnboardingDate.split('/')[2]), parseInt(employeeOnboardingDate.split('/')[1]) - 1, parseInt(employeeOnboardingDate.split('/')[0]));
    
    if (currDatePassed < employeeOnboardingDatePassed) return false;
    
    return true;
}

export const getWeekDay = (transformedDate: string) => {
    return dayjs(transformedDate).format('dddd');
}
export const formatNotificationDate = (dateString: string) => {
    const date = dayjs(dateString).tz("Asia/Kolkata");

    if (date.isSame(dayjs(), 'day')) {
        return `Today, ${date.format('h:mm A')}`;   // e.g., Today, 4:30 PM
    } else {
        return date.format('D MMMM, h:mm A');        // e.g., 20 March, 10:00 PM
    }
};


/**
 * Converts 24-hour time format to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "14:30", "14:30:45", "09:15")
 * @returns Time in 12-hour format with AM/PM (e.g., "2:30 PM", "2:30:45 PM", "9:15 AM")
 */
export const convertTo12HourFormat = (time24: string): string => {
    if (!time24 || time24 === '-NA-' || time24 === 'N/A') {
      return time24 || 'N/A';
    }
  
    try {
      // If already in 12-hour format (contains AM or PM), return as-is
      const upperTime = time24.toUpperCase().trim();
      if (upperTime.includes('AM') || upperTime.includes('PM')) {
        return time24;
      }

      // Handle different time formats (HH:mm or HH:mm:ss)
      const timeParts = time24.split(':');
      if (timeParts.length < 2 || timeParts.length > 3) {
        return time24; // Return original if format is invalid
      }
  
      // Create a dayjs object with today's date and the provided time
      const today = dayjs().format('YYYY-MM-DD');
      const hasSeconds = timeParts.length === 3;
      const format = hasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm';
      
      const dateTime = dayjs(`${today} ${time24}`, format);
      
      if (!dateTime.isValid()) {
        return time24; // Return original if parsing fails
      }
  
      // Format to 12-hour format with AM/PM
      const format12Hour = hasSeconds ? 'h:mm:ss A' : 'h:mm A';
      return dateTime.format(format12Hour);
    } catch (error) {
      console.error('Error converting time format:', error);
      return time24; // Return original time if conversion fails
    }
  };
  
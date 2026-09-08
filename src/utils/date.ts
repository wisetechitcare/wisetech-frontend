import dayjs, { Dayjs } from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { store } from "@redux/store";
import { getTimeTokens } from "./timeFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
// Extended HERE, not left to whichever screen happens to import it first: the
// time-string helpers below parse with an explicit format, and without this
// plugin dayjs silently ignores that argument and falls back to Date parsing.
dayjs.extend(customParseFormat);

/**
 * Default business timezone — the fallback used when a record's own branch
 * timezone isn't available (e.g. legacy data with no branch relation loaded).
 * NOT the source of truth for any specific record: always prefer that
 * record's own `branches.timezone` (or the viewed employee's) when present.
 * Consolidated here so the same constant isn't redeclared per-file.
 */
export const MUMBAI_TZ = 'Asia/Kolkata';

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
    const differenceInMinutes = checkOutMinutes - checkInMinutes;

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


/**
 * Display a time with seconds, in whichever format the viewer reads —
 * `2:30:45 PM` or `14:30:45`.
 *
 * This used to consult `company.currentCompany.showDateIn12HourFormat` directly,
 * was commented out, and was replaced by a hardcoded 12h format. The preference is
 * back, but it now comes from `utils/timeFormat.ts`, which resolves the full
 * personal → branch → org → 12h chain instead of one org field.
 *
 * DISPLAY ONLY — for anything that gets parsed or compared, use
 * {@link formatTime24Hour}.
 */
export const formatTime = (dtTime: Dayjs) => {
    if (!dtTime || !dtTime.isValid()) {
        return '';
    }

    const formattedTime = dtTime.format(getTimeTokens().TIME_WITH_SECONDS);
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

/**
 * Weekday name for a date/instant. Pass `timezone` (a record's own branch
 * timezone) whenever `transformedDate` is a raw UTC instant (e.g. a check-in
 * timestamp) — without it, this resolves in the BROWSER's local timezone,
 * which is wrong for a viewer outside that record's business timezone.
 * Omit `timezone` only for values that are already timezone-neutral pure
 * calendar dates (e.g. a 'YYYY-MM-DD' string).
 */
export const getWeekDay = (transformedDate: string, timezone?: string) => {
    return timezone
        ? dayjs(transformedDate).tz(timezone).format('dddd')
        : dayjs(transformedDate).format('dddd');
}
export const formatNotificationDate = (dateString: string) => {
    const date = dayjs(dateString).tz("Asia/Kolkata");

    const { TIME } = getTimeTokens();
    if (date.isSame(dayjs(), 'day')) {
        return `Today, ${date.format(TIME)}`;         // e.g., Today, 4:30 PM · Today, 16:30
    } else {
        return date.format(`D MMMM, ${TIME}`);        // e.g., 20 March, 10:00 PM · 20 March, 22:00
    }
};


/**
 * Render an already-formatted time STRING in whichever format the viewer reads.
 *
 * The display counterpart of {@link convertTo12HourFormat}, and what almost every
 * caller of that function actually wanted: attendance rows carry times as strings
 * (`"09:15"` off the API, sometimes `"9:15 AM"` after an earlier conversion), and
 * those strings have to end up in the user's chosen format rather than always in
 * 12h. Accepts either shape and preserves whether seconds were present, so a
 * column that showed `09:15:30` doesn't quietly lose its seconds.
 *
 * Anything it cannot parse is handed back untouched — these values include
 * sentinels like `-NA-` and `N/A` that must survive to the cell as-is.
 *
 * DISPLAY ONLY. Never feed the result back into a parser: the shape changes with
 * the viewer's preference, which is exactly what breaks shift and salary maths.
 *
 * @example formatTimeString('14:30')     // '2:30 PM'  or  '14:30'
 * @example formatTimeString('2:30:45 PM')// '2:30:45 PM' or '14:30:45'
 */
export const formatTimeString = (time: string | null | undefined, fallback = 'N/A'): string => {
    if (!time || time === '-NA-' || time === 'N/A') return time || fallback;

    const raw = time.trim();
    const isMeridiem = /[AP]\.?M\.?$/i.test(raw);
    // Count the colons on the TIME part only — `2:30:45 PM` has two, `2:30 PM` one.
    const hasSeconds = (raw.match(/:/g) || []).length >= 2;

    const parsed = isMeridiem
        ? dayjs(raw, ['h:mm:ss A', 'h:mm A', 'hh:mm:ss A', 'hh:mm A'])
        : dayjs(raw, ['HH:mm:ss', 'HH:mm', 'H:mm:ss', 'H:mm']);

    if (!parsed.isValid()) return time;

    const tokens = getTimeTokens();
    return parsed.format(hasSeconds ? tokens.TIME_WITH_SECONDS : tokens.TIME);
};

/**
 * Converts 24-hour time format to 12-hour format with AM/PM
 *
 * ⚠️ Forces 12h regardless of the viewer's preference. Kept for the callers that
 * genuinely mean "12-hour" (a fixed label, a value compared against one). For a
 * time a USER READS, use {@link formatTimeString} instead so it follows the
 * app-wide 12/24h setting.
 *
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
  
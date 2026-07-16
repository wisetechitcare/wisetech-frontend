import { Dayjs } from "dayjs";

export const DATE_FORMATS = {
  FULL: "DD MMM, YYYY",
  MONTH_YEAR: "MMM YYYY",
  YEAR_ONLY: "YYYY",
  FISCAL_YEAR: "[FY] YYYY",
  DATE_PICKER: "DD/MM/YYYY",
};

export const formatDateRange = (start: Dayjs, end: Dayjs, includeYear: boolean = false): string => {
  if (!start || !end || !start.isValid() || !end.isValid()) return "";
  
  const isSameMonth = start.isSame(end, "month");
  const isSameYear = start.isSame(end, "year");
  
  let result = "";
  if (start.isSame(end, "day")) {
      result = start.format("D MMM");
  } else if (isSameMonth && isSameYear) {
      result = `${start.format("D")} - ${end.format("D MMM")}`;
  } else {
      result = `${start.format("D MMM")} - ${end.format("D MMM")}`;
  }
  
  if (includeYear) {
      result += `, ${end.format("YYYY")}`;
  }
  
  return result;
};

export const buildFiscalYearLabel = (start: Dayjs, rawEnd: Dayjs, end: Dayjs): string => {
  if (!start || !rawEnd || !start.isValid() || !rawEnd.isValid()) return "";
  return `FY ${start.format("YYYY")}-${rawEnd.format("YY")}`;
};

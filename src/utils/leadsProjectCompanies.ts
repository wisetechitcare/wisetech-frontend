import dayjs from "dayjs";

export const getDurationText = (startDate: string, endDate: string) => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const diffInMs = end.diff(start);
    const dur = dayjs.duration(diffInMs);
  
    const years = Math.floor(dur.asYears());
    const months = Math.floor(dur.asMonths() % 12);
    const days = Math.floor(dur.asDays() % 30.44); 
  
    return `${years > 0 ? `${years} Years ` : ''}${months > 0 ? `${months} Months ` : ''}${days > 0 ? `${days} Days` : ''}`.trim();
};
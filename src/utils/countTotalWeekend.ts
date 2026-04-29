export function countTotalWeekends(startDate: string, endDate: string, publicHolidays: any[], weekendConfig: any) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      console.warn("start date should be after end date");
    }
    
    const defaultWeekendConfig = {
      sunday: "0",
      monday: "1", 
      tuesday: "1",
      wednesday: "1",
      thursday: "1",
      friday: "1",
      saturday: "0"
    };
    
    const config: any = { ...defaultWeekendConfig, ...weekendConfig };
    
    const dayMapping: any = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    
    const weekendDays = Object.keys(config)
      .filter((day: any) => config[day] === "0")
      .map((day: any) => dayMapping[day]);
    
    let weekendCount = 0;
    
    const publicHolidayWeekends = new Set();
    publicHolidays.forEach(holiday => {
      if (holiday.isWeekend) {
        const holidayDate = new Date(holiday.date);
        publicHolidayWeekends.add(holidayDate.toDateString());
      }
    });
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toDateString();
      
      // Check if current day is a weekend according to config
      const isConfiguredWeekend = weekendDays.includes(dayOfWeek);
      
      // Check if current day is a public holiday weekend
      const isPublicHolidayWeekend = publicHolidayWeekends.has(dateString);
      
      // Count if it's either a configured weekend or a public holiday weekend
      if (isConfiguredWeekend || isPublicHolidayWeekend) {
        weekendCount++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return weekendCount;
  }
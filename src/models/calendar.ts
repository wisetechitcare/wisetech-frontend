export interface ICalendarEvent {
    employeeId: string,
    eventName: string,
    startDate: Date | string,
    endDate: Date | string,
    isActive: boolean,
}
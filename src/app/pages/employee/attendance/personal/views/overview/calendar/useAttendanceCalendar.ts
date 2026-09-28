/**
 * Moved to `@hooks/useAttendanceCalendar`.
 *
 * The attendance-correction module in `modules/common` reads a day through this
 * hook, and a shared component reaching into a page folder is the coupling the kit
 * rules exist to prevent. Re-exported here so every existing import keeps working.
 */
export * from '@hooks/useAttendanceCalendar';

import { describe, it, expect } from "vitest";
import { ABSENT, CHECK_OUT_MISSING, EXTRA_DAYS, HOLIDAYS, ON_LEAVE, PRESENT, WEEKEND } from "@constants/statistics";
import type { CalendarDay } from "@app/pages/employee/attendance/personal/views/overview/calendar/types";
import { chartStatsFromCalendarDays, monthsCoveringRange } from "./calendarChartStats";

const day = (partial: Partial<CalendarDay> & { date: string; status: CalendarDay["status"] }): CalendarDay => ({
    inMonth: true,
    modifiers: [],
    actual: { checkIn: null, checkOut: null, minutesWorked: null },
    expected: { checkIn: null, checkOut: null, source: null },
    workMode: null,
    ...partial,
});

describe("monthsCoveringRange", () => {
    it("lists every YYYY-MM between bounds inclusive", () => {
        expect(monthsCoveringRange("2026-07-15", "2026-09-02")).toEqual([
            "2026-07", "2026-08", "2026-09",
        ]);
    });
});

describe("chartStatsFromCalendarDays", () => {
    it("counts expected working days from the server day kinds, not Sat/Sun", () => {
        // Alternate-Saturday company: Sat 8th is weekly_off, Sat 1st is working (absent).
        const days = [
            day({ date: "2026-08-01", status: "absent" }),           // Sat working
            day({ date: "2026-08-02", status: "weekly_off" }),       // Sun
            day({ date: "2026-08-03", status: "present", actual: { checkIn: "09:00", checkOut: "18:00", minutesWorked: 480 } }),
            day({ date: "2026-08-08", status: "weekly_off" }),       // alt Sat off
            day({ date: "2026-08-15", status: "holiday" }),
        ];
        const { workingDays, donut } = chartStatsFromCalendarDays(days);
        expect(workingDays).toBe(2); // 1st + 3rd
        expect(donut.get(WEEKEND)).toBe(2);
        expect(donut.get(HOLIDAYS)).toBe(1);
        expect(donut.get(PRESENT)).toBe(1);
        expect(donut.get(ABSENT)).toBe(1);
    });

    it("weights half-day leave as 0.5 and scores a worked half as Present", () => {
        const days = [
            day({
                date: "2026-08-04",
                status: "half_day",
                leave: { type: "Casual", fraction: 0.5, session: "first_half", leaveId: "l1" },
                actual: { checkIn: "14:00", checkOut: "18:00", minutesWorked: 240 },
            }),
        ];
        const { donut } = chartStatsFromCalendarDays(days);
        expect(donut.get(ON_LEAVE)).toBe(0.5);
        expect(donut.get(PRESENT)).toBe(1);
    });

    it("puts worked-on-off-day into Extra Days, not Present", () => {
        const days = [
            day({
                date: "2026-08-09",
                status: "present",
                modifiers: ["worked_on_off_day"],
                actual: { checkIn: "09:00", checkOut: "13:00", minutesWorked: 240 },
            }),
        ];
        const { workingDays, donut } = chartStatsFromCalendarDays(days);
        expect(workingDays).toBe(0);
        expect(donut.get(EXTRA_DAYS)).toBe(1);
        expect(donut.get(PRESENT)).toBe(0);
    });

    it("counts missing checkout separately from Present", () => {
        const days = [
            day({
                date: "2026-08-05",
                status: "present",
                modifiers: ["missing_check_out"],
                actual: { checkIn: "09:00", checkOut: null, minutesWorked: null },
            }),
        ];
        const { donut } = chartStatsFromCalendarDays(days);
        expect(donut.get(CHECK_OUT_MISSING)).toBe(1);
        expect(donut.get(PRESENT)).toBe(0);
    });

    it("excludes future days from the denominator when throughToday", () => {
        const days = [
            day({ date: "2026-08-03", status: "present", actual: { checkIn: "09:00", checkOut: "18:00", minutesWorked: 480 } }),
            day({ date: "2026-08-20", status: "future" }),
        ];
        expect(chartStatsFromCalendarDays(days, { throughToday: true }).workingDays).toBe(1);
        expect(chartStatsFromCalendarDays(days, { throughToday: false }).workingDays).toBe(2);
    });
});

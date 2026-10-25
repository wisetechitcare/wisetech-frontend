import { describe, it, expect } from "vitest";
import type { IEmployeesAttendance } from "@models/employee";
import { summarizeAttendanceByEmployee } from "./attendancePeriodSummary";

type Row = IEmployeesAttendance & { dayKind?: string | null };

const row = (partial: Partial<Row> & { date: string }): Row => ({
    id: partial.date,
    employeeId: "e1",
    code: "E1",
    name: "Asha",
    checkIn: "09:00",
    checkOut: "18:00",
    status: "Present",
    duration: "9h 0m",
    durationMinutes: 540,
    workingMethod: "-NA-",
    location: "-NA-",
    day: "",
    ...partial,
});

const summarize = (
    rows: Row[],
    { workingDays = 5, leave = 0, halfDays }: { workingDays?: number; leave?: number; halfDays?: string[] } = {},
) =>
    summarizeAttendanceByEmployee(rows, {
        roster: [{ _id: "e1", firstName: "Asha" }],
        workingDaysFor: () => workingDays,
        leaveDaysByEmployee: new Map(leave ? [["e1", leave]] : []),
        halfDayLeaveDatesByEmployee: halfDays ? new Map([["e1", new Set(halfDays)]]) : undefined,
    })[0];

describe("summarizeAttendanceByEmployee", () => {
    it("does not count off-day work as present, so it cannot hide an absence", () => {
        const s = summarize([
            row({ date: "2026-08-03", dayKind: "working" }),
            row({ date: "2026-08-08", dayKind: "weekend" }), // alternate off-Saturday
            row({ date: "2026-08-15", dayKind: "holiday" }),
        ]);
        expect(s.present).toBe(1);
        expect(s.absent).toBe(4);
        // Worked time still includes the off-day work.
        expect(s.workedMinutes).toBe(540 * 3);
    });

    it("counts rows without a dayKind exactly as before", () => {
        const s = summarize([
            row({ date: "2026-08-03" }),
            row({ date: "2026-08-08", dayKind: null }),
        ]);
        expect(s.present).toBe(2);
        expect(s.absent).toBe(3);
    });

    it("still counts a missing check-out on any day", () => {
        const s = summarize([row({ date: "2026-08-08", dayKind: "weekend", checkOut: "-NA-" })]);
        expect(s.present).toBe(0);
        expect(s.checkoutMissing).toBe(1);
    });

    it("weights a worked half-day-leave day as 0.5 present + 0.5 leave", () => {
        const s = summarize(
            [row({ date: "2026-08-03", dayKind: "working" }), row({ date: "2026-08-04", dayKind: "working" })],
            { workingDays: 5, leave: 0.5, halfDays: ["2026-08-04"] },
        );
        expect(s.present).toBe(1.5);
        expect(s.leave).toBe(0.5);
        expect(s.absent).toBe(3);
    });

    it("without half-day dates keeps the old 1-per-worked-day count", () => {
        const s = summarize([row({ date: "2026-08-04", dayKind: "working" })], { workingDays: 5, leave: 0.5 });
        expect(s.present).toBe(1);
        expect(s.absent).toBe(3.5);
    });
});

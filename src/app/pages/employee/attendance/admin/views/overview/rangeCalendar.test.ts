import dayjs from "dayjs";
import {
    hydrateNonWorking,
    isNonWorkingForEmployee,
    countWorkingDaysFromCalendar,
} from "./rangeCalendar";

describe("rangeCalendar", () => {
    const range = {
        mode: "monthly" as const,
        start: dayjs("2026-08-01"),
        end: dayjs("2026-08-07"),
    };

    it("hydrates scopes into Sets and preserves employeeScopes", () => {
        const cal = hydrateNonWorking({
            data: {
                scopes: { "c1|b1": ["2026-08-01", "2026-08-02"] },
                employeeScopes: { e1: "c1|b1" },
            },
        });
        expect(cal.scopes["c1|b1"]?.has("2026-08-01")).toBe(true);
        expect(cal.employeeScopes.e1).toBe("c1|b1");
    });

    it("counts working days from the server calendar, not the admin weekend map", () => {
        // Sat+Sun off in the admin map, but this employee's calendar only marks Sunday.
        const weekends = { saturday: "0", sunday: "0", monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1" };
        const cal = hydrateNonWorking({
            data: {
                scopes: { "c1|b1": ["2026-08-02"] }, // Sunday only
                employeeScopes: { e1: "c1|b1" },
            },
        });
        // Aug 1 Sat → working for e1; Aug 2 Sun → off; Mon–Fri working → 6
        expect(countWorkingDaysFromCalendar(range, cal, { employeeId: "e1", weekends })).toBe(6);
        // Without a server scope, Saturday is still off via the weekend map → 5
        expect(countWorkingDaysFromCalendar(range, cal, { employeeId: "missing", weekends })).toBe(5);
    });

    it("isNonWorkingForEmployee reads the employee's own scope", () => {
        const cal = hydrateNonWorking({
            data: {
                scopes: { "c1|b1": ["2026-08-08"] },
                employeeScopes: { e1: "c1|b1" },
            },
        });
        expect(isNonWorkingForEmployee(cal, "e1", "2026-08-08")).toBe(true);
        expect(isNonWorkingForEmployee(cal, "e1", "2026-08-07")).toBe(false);
        expect(isNonWorkingForEmployee(cal, "other", "2026-08-08")).toBe(false);
    });
});

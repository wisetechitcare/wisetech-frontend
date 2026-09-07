import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { toSortableTime, dateSortingFn } from "./dateSort";

/**
 * Was dateSort.check.ts — a standalone script needing `esbuild … | node`, which meant
 * nobody ran it. Same assertions, now part of `pnpm test`.
 *
 * Why this exists: MRT's default `sortingFn: 'auto'` sorts a display string
 * alphanumerically. It chunks "30/07/2024" into [30, 7, 2024] and orders by DAY OF MONTH
 * first; "DD MMM YYYY" is worse, because the month sorts alphabetically (Apr, Aug, Dec…).
 */

const t = (v: unknown) => toSortableTime(v);

// A display date parses to LOCAL midnight — "30/07/2024" means the 30th in the viewer's
// zone, not 18:30Z the day before. Compare local calendar parts, or this fails everywhere
// east of Greenwich (IST is +5:30).
const iso = (v: unknown) => {
    const ms = t(v);
    if (!ms) return "0";
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

describe("day-first display formats parse to the right calendar day", () => {
    test("all supported display formats", () => {
        assert.equal(iso("30/07/2024"), "2024-07-30", "DD/MM/YYYY");
        assert.equal(iso("01-04-2026"), "2026-04-01", "DD-MM-YYYY, day-first not month-first");
        assert.equal(iso("2025.12.03"), "2025-12-03", "company display standard YYYY.MM.DD");
        assert.equal(iso("04 Aug 2026"), "2026-08-04", "DD MMM YYYY");
        assert.equal(iso("30-Jul-2024"), "2024-07-30", "DD-MMM-YYYY");
        assert.equal(iso("04 Aug 2026, 09:15 AM"), "2026-08-04", "DD MMM YYYY, hh:mm A");
    });
});

describe("raw wire / native values still work", () => {
    test("ISO strings and Date objects", () => {
        // Midday UTC so the local calendar day is stable from UTC-11 to UTC+11.
        assert.equal(iso("2024-07-30"), "2024-07-30", "ISO date");
        assert.equal(iso("2024-07-30T12:00:00.000Z"), "2024-07-30", "ISO datetime");
        assert.equal(iso(new Date("2024-07-30T12:00:00Z")), "2024-07-30", "Date object");
    });
});

describe("blanks sort as oldest, never NaN", () => {
    test("NaN would corrupt the entire sort, not just one row", () => {
        for (const blank of [null, undefined, "", "  ", "-", "—", "N/A", "n/a", "garbage"]) {
            assert.equal(t(blank), 0, `blank/unparseable → 0, got ${t(blank)} for ${String(blank)}`);
            assert.ok(!Number.isNaN(t(blank)), "must never return NaN");
        }
    });
});

describe("the regression this was written for", () => {
    test("day-of-month must not dominate the ordering", () => {
        assert.ok(t("30/07/2024") < t("01/04/2026"), "2024 must sort before 2026");
        assert.ok(t("25/07/2022") < t("08/01/2026"), "day-of-month must not dominate");
    });

    test("months must not order alphabetically", () => {
        assert.ok(t("01 Apr 2026") < t("04 Aug 2026"), "Apr before Aug");
        assert.ok(t("04 Aug 2026") < t("01 Dec 2026"), "Aug before Dec — not alphabetical");
    });
});

describe("comparator wiring, end to end", () => {
    test("ascending: blanks oldest, then chronological", () => {
        const row = (v: unknown) => ({ getValue: () => v });
        const sorted = ["08/01/2026", "N/A", "25/07/2022", "30/07/2024"]
            .map(row)
            .sort((a, b) => dateSortingFn(a, b, "d"))
            .map((r) => r.getValue());
        assert.deepEqual(
            sorted,
            ["N/A", "25/07/2022", "30/07/2024", "08/01/2026"],
            "ascending: blanks oldest, then chronological",
        );
    });

    test("cache hit matches cold parse", () => {
        assert.equal(t("30/07/2024"), t("30/07/2024"), "cache hit must match cold parse");
    });
});

describe("same-date rows break the tie deterministically", () => {
    const row = (date: string, original: any = {}) => ({
        getValue: () => date,
        original,
    });
    const order = (rows: any[]) =>
        [...rows].sort((a, b) => dateSortingFn(a, b, "d")).map((r) => r.original.projectPrefix ?? r.original.createdAt);

    test("project number orders rows sharing one date", () => {
        // The reported bug: three projects received on the same day rendered with
        // their numbers shuffled, because the comparator returned 0 for all pairs.
        const rows = [
            row("04/09/2026", { projectPrefix: "WT/PROJECT/26-27/738" }),
            row("04/09/2026", { projectPrefix: "WT/PROJECT/26-27/736" }),
            row("04/09/2026", { projectPrefix: "WT/PROJECT/26-27/737" }),
        ];
        assert.deepEqual(order(rows), [
            "WT/PROJECT/26-27/736",
            "WT/PROJECT/26-27/737",
            "WT/PROJECT/26-27/738",
        ]);
    });

    test("date still outranks the number", () => {
        const rows = [
            row("05/09/2026", { projectPrefix: "WT/PROJECT/26-27/1" }),
            row("04/09/2026", { projectPrefix: "WT/PROJECT/26-27/999" }),
        ];
        assert.deepEqual(order(rows), ["WT/PROJECT/26-27/999", "WT/PROJECT/26-27/1"]);
    });

    test("year junk is not a project number", () => {
        // "WT/PROJECT/Lead/2017" parses to 2017 naively, which would beat every real
        // number. Backend `parseNum` discards 1990-2099 for the same reason.
        const rows = [
            row("04/09/2026", { projectPrefix: "WT/PROJECT/Lead/2017", createdAt: "2026-09-04T09:00:00Z" }),
            row("04/09/2026", { projectPrefix: "WT/PROJECT/26-27/500", createdAt: "2026-09-04T08:00:00Z" }),
        ];
        assert.deepEqual(order(rows), ["WT/PROJECT/Lead/2017", "WT/PROJECT/26-27/500"],
            "junk scores 0 and sorts first; it never outranks a real number");
    });

    test("rows with no project number fall through to createdAt", () => {
        const rows = [
            row("04/09/2026", { createdAt: "2026-08-30T10:00:00Z" }),
            row("04/09/2026", { createdAt: "2026-08-12T10:00:00Z" }),
        ];
        assert.deepEqual(order(rows), ["2026-08-12T10:00:00Z", "2026-08-30T10:00:00Z"]);
    });

    test("a real receipt time orders same-day rows on its own", () => {
        // What storing the instant (not the day) buys: no prefix, no createdAt needed.
        const rows = [
            { getValue: () => "2026-09-04T11:33:00.000Z", original: { createdAt: "" } },
            { getValue: () => "2026-09-04T06:03:00.000Z", original: { createdAt: "" } },
        ];
        const sorted = [...rows].sort((a, b) => dateSortingFn(a, b, "d")).map((r) => r.getValue());
        assert.deepEqual(sorted, ["2026-09-04T06:03:00.000Z", "2026-09-04T11:33:00.000Z"]);
    });

    test("rows carrying no original at all must not throw", () => {
        assert.equal(dateSortingFn({ getValue: () => "04/09/2026" }, { getValue: () => "04/09/2026" }, "d"), 0);
    });
});

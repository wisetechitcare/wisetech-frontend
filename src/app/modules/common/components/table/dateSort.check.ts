/**
 * Self-check for the date comparator. No test runner is installed, so bundle it
 * and pipe it into node:
 *
 *   pnpm exec esbuild src/app/modules/common/components/table/dateSort.check.ts \
 *     --bundle --platform=node --format=cjs | node
 *
 * esbuild is a declared devDependency for exactly this reason. It ships inside
 * Vite anyway, but pnpm's strict node_modules does not expose a transitive
 * dependency's binary — so relying on the hoisted copy (as `npx esbuild` did
 * under npm) silently stops working.
 *
 * Exits non-zero on failure. Fold it into CI when a real runner lands.
 */

import assert from "node:assert/strict";
import { toSortableTime, dateSortingFn } from "./dateSort";

const t = (v: unknown) => toSortableTime(v);

// A display date parses to LOCAL midnight — "30/07/2024" means the 30th in the
// viewer's zone, not 18:30Z the day before. Compare local calendar parts, or
// this check fails everywhere east of Greenwich (IST is +5:30).
const iso = (v: unknown) => {
  const ms = t(v);
  if (!ms) return "0";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ─── Day-first display formats parse to the right calendar day ────────────────
assert.equal(iso("30/07/2024"), "2024-07-30", "DD/MM/YYYY");
assert.equal(iso("01-04-2026"), "2026-04-01", "DD-MM-YYYY, day-first not month-first");
assert.equal(iso("2025.12.03"), "2025-12-03", "company display standard YYYY.MM.DD");
assert.equal(iso("04 Aug 2026"), "2026-08-04", "DD MMM YYYY");
assert.equal(iso("30-Jul-2024"), "2024-07-30", "DD-MMM-YYYY");
assert.equal(iso("04 Aug 2026, 09:15 AM"), "2026-08-04", "DD MMM YYYY, hh:mm A");

// ─── Raw wire / native values still work ──────────────────────────────────────
// Midday UTC so the local calendar day is stable from UTC-11 to UTC+11.
assert.equal(iso("2024-07-30"), "2024-07-30", "ISO date");
assert.equal(iso("2024-07-30T12:00:00.000Z"), "2024-07-30", "ISO datetime");
assert.equal(iso(new Date("2024-07-30T12:00:00Z")), "2024-07-30", "Date object");

// ─── Blanks sort as oldest, never NaN (NaN would corrupt the whole sort) ──────
for (const blank of [null, undefined, "", "  ", "-", "—", "N/A", "n/a", "garbage"]) {
  assert.equal(t(blank), 0, `blank/unparseable → 0, got ${t(blank)} for ${String(blank)}`);
  assert.ok(!Number.isNaN(t(blank)), "must never return NaN");
}

// ─── The regression this was written for ──────────────────────────────────────
// Alphanumeric sorting orders by day-of-month: 30/07/2024 before 01/04/2026.
// Chronological sorting must not.
assert.ok(t("30/07/2024") < t("01/04/2026"), "2024 must sort before 2026");
assert.ok(t("25/07/2022") < t("08/01/2026"), "day-of-month must not dominate");
// "DD MMM YYYY" must not order months alphabetically (Apr < Aug < Dec).
assert.ok(t("01 Apr 2026") < t("04 Aug 2026"), "Apr before Aug");
assert.ok(t("04 Aug 2026") < t("01 Dec 2026"), "Aug before Dec — not alphabetical");

// ─── Comparator wiring, ascending order end to end ────────────────────────────
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

// ─── Cache returns identical results on repeat lookups ────────────────────────
assert.equal(t("30/07/2024"), t("30/07/2024"), "cache hit must match cold parse");

console.log("dateSort self-check: all assertions passed");

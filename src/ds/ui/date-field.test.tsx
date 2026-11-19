// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { parseDate } from "@internationalized/date";
import { KitProvider } from "@/ds/provider";
import { DatePicker } from "./date-picker";
import { DateField, TimeField } from "./date-field";
import { parseDateTime, parseTime } from "@internationalized/date";

afterEach(cleanup);

// The company standard is YYYY.MM.DD (src/utils/dateFormats.ts), whatever the kit locale says.
const text = (name: RegExp) => screen.getByRole("group", { name }).textContent!.replace(/[⁦-⁩‎‏]/g, "");

describe.each(["en-IN", "en-GB"])("date fields read year.month.day under the %s kit locale", (locale) => {
  it("DateField", () => {
    render(<KitProvider locale={locale}><DateField label="Joined" value={parseDate("2026-11-13")} /></KitProvider>);
    expect(text(/joined/i)).toBe("2026.11.13");
  });

  it("DatePicker, and its placeholder when empty", () => {
    render(<KitProvider locale={locale}><DatePicker label="Paid on" value={parseDate("2026-11-13")} /><DatePicker label="Empty" value={null} /></KitProvider>);
    expect(text(/paid on/i)).toContain("2026.11.13");
    expect(text(/empty/i)).toContain("yyyy.mm.dd");
  });
});

it("dots only the date part of a date-time field; the time keeps its colon", () => {
  render(<KitProvider><DateField label="Logged" granularity="minute" hourCycle={24} value={parseDateTime("2026-11-13T14:30")} /></KitProvider>);
  const t = text(/logged/i);
  expect(t).toMatch(/^2026\.11\.13\D+14:30$/);
});

it("leaves time fields alone (colon, not dot)", () => {
  render(<KitProvider><TimeField label="Starts" hourCycle={24} value={parseTime("14:30")} /></KitProvider>);
  expect(text(/starts/i)).toContain("14:30");
});

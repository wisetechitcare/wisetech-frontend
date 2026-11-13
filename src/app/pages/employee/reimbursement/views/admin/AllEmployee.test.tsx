// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { MemoryRouter } from "react-router-dom";

const fetchMonthly = vi.fn();
vi.mock("@utils/statistics", () => ({
  fetchMonthlyReimbursementsOfAllEmp: (...a: unknown[]) => fetchMonthly(...a),
  fetchYearlyReimbursementsOfAllEmp: vi.fn().mockResolvedValue([]),
  fetchAllTimeReimbursementsOfAllEmp: vi.fn().mockResolvedValue([]),
}));
vi.mock("@services/employee", () => ({ fetchAllEmployees: vi.fn().mockResolvedValue({ data: { employees: [] } }) }));
vi.mock("@utils/file", () => ({
  generateFiscalYearFromGivenYear: () => Promise.resolve({ startDate: "2026-04-01", endDate: "2027-03-31" }),
}));
vi.mock("@hooks/useEventBus", () => ({ useEventBus: () => {} }));
vi.mock("../../components/ReimbursementCharts", () => ({ default: () => null }));
vi.mock("./ByProject", () => ({ default: () => null }));
vi.mock("./ReimbursementSummaryCard", () => ({ default: () => null }));

import AllEmployee from "./AllEmployee";
import { findBareElements } from "../../test-utils/rebootShield";

afterEach(cleanup);

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
      }),
    });
  }
});

describe("AllEmployee period navigation", () => {
  it("steps the month from the kit arrows and refetches for that month", async () => {
    fetchMonthly.mockResolvedValue([]);
    const { container } = render(<MemoryRouter><AllEmployee /></MemoryRouter>);
    const now = dayjs();
    await waitFor(() => expect(fetchMonthly).toHaveBeenCalled());
    expect(screen.getByText(now.format("MMM YYYY"))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await waitFor(() => expect(screen.getByText(now.subtract(1, "month").format("MMM YYYY"))).toBeTruthy());
    const lastArg = fetchMonthly.mock.calls.at(-1)![0];
    expect(dayjs(lastArg).format("YYYY-MM")).toBe(now.subtract(1, "month").format("YYYY-MM"));

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    await waitFor(() => expect(screen.getByText(now.add(1, "month").format("MMM YYYY"))).toBeTruthy());

    expect(findBareElements(container)).toEqual([]);
  });
});

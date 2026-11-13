// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

vi.mock("@services/employee", () => ({
  fetchReimbursementBatches: vi.fn().mockResolvedValue({ data: { batches: [] } }),
  fetchReimbursementOrgPayments: vi.fn().mockResolvedValue([]),
  fetchAllEmployees: vi.fn().mockResolvedValue({ data: { employees: [] } }),
  createReimbursementPayment: vi.fn(),
}));
vi.mock("@utils/file", () => ({
  generateFiscalYearFromGivenYear: (d: dayjs.Dayjs) => {
    // Fiscal year April-March: before April belongs to the previous year's fiscal.
    const y = d.month() < 3 ? d.year() - 1 : d.year();
    return Promise.resolve({ startDate: `${y}-04-01`, endDate: `${y + 1}-03-31` });
  },
}));
vi.mock("@utils/can", () => ({ canSection: () => true }));
vi.mock("@hooks/useEventBus", () => ({ useEventBus: () => {} }));
vi.mock("../../shared/ReimbursementBatchShared", () => ({ BatchDetailModal: () => null }));
vi.mock("../../components/payment/PaymentDetailDrawer", () => ({ default: () => null }));
vi.mock("../../components/payment/RecordPaymentModal", () => ({ default: () => null }));

import PaymentTab from "./PaymentTab";
import { formatFiscalYearLabel } from "@utils/fiscalYearHelper";
import { findBareElements } from "../../test-utils/rebootShield";

afterEach(() => { cleanup(); localStorage.clear(); });

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

const fiscalLabelFor = (d: dayjs.Dayjs) => {
  const y = d.month() < 3 ? d.year() - 1 : d.year();
  return formatFiscalYearLabel(`${y}-04-01 to ${y + 1}-03-31`);
};

describe("PaymentTab period navigation", () => {
  it("steps by month in monthly mode and by fiscal year in yearly mode", async () => {
    const { container } = render(<Provider store={configureStore({ reducer: () => ({}) })}><PaymentTab /></Provider>);
    const now = dayjs();

    expect(screen.getByText(now.format("MMM YYYY"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await waitFor(() => expect(screen.getByText(now.subtract(1, "month").format("MMM YYYY"))).toBeTruthy());

    fireEvent.click(screen.getByRole("tab", { name: "Yearly" }));
    expect(await screen.findByRole("button", { name: "Previous year" })).toBeTruthy();
    const anchor = now.subtract(1, "month");
    await waitFor(() => expect(screen.getByText(fiscalLabelFor(anchor))).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
    await waitFor(() => expect(screen.getByText(fiscalLabelFor(anchor.subtract(1, "year")))).toBeTruthy());

    expect(findBareElements(container)).toEqual([]);
  });
});

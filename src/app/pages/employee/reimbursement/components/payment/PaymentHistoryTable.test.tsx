// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SensitiveProvider, SensitiveToggle } from "@/ds/patterns/sensitive";
import PaymentHistoryTable from "./PaymentHistoryTable";
import type { PaymentBatchRow, PaymentRecord } from "./paymentData";

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

/** Reboot (unlayered Metronic CSS) beats the kit's layered utilities on any raw element that lacks a data-slot. */
function bare(root: ParentNode) {
  return Array.from(root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,label,ul,ol,li,button,a"))
    .filter((el) => !el.hasAttribute("data-slot") && !el.closest("[data-slot]"))
    .map((el) => el.outerHTML.slice(0, 80));
}

const pay = (over: Partial<PaymentRecord>): PaymentRecord => ({
  id: "p1", paymentDate: "2026-11-05", amountPaid: 1000, paymentMethod: "BANK_TRANSFER", transactionId: "UTR1",
  remarks: null, status: "PAID", processedBy: "Fin Ops", batchId: "b1", submissionId: "B-1", employeeId: "e1",
  employeeName: "Asha Rao", employeeCode: "E001", ...over,
});

const payments = [
  pay({ id: "p1", paymentDate: "2026-11-05", amountPaid: 1000, employeeName: "Asha Rao", submissionId: "B-1" }),
  pay({ id: "p2", paymentDate: "2026-11-02", amountPaid: 2500, employeeName: "Zed Khan", submissionId: "B-2", batchId: "b2", transactionId: "", status: "PARTIAL" }),
];
const batchById = new Map<string, PaymentBatchRow>([["b1", { id: "b1" } as PaymentBatchRow]]);

function setup(props: Partial<Parameters<typeof PaymentHistoryTable>[0]> = {}) {
  const onView = vi.fn();
  const utils = render(
    <SensitiveProvider>
      <SensitiveToggle />
      <PaymentHistoryTable
        payments={payments}
        batchById={batchById}
        loading={false}
        periodLabel="Nov 2026"
        filtered={false}
        onClearFilters={() => {}}
        onView={onView}
        {...props}
      />
    </SensitiveProvider>,
  );
  return { ...utils, onView };
}

const names = () => screen.getAllByText(/Asha Rao|Zed Khan/).map((e) => e.textContent);

describe("PaymentHistoryTable (kit DataTable)", () => {
  it("offers an export", () => {
    setup();
    expect(screen.getByRole("button", { name: /export/i })).toBeTruthy();
  });

  it("sorts a column from its header", () => {
    setup();
    const table = screen.getByRole("table");
    const firstRowName = () => within(table).getAllByRole("row")[1].textContent ?? "";
    fireEvent.click(within(table).getByRole("button", { name: /^Payment Date/ }));
    const asc = firstRowName();
    fireEvent.click(within(table).getByRole("button", { name: /^Payment Date/ }));
    const desc = firstRowName();
    expect(asc).not.toBe(desc);
    expect(asc).toContain("Zed Khan"); // 2 Nov before 5 Nov ascending
    expect(desc).toContain("Asha Rao");
    expect(names().length).toBeGreaterThan(0);
  });

  it("hides amounts and the footer total until the eye is pressed", () => {
    setup();
    const table = within(screen.getByRole("table"));
    expect(table.getAllByText("Hidden").length).toBe(3); // two rows + footer total
    fireEvent.click(screen.getByRole("button", { name: "Show amounts" }));
    expect(table.getAllByText(/3,500/).length).toBe(1);
    expect(table.queryByText("Hidden")).toBeNull();
  });

  it("renders a card per payment for phones and keeps the amount behind the eye", () => {
    setup();
    const cards = screen.getAllByRole("listitem");
    expect(cards.length).toBe(2);
    expect(within(cards[0]).getByText("Hidden")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show amounts" }));
    expect(within(screen.getAllByRole("listitem")[0]).getByText(/1,000/)).toBeTruthy();
  });

  it("keeps the row action: View only where the batch is known", () => {
    const { onView } = setup();
    const views = within(screen.getByRole("table")).getAllByRole("button", { name: "View" });
    expect(views.length).toBe(1);
    fireEvent.click(views[0]);
    expect(onView).toHaveBeenCalledWith(batchById.get("b1"));
  });

  it("keeps the empty states", () => {
    setup({ payments: [] });
    expect(screen.getByText(/no payment history/i)).toBeTruthy();
    cleanup();
    setup({ payments: [], filtered: true });
    expect(screen.getByText(/no payments found/i)).toBeTruthy();
  });

  it("leaves no bare element for Reboot to restyle", () => {
    const { container } = setup();
    expect(bare(container)).toEqual([]);
  });
});

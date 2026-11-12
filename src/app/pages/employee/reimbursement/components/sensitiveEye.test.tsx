// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SensitiveProvider, SensitiveToggle } from "@/ds/patterns/sensitive";
import { TooltipProvider } from "@/ds/ui/tooltip";
import { DataTable } from "@/ds/patterns/data-table";
import SubmissionMobileCard from "./SubmissionMobileCard";
import { buildReimbursementLineColumns } from "./reimbursementLineColumns";

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

const lines = [{ id: "l1", amount: 1234.5, expenseDate: "2026-11-02", reimbursementType: { type: "Travel" } }];
const submission = { id: "s1", _submissionId: "B-1", _status: 1, _totalAmount: 9876.5, _totalRequests: 2 };

function Screen() {
  const columns = buildReimbursementLineColumns(
    { resolveClientType: () => "" },
    { total: 1234.5 },
  );
  return (
    <TooltipProvider>
      <SensitiveProvider>
        <SensitiveToggle variant="onPrimary" />
        <div data-testid="table">
          <DataTable caption="Lines" columns={columns} data={lines} getRowId={(r: any) => r.id} />
        </div>
        <div data-testid="card"><SubmissionMobileCard row={submission} /></div>
      </SensitiveProvider>
    </TooltipProvider>
  );
}

/**
 * ONE eye must hide the same kind of figure everywhere: in a table cell (and its footer total) and in a
 * phone card. Hidden figures are swapped for an sr-only "Hidden" for assistive tech as well.
 */
describe("the eye hides amounts in every reimbursement surface", () => {
  it("hides the table cell, its footer and the mobile card together, and reveals them together", () => {
    render(<Screen />);
    const table = within(screen.getByTestId("table"));
    const card = within(screen.getByTestId("card"));

    // Amounts start hidden (provider default).
    expect(table.getAllByText("Hidden").length).toBe(2); // cell + footer total
    expect(card.getAllByText("Hidden").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: "Show amounts" }));

    expect(table.queryAllByText("Hidden").length).toBe(0);
    expect(card.queryAllByText("Hidden").length).toBe(0);
    expect(card.getByText(/9,876\.50/)).toBeTruthy();
  });
});

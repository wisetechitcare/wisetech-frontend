// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";

vi.mock("@utils/file", () => ({
  generateFiscalYearFromGivenYear: () => Promise.resolve({ startDate: "2026-04-01", endDate: "2027-03-31" }),
}));
vi.mock("@services/inbox", () => ({ fetchInboxTasks: vi.fn() }));
vi.mock("@hooks/useEventBus", () => ({ useEventBus: () => {} }));
vi.mock("./QueryConversation", () => ({ default: ({ onEditRequest }: { onEditRequest?: () => void }) => <div>conversation-dialog<button onClick={onEditRequest}>edit-request</button></div> }));
vi.mock("./VersionHistoryDialog", () => ({ default: ({ requestLabel }: { requestLabel: string }) => <div>versions-{requestLabel}</div> }));
vi.mock("./ReimbursementEditModal", () => ({ default: () => null }));
vi.mock("../shared/ReimbursementBatchShared", () => ({ BatchDetailModal: ({ batchId }: { batchId: string }) => <div>batch-{batchId}</div> }));
vi.mock("@services/reimbursementVersions", () => ({ fetchReimbursementById: vi.fn() }));

import { fetchInboxTasks } from "@services/inbox";
import { fetchReimbursementById } from "@services/reimbursementVersions";
import ReimbursementPeriodBar from "./ReimbursementPeriodBar";
import NeedsYourAttention from "./NeedsYourAttention";
import EditBanner from "./EditBanner";
import RecordsEmptyState from "./RecordsEmptyState";
import DocumentPreviewModal from "./DocumentPreviewModal";

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

describe("ReimbursementPeriodBar", () => {
  const date = dayjs("2026-11-12");

  it("steps the month back and forward from the arrows", () => {
    const onChange = vi.fn();
    render(<ReimbursementPeriodBar alignment="monthly" date={date} onChange={onChange} />);
    expect(screen.getByText("Nov 2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(onChange).toHaveBeenLastCalledWith("monthly", date.subtract(1, "month"));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onChange).toHaveBeenLastCalledWith("monthly", date.add(1, "month"));
  });

  it("steps the year from the arrows on the yearly tab", () => {
    const onChange = vi.fn();
    render(<ReimbursementPeriodBar alignment="yearly" date={date} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next year" }));
    expect(onChange).toHaveBeenLastCalledWith("yearly", date.add(1, "year"));
    fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
    expect(onChange).toHaveBeenLastCalledWith("yearly", date.subtract(1, "year"));
  });

  it("hides the navigator on All Time, keeps the action slot, and switches tabs", () => {
    const onChange = vi.fn();
    render(<ReimbursementPeriodBar alignment="allTime" date={date} onChange={onChange} actionSlot={<span>slot</span>} />);
    expect(screen.queryByRole("button", { name: /Previous/ })).toBeNull();
    expect(screen.getByText("slot")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Monthly" }));
    expect(onChange).toHaveBeenCalledWith("monthly", date);
  });

  it("picks a month in the popover and emits the start of that month", async () => {
    const onChange = vi.fn();
    render(<ReimbursementPeriodBar alignment="monthly" date={date} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Nov 2026, choose a month/ }));
    await userEvent.click(await screen.findByRole("button", { name: /March/ }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const [alignment, picked] = onChange.mock.calls[0];
    expect(alignment).toBe("monthly");
    expect(picked.format("YYYY-MM-DD")).toBe("2026-03-01");
  });

  it("makes the label a jump picker", () => {
    render(<ReimbursementPeriodBar alignment="monthly" date={date} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Nov 2026, choose a month/ })).toBeTruthy();
  });
});

describe("NeedsYourAttention", () => {
  const task = (over: Record<string, unknown>) => ({
    id: "t1", type: "QUERY_RECEIVED", entityType: "Reimbursement", status: "OPEN", title: "Query on lunch",
    message: "Please attach the bill", createdAt: "2026-11-10T10:00:00Z", batchId: null,
    payload: { queryId: "q1", reimbursementId: "r1", level: 2 }, ...over,
  });

  it("renders nothing when it is not the viewer's own screen", () => {
    const { container } = render(<NeedsYourAttention employeeId="e1" isSelf={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when there is no open task", async () => {
    vi.mocked(fetchInboxTasks).mockResolvedValue([task({ status: "DONE" })] as never);
    const { container } = render(<NeedsYourAttention employeeId="e1" isSelf />);
    await waitFor(() => expect(fetchInboxTasks).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("lists open work with its count, level and message, and wires Respond and History", async () => {
    vi.mocked(fetchInboxTasks).mockResolvedValue([
      task({}),
      task({ id: "t2", entityType: "Other" }), // not a reimbursement row: filtered out
    ] as never);
    render(<NeedsYourAttention employeeId="e1" isSelf />);
    await screen.findByText("Needs your attention");
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("asked at level 2")).toBeTruthy();
    expect(screen.getByText("Please attach the bill")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText("versions-Query on lunch")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Respond" }));
    expect(screen.getByText("conversation-dialog")).toBeTruthy();
  });

  it("disables Respond while the reimbursement it opens is loading", async () => {
    vi.mocked(fetchInboxTasks).mockResolvedValue([task({})] as never);
    vi.mocked(fetchReimbursementById).mockReturnValue(new Promise(() => {}) as never);
    render(<NeedsYourAttention employeeId="e1" isSelf />);
    fireEvent.click(await screen.findByRole("button", { name: "Respond" }));
    fireEvent.click(screen.getByRole("button", { name: "edit-request" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Respond" }) as HTMLButtonElement).disabled).toBe(true));
  });

  it("opens the batch for a task that has no query payload", async () => {
    vi.mocked(fetchInboxTasks).mockResolvedValue([
      task({ type: "ACTION_REQUIRED", payload: {}, batchId: "b9" }),
    ] as never);
    render(<NeedsYourAttention employeeId="e1" isSelf />);
    fireEvent.click(await screen.findByRole("button", { name: "Open" }));
    expect(screen.getByText("batch-b9")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "History" })).toBeNull();
  });
});

describe("EditBanner", () => {
  it("shows the rejection reason and the helper text", () => {
    render(<EditBanner context="rejection" rejectionReason="Bill unclear" />);
    expect(screen.getByText("Editing After Rejection")).toBeTruthy();
    expect(screen.getByText("Rejected")).toBeTruthy();
    expect(screen.getByText("Rejection Reason")).toBeTruthy();
    expect(screen.getByText('"Bill unclear"')).toBeTruthy();
    expect(screen.getByText(/Make the necessary corrections/)).toBeTruthy();
  });

  it("shows the approver query with its level, and no reason box on a plain edit", () => {
    const { rerender } = render(<EditBanner context="query" queryText="Which trip?" level={2} />);
    expect(screen.getByText(/Approver Query \(Level 2\)/)).toBeTruthy();
    rerender(<EditBanner context="edit" />);
    expect(screen.getByText("Editing Reimbursement")).toBeTruthy();
    expect(screen.queryByText(/Approver Query/)).toBeNull();
  });
});

describe("RecordsEmptyState", () => {
  it("points at neighbouring months that have records", () => {
    const onGo = vi.fn();
    const june = dayjs("2026-06-01");
    render(<RecordsEmptyState periodLabel="Jul 2026" elsewhere={[{ date: june, count: 3 }]} onGoToPeriod={onGo} onAddExpense={() => {}} />);
    expect(screen.getByText("No expenses in Jul 2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "3 in June 2026" }));
    expect(onGo).toHaveBeenCalledWith(june);
    expect(screen.getByRole("button", { name: /Add An Expense/i })).toBeTruthy();
  });

  it("offers to clear a status filter instead of adding an expense", () => {
    const onClear = vi.fn();
    render(<RecordsEmptyState periodLabel="Jul 2026" activeStatusFilter="Pending" onClearStatusFilter={onClear} onAddExpense={() => {}} />);
    expect(screen.getByText("No pending expenses in Jul 2026")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Add An Expense/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show All Statuses/i }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe("DocumentPreviewModal", () => {
  it("closes on Escape, the X and the backdrop, but not on a click inside", () => {
    const onClose = vi.fn();
    render(<DocumentPreviewModal url="https://x.test/a/receipt.png?sig=1" onClose={onClose} />);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("img"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close preview (Esc)" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("opens in a new tab unless in-page only, and restores scroll on unmount", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { unmount } = render(<DocumentPreviewModal url="https://x.test/doc.pdf" onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Open In Tab/i }));
    expect(open).toHaveBeenCalledWith("https://x.test/doc.pdf", "_blank", "noopener,noreferrer");
    unmount();
    expect(document.body.style.overflow).toBe("");
    render(<DocumentPreviewModal url="https://x.test/doc.pdf" onClose={() => {}} inPageOnly />);
    expect(screen.queryByRole("button", { name: /Open In Tab/i })).toBeNull();
  });
});

describe("Reboot shield", () => {
  // Bootstrap Reboot is unlayered and beats Tailwind utilities on bare h4/p; src/main.css reverts it only for
  // elements carrying data-slot. jsdom has no cascade, so assert the attribute itself.
  const bare = (root: ParentNode) =>
    [...root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,label,ul,ol,li,button,a")].filter(
      (el) => !el.hasAttribute("data-slot") && !el.closest("[data-slot=button]"),
    );

  it("every raw heading, paragraph, link and button carries data-slot", async () => {
    vi.mocked(fetchInboxTasks).mockResolvedValue([
      { id: "t1", type: "QUERY_RECEIVED", entityType: "Reimbursement", status: "OPEN", title: "Q", message: "m", createdAt: "2026-11-10T10:00:00Z", batchId: null, payload: { queryId: "q", reimbursementId: "r" } },
    ] as never);
    const a = render(<NeedsYourAttention employeeId="e1" isSelf />);
    await screen.findByText("Needs your attention");
    expect(bare(a.container).map((e) => e.outerHTML)).toEqual([]);
    a.unmount();
    const b = render(<EditBanner context="query" queryText="x" level={1} />);
    expect(bare(b.container)).toEqual([]);
    b.unmount();
    const c = render(<RecordsEmptyState periodLabel="p" elsewhere={[{ date: dayjs("2026-06-01"), count: 1 }]} />);
    expect(bare(c.container)).toEqual([]);
    c.unmount();
    render(<DocumentPreviewModal url="https://x.test/d.docx" onClose={() => {}} />);
    expect(bare(document.body)).toEqual([]);
  });
});

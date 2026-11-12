// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@services/reimbursementVersions", () => ({
  fetchVersionHistory: vi.fn(),
  VERSION_REASON_LABEL: { EDIT: "Edited by employee", RESUBMIT: "Resubmitted" },
}));

import { fetchVersionHistory } from "@services/reimbursementVersions";
import VersionHistoryDialog, { ChangeSummaryTable, RestartNotice } from "./VersionHistoryDialog";

afterEach(cleanup);

const bare = (root: ParentNode) =>
  [...root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,label,ul,ol,li,button,a")].filter(
    (el) => !el.hasAttribute("data-slot") && !el.closest("[data-slot=button]"),
  );

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

const v1 = {
  id: "v1", reimbursementId: "r1", versionNumber: 1, amount: "100", reason: null, isCurrent: false,
  createdAt: "2026-11-01T10:00:00Z", supersededAt: "2026-11-05T10:00:00Z", changeSummary: null,
  approval: { status: "cancelled", currentLevel: 1, steps: [{ level: 1, approverName: "Asha", status: "approved", actedAt: "2026-11-02T10:00:00Z", comments: "Looks fine" }] },
  queries: [],
};
const v2 = {
  id: "v2", reimbursementId: "r1", versionNumber: 2, amount: "250.5", reason: "EDIT", isCurrent: true,
  createdAt: "2026-11-05T10:00:00Z", supersededAt: null,
  changeSummary: [{ field: "amount", label: "Amount", previous: "100", next: "250.5" }],
  approval: { status: "pending", currentLevel: 1, steps: [{ level: 1, approverName: null, status: "pending", actedAt: null, comments: null }] },
  queries: [{ id: "q1", category: "Receipt", status: "OPEN", level: 1, messages: [{ id: "m1", authorRole: "APPROVER", body: "Attach the bill", createdAt: "2026-11-06T10:00:00Z" }] }],
};

describe("VersionHistoryDialog", () => {
  it("renders nothing while there is no reimbursement id", () => {
    render(<VersionHistoryDialog reimbursementId={null} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("loads the history and shows each version with its changes, approvals and questions", async () => {
    vi.mocked(fetchVersionHistory).mockResolvedValue([v2, v1] as never);
    render(<VersionHistoryDialog reimbursementId="r1" requestLabel="Cab to client" onClose={() => {}} />);
    expect(await screen.findByText("2 versions. Newest first.")).toBeTruthy();
    expect(fetchVersionHistory).toHaveBeenCalledWith("r1");
    expect(screen.getByText("Cab to client")).toBeTruthy();
    expect(screen.getByText("Version 2")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
    expect(screen.getByText("What changed from version 1")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Amount" })).toBeTruthy();
    expect(screen.getByText(/Approval restarted from Level 1/)).toBeTruthy();
    expect(screen.getByText("L1 approved")).toBeTruthy();
    expect(screen.getByText("“Looks fine”")).toBeTruthy();
    expect(screen.getByText("Attach the bill")).toBeTruthy();
    expect(screen.getByText("The claim as originally submitted.")).toBeTruthy();
    expect(screen.getAllByText(/superseded/i)).toHaveLength(2);
  });

  it("says so when there is no history, and when the claim was never edited", async () => {
    vi.mocked(fetchVersionHistory).mockResolvedValueOnce([]);
    const a = render(<VersionHistoryDialog reimbursementId="r1" onClose={() => {}} />);
    expect(await screen.findByText("No version history for this expense.")).toBeTruthy();
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
    a.unmount();
    vi.mocked(fetchVersionHistory).mockResolvedValueOnce([{ ...v1, isCurrent: true }] as never);
    render(<VersionHistoryDialog reimbursementId="r1" onClose={() => {}} />);
    expect(await screen.findByText("This expense has not been edited since it was submitted.")).toBeTruthy();
  });

  it("falls back to the empty state when the request fails", async () => {
    vi.mocked(fetchVersionHistory).mockRejectedValueOnce(new Error("boom"));
    render(<VersionHistoryDialog reimbursementId="r1" onClose={() => {}} />);
    expect(await screen.findByText("No version history for this expense.")).toBeTruthy();
  });

  it("closes from the Close button and from Escape", async () => {
    vi.mocked(fetchVersionHistory).mockResolvedValue([v1] as never);
    const onClose = vi.fn();
    render(<VersionHistoryDialog reimbursementId="r1" onClose={onClose} />);
    await screen.findByText(/has not been edited/);
    fireEvent.click(screen.getAllByRole("button", { name: /^close$/i })[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(onClose.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});

describe("ChangeSummaryTable / RestartNotice", () => {
  it("renders nothing for no changes, and a dash for a missing side", () => {
    const empty = render(<ChangeSummaryTable changes={[]} />);
    expect(empty.container.innerHTML).toBe("");
    empty.unmount();
    render(<ChangeSummaryTable changes={[{ field: "note", label: "Note", previous: null, next: "hi" }]} />);
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("hi")).toBeTruthy();
  });

  it("names the version in the restart notice only when given one", () => {
    const a = render(<RestartNotice versionNumber={3} />);
    expect(a.container.textContent).toContain("(version 3)");
    a.unmount();
    const b = render(<RestartNotice />);
    expect(b.container.textContent).not.toContain("(version");
  });
});

describe("Reboot shield", () => {
  // Bootstrap Reboot is unlayered and beats Tailwind utilities on bare h1-h6/p/label/ul/ol/li/button/a; src/main.css
  // reverts it only for elements carrying data-slot. jsdom has no cascade, so assert the attribute itself.
  it("every raw heading, paragraph, list, link and button carries data-slot", async () => {
    vi.mocked(fetchVersionHistory).mockResolvedValue([v2, v1] as never);
    render(<VersionHistoryDialog reimbursementId="r1" requestLabel="x" onClose={() => {}} />);
    await screen.findByText("2 versions. Newest first.");
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
  });
});

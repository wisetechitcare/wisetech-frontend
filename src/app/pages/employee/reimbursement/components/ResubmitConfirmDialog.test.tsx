// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResubmitConfirmDialog from "./ResubmitConfirmDialog";

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

const restart = {
  willRestart: true,
  levelsAlreadyApproved: 2,
  currentLevel: 3,
  totalLevels: 4,
  changes: [{ field: "amount", label: "Amount", previous: "100", next: "200" }],
} as never;

const setup = (over: Record<string, unknown> = {}) => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(<ResubmitConfirmDialog open preview={restart} onCancel={onCancel} onConfirm={onConfirm} {...over} />);
  return { onCancel, onConfirm };
};

describe("ResubmitConfirmDialog", () => {
  it("renders nothing while closed", () => {
    render(<ResubmitConfirmDialog open={false} preview={restart} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the diff and what the restart costs, with the plural and the level it is at", () => {
    setup();
    expect(screen.getByText("Review what is changing before this goes back for approval")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Amount" })).toBeTruthy();
    expect(screen.getByText("Because reimbursement details were changed, approval will restart from Level 1.")).toBeTruthy();
    expect(screen.getByText(/2 approvals already given on the current version/)).toBeTruthy();
    expect(screen.getByText(/currently at level 3 of 4/)).toBeTruthy();
    expect(screen.getByText(/close this and reply in the conversation/)).toBeTruthy();
  });

  it("uses the singular for one approval and the no-approval wording for none", () => {
    cleanup();
    setup({ preview: { ...(restart as object), levelsAlreadyApproved: 1 } });
    expect(screen.getByText(/1 approval already given/)).toBeTruthy();
    cleanup();
    setup({ preview: { ...(restart as object), levelsAlreadyApproved: 0, currentLevel: undefined } });
    expect(screen.getByText(/review the updated details from the start of the chain\.$/)).toBeTruthy();
  });

  it("says nothing restarts when nothing material changed", () => {
    setup({ preview: { willRestart: false, changes: [], levelsAlreadyApproved: 0 } });
    expect(screen.getByText(/Nothing about the claim has changed/)).toBeTruthy();
    expect(screen.queryByText("What is changing")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("shows a spinner and blocks the confirm button while the preview loads", () => {
    const { onConfirm } = setup({ loading: true, preview: null });
    expect(screen.getByRole("status", { name: "Loading" })).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(confirm.disabled || confirm.getAttribute("aria-disabled") === "true").toBe(true);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms and cancels from the buttons, and cancels on Escape", async () => {
    const { onCancel, onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: /resubmit for approval/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(onCancel.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("disables both buttons and says Saving while submitting", () => {
    const { onCancel, onConfirm } = setup({ submitting: true });
    const saving = screen.getByRole("button", { name: /saving/i }) as HTMLButtonElement;
    const cancel = screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement;
    expect(saving.disabled || saving.getAttribute("aria-disabled") === "true").toBe(true);
    expect(cancel.disabled || cancel.getAttribute("aria-disabled") === "true").toBe(true);
    fireEvent.click(saving);
    fireEvent.click(cancel);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("Reboot shield", () => {
  const bare = (root: ParentNode) =>
    [...root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,label,ul,ol,li,button,a")].filter(
      (el) => !el.hasAttribute("data-slot") && !el.closest("[data-slot=button]"),
    );

  it("every raw heading, paragraph, list, link and button carries data-slot", () => {
    setup();
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
  });
});

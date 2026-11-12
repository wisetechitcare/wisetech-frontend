// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { KitProvider } from "@/ds/provider";
import { currencyPrefix } from "@utils/currency";
import { fmtAmount, formatMoney } from "../../utils/reimbursementFormat";
import RecordPaymentModal from "./RecordPaymentModal";
import type { PaymentBatchRow } from "./paymentData";

afterEach(cleanup);

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  // The kit Select's popup animates through Motion, which jsdom cannot do: give it inert stand-ins.
  (globalThis as { SVGGeometryElement?: unknown }).SVGGeometryElement ??= class {};
  Element.prototype.getAnimations ??= () => [];
  Element.prototype.animate ??= function animate() {
    const done = Promise.resolve();
    return { finished: done, ready: done, cancel() {}, finish() {}, pause() {}, play() {}, onfinish: null, addEventListener() {}, removeEventListener() {} } as unknown as Animation;
  };
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

const row = (over: Partial<PaymentBatchRow> = {}): PaymentBatchRow => ({
  id: "b1", submissionId: "WT-80-20261101-01", employeeId: "e1", employeeName: "Asha Rao", employeeCode: "WT-80",
  subOrganization: "", department: "", branch: "", team: "", isActive: true,
  totalRequests: 3, approvedAmount: 1000, paidAmount: 250, remainingAmount: 750,
  state: "PARTIAL", submittedAt: null, approvedAt: null, lastActivityAt: null, periodStart: null, periodEnd: null,
  lines: [], payments: [], approvedReimbursementIds: [], raw: {},
  ...over,
} as PaymentBatchRow);

const mount = (batches: PaymentBatchRow[], over: Record<string, unknown> = {}) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(
    <KitProvider>
      <RecordPaymentModal batches={batches} open onClose={onClose} onConfirm={onConfirm} {...over} />
    </KitProvider>,
  );
  return { onClose, onConfirm };
};

const submitButton = () => screen.getByRole("button", { name: /(confirm payment|record part payment|pay \d+ batches|recording)/i }) as HTMLButtonElement;
const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true";
const amountBox = () => screen.getByLabelText(/^amount to pay$/i) as HTMLInputElement;

describe("RecordPaymentModal: payload", () => {
  // The expected shapes below are the pre-task component's `onConfirm` argument for the same inputs
  // (HEAD:RecordPaymentModal.tsx handleConfirm): { paymentDate, paymentMethod, transactionId (trimmed),
  // remarks (trimmed), allocations: single ? [{ row, amount: Number(amountInput) }] : each batch's remainingAmount }.
  it("a single bank transfer, edited to a part payment, submits the same payload as before", async () => {
    const batch = row();
    const { onConfirm } = mount([batch]);
    expect(amountBox().value).toBe("750.00");

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Bank Transfer" }));
    await userEvent.type(screen.getByLabelText(/^utr [/] reference$/i), "  UTR123456789  ");
    await userEvent.type(screen.getByLabelText(/^remarks$/i), "  october claims  ");
    await userEvent.clear(amountBox());
    await userEvent.type(amountBox(), "400.5");

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`record part payment`, "i") }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toStrictEqual({
      paymentDate: dayjs().format("YYYY-MM-DD"),
      paymentMethod: "BANK_TRANSFER",
      transactionId: "UTR123456789",
      remarks: "october claims",
      allocations: [{ row: batch, amount: 400.5 }],
    });
    expect(onConfirm.mock.calls[0][0].allocations[0].row).toBe(batch);
  });

  it("the untouched defaults pay the full remaining balance in cash", async () => {
    const batch = row();
    const { onConfirm } = mount([batch]);
    fireEvent.click(submitButton());
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][0]).toStrictEqual({
      paymentDate: dayjs().format("YYYY-MM-DD"),
      paymentMethod: "CASH",
      transactionId: "",
      remarks: "",
      allocations: [{ row: batch, amount: 750 }],
    });
  });

  it("a run settles every batch in full, whatever the (hidden) amount", async () => {
    const a = row({ id: "a", remainingAmount: 100.25 });
    const b = row({ id: "b", submissionId: "WT-81", employeeName: "Ravi", remainingAmount: 50 });
    const { onConfirm } = mount([a, b]);
    expect(screen.queryByLabelText(/^amount to pay$/i)).toBeNull();
    await userEvent.type(screen.getByLabelText(/^reference$/i), "RUN-1");
    fireEvent.click(submitButton());
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][0]).toStrictEqual({
      paymentDate: dayjs().format("YYYY-MM-DD"),
      paymentMethod: "CASH",
      transactionId: "RUN-1",
      remarks: "",
      allocations: [{ row: a, amount: 100.25 }, { row: b, amount: 50 }],
    });
  });
});

describe("RecordPaymentModal: summary and wording", () => {
  it("shows the single batch figures in the configured currency, and what is already paid", () => {
    mount([row()]);
    expect(screen.getByText(/^confirm payment$/i, { selector: "[data-slot=dialog-title]" })).toBeTruthy();
    expect(screen.getByText("Review the amount before it is recorded")).toBeTruthy();
    expect(screen.getByText("Asha Rao · WT-80")).toBeTruthy();
    expect(screen.getByText(formatMoney(1000))).toBeTruthy();
    expect(screen.getByText(formatMoney(250))).toBeTruthy();
    expect(screen.getByText(`Maximum payable ${currencyPrefix()}${fmtAmount(750)}`)).toBeTruthy();
    expect(submitButton().textContent).toContain(formatMoney(750));
  });

  it("omits Already paid when nothing was paid", () => {
    mount([row({ paidAmount: 0 })]);
    expect(screen.queryByText("Already paid")).toBeNull();
  });

  it("describes a run, lists the batches and totals them", () => {
    const a = row({ id: "a", remainingAmount: 100 });
    const b = row({ id: "b", submissionId: "WT-81", employeeName: "Ravi", remainingAmount: 50 });
    mount([a, b]);
    expect(screen.getByText(/^confirm payment run$/i, { selector: "[data-slot=dialog-title]" })).toBeTruthy();
    expect(screen.getByText("2 batches, settled in full")).toBeTruthy();
    expect(screen.getByText("Ravi · WT-81")).toBeTruthy();
    expect(screen.getByText("Total to pay")).toBeTruthy();
    expect(screen.getAllByText(formatMoney(150)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Each batch is recorded as its own payment/)).toBeTruthy();
    expect(submitButton().textContent).toContain("2");
  });

  it("announces a part payment and how much stays outstanding", async () => {
    mount([row()]);
    await userEvent.clear(amountBox());
    await userEvent.type(amountBox(), "500");
    expect(screen.getByText(/This records a part payment/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`${formatMoney(250).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} stays outstanding`))).toBeTruthy();
  });
});

describe("RecordPaymentModal: validation", () => {
  it("only accepts digits and one decimal point in the amount", async () => {
    mount([row()]);
    await userEvent.clear(amountBox());
    await userEvent.type(amountBox(), "1a2b.3.4");
    expect(amountBox().value).toBe("12.34");
  });

  it("blocks an empty, zero or over-balance amount", async () => {
    const { onConfirm } = mount([row()]);
    await userEvent.clear(amountBox());
    expect(isDisabled(submitButton())).toBe(true);
    await userEvent.type(amountBox(), "0");
    expect(isDisabled(submitButton())).toBe(true);
    await userEvent.clear(amountBox());
    await userEvent.type(amountBox(), "750.01");
    expect(isDisabled(submitButton())).toBe(true);
    fireEvent.submit(document.getElementById("record-payment-form")!);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.clear(amountBox());
    await userEvent.type(amountBox(), "750");
    expect(isDisabled(submitButton())).toBe(false);
  });

  it("refuses a bank transfer without a reference, and says why", async () => {
    mount([row()]);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Bank Transfer" }));
    expect(screen.getByText("Needed to reconcile this payout against the bank statement")).toBeTruthy();
    expect(screen.getByLabelText(/^utr [/] reference$/i).getAttribute("placeholder")).toBe("e.g. UTR123456789");
    expect(isDisabled(submitButton())).toBe(true);
    await userEvent.type(screen.getByLabelText(/^utr [/] reference$/i), "   ");
    expect(isDisabled(submitButton())).toBe(true);
    await userEvent.type(screen.getByLabelText(/^utr [/] reference$/i), "UTR9");
    expect(isDisabled(submitButton())).toBe(false);
  });

  it("starts on today inside this month's bounds, and blocks a date typed outside them", async () => {
    mount([row()]);
    const group = screen.getByRole("group", { name: /payment date/i });
    const segments = within(group).getAllByRole("spinbutton");
    expect(segments.length).toBe(3);
    expect(isDisabled(submitButton())).toBe(false);
    // Move the year back one: now before this month, so out of bounds.
    const yearSeg = segments.find((s) => /year/i.test(s.getAttribute("aria-label") ?? ""))!;
    fireEvent.keyDown(yearSeg, { key: "ArrowDown" });
    await waitFor(() => expect(isDisabled(submitButton())).toBe(true));
    expect(screen.getByText(/Pick a date from/)).toBeTruthy();
  });
});

describe("RecordPaymentModal: lifecycle", () => {
  it("cancels through Cancel", () => {
    const { onClose, onConfirm } = mount([row()]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("while recording: says so, disables Cancel and ignores Escape; re-enables after", async () => {
    let finish: () => void = () => {};
    const onConfirm = vi.fn().mockImplementation(() => new Promise<void>((res) => { finish = res; }));
    const { onClose } = mount([row()], { onConfirm });
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole("button", { name: /recording/i })).toBeTruthy());
    expect(isDisabled(screen.getByRole("button", { name: "Cancel" }))).toBe(true);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(isDisabled(screen.getByRole("button", { name: "Cancel" }))).toBe(false));
  });

  it("clears the form when it is reopened for another batch", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const first = row();
    const second = row({ id: "b2", remainingAmount: 80 });
    const view = render(
      <KitProvider><RecordPaymentModal batches={[first]} open onClose={onClose} onConfirm={onConfirm} /></KitProvider>,
    );
    await userEvent.type(screen.getByLabelText(/^reference$/i), "old-ref");
    view.rerender(<KitProvider><RecordPaymentModal batches={[first]} open={false} onClose={onClose} onConfirm={onConfirm} /></KitProvider>);
    view.rerender(<KitProvider><RecordPaymentModal batches={[second]} open onClose={onClose} onConfirm={onConfirm} /></KitProvider>);
    expect((await screen.findByLabelText(/^reference$/i) as HTMLInputElement).value).toBe("");
    expect(amountBox().value).toBe("80.00");
  });

  it("cannot be submitted with no batches", () => {
    mount([]);
    expect(isDisabled(submitButton())).toBe(true);
  });
});

describe("Reboot shield", () => {
  const bare = (root: ParentNode) =>
    [...root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,label,ul,ol,li,button,a")].filter(
      (el) => !el.hasAttribute("data-slot") && !el.closest("[data-slot=button]"),
    );

  it("every raw heading, paragraph, label, list, link and button carries data-slot", async () => {
    mount([row()]);
    await userEvent.clear(amountBox());
    await userEvent.type(amountBox(), "100");
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

vi.mock("@services/reimbursementQueries", () => ({
  fetchRequestQueries: vi.fn(),
  fetchBatchQueries: vi.fn(),
  fetchParticipantRole: vi.fn(),
  fetchBatchParticipantRole: vi.fn(),
  postQueryMessage: vi.fn(),
  resolveQuery: vi.fn(),
  reopenQuery: vi.fn(),
  queryCategoryLabel: (v?: string | null) => v?.trim() || "Something else",
}));
vi.mock("@services/uploader", () => ({ uploadUserAsset: vi.fn() }));
vi.mock("@utils/modal", () => ({ errorConfirmation: vi.fn() }));
vi.mock("@utils/EventBus", () => ({ default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));
vi.mock("./DocumentPreviewModal", () => ({
  default: ({ url, onClose }: { url: string; onClose: () => void }) => <div>preview-{url}<button onClick={onClose}>close-preview</button></div>,
}));

import {
  fetchRequestQueries, fetchBatchQueries, fetchParticipantRole, fetchBatchParticipantRole,
  postQueryMessage, resolveQuery, reopenQuery,
} from "@services/reimbursementQueries";
import { uploadUserAsset } from "@services/uploader";
import { errorConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import QueryConversationDialog from "./QueryConversation";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
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

beforeEach(() => vi.clearAllMocks());

const bare = (root: ParentNode) =>
  [...root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,label,ul,ol,li,button,a")].filter(
    (el) => !el.hasAttribute("data-slot") && !el.closest("[data-slot=button]"),
  );
afterEach(cleanup);

const store = configureStore({ reducer: { auth: () => ({ user: { employeeId: "me" } }) } });

const msg = (id: string, authorRole: "APPROVER" | "EMPLOYEE", body: string, authorId: string, attachments: string[] | null = null) =>
  ({ id, queryId: "q1", authorId, authorRole, body, attachments, createdAt: "2026-11-10T10:00:00Z" });

const thread = (over: Record<string, unknown> = {}) => ({
  id: "q1", scope: "REQUEST", status: "OPEN", category: "Receipt", level: 2, batchId: "b1", reimbursementId: "r1",
  messages: [
    msg("m1", "APPROVER", "Please attach the bill", "boss"),
    msg("m2", "EMPLOYEE", "Here it is", "me", ["docs/bill.pdf"]),
  ],
  ...over,
});

const setup = async (role: "APPROVER" | "EMPLOYEE", t: Record<string, unknown> | Record<string, unknown>[], props: Record<string, unknown> = {}) => {
  vi.mocked(fetchRequestQueries).mockResolvedValue((Array.isArray(t) ? t : [t]) as never);
  vi.mocked(fetchParticipantRole).mockResolvedValue(role);
  const onClose = vi.fn();
  const onChanged = vi.fn();
  render(
    <Provider store={store}>
      <QueryConversationDialog reimbursementId="r1" requestLabel="Cab to client" onClose={onClose} onChanged={onChanged} {...props} />
    </Provider>,
  );
  await screen.findAllByText(/Awaiting|Resolved/);
  return { onClose, onChanged };
};

describe("QueryConversation", () => {
  it("renders nothing without a request or batch, and an empty state without threads", async () => {
    const a = render(<Provider store={store}><QueryConversationDialog onClose={() => {}} /></Provider>);
    expect(screen.queryByRole("dialog")).toBeNull();
    a.unmount();
    vi.mocked(fetchRequestQueries).mockResolvedValue([]);
    vi.mocked(fetchParticipantRole).mockResolvedValue("EMPLOYEE");
    render(<Provider store={store}><QueryConversationDialog reimbursementId="r1" onClose={() => {}} /></Provider>);
    expect(await screen.findByText("No questions have been asked about this expense.")).toBeTruthy();
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
  });

  it("shows the header, the thread state, and the messages in order with mine marked", async () => {
    await setup("EMPLOYEE", thread());
    expect(screen.getByText("Cab to client")).toBeTruthy();
    expect(screen.getByText("Awaiting employee")).toBeTruthy();
    expect(screen.getByText("· raised at level 2")).toBeTruthy();
    expect(screen.getByText("2 messages")).toBeTruthy();
    const first = screen.getByText("Please attach the bill");
    const second = screen.getByText("Here it is");
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Approver")).toBeTruthy();
    expect(screen.getByText("Employee · you")).toBeTruthy();
  });

  it("puts the cursor in the composer when the dialog opens, as the old dialog did", async () => {
    await setup("EMPLOYEE", thread());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByPlaceholderText("Answer your approver…")));
  });

  it("opens the preview of a message attachment", async () => {
    await setup("EMPLOYEE", thread());
    fireEvent.click(screen.getByRole("button", { name: /Attachment 1/ }));
    expect(screen.getByText("preview-docs/bill.pdf")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "close-preview" }));
    expect(screen.queryByText("preview-docs/bill.pdf")).toBeNull();
  });

  it("keeps Send disabled until there is text, then posts the trimmed reply, clears, reloads and broadcasts", async () => {
    const { onChanged } = await setup("EMPLOYEE", thread());
    vi.mocked(postQueryMessage).mockResolvedValue({} as never);
    const send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
    expect(send.disabled || send.getAttribute("aria-disabled") === "true").toBe(true);
    const box = screen.getByPlaceholderText("Answer your approver…") as HTMLTextAreaElement;
    await userEvent.type(box, "  done  ");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(postQueryMessage).toHaveBeenCalledWith("q1", "done", undefined));
    await waitFor(() => expect(box.value).toBe(""));
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(eventBus.emit).toHaveBeenCalledWith(EVENT_KEYS.reimbursementChanged, { action: "query_replied" });
    await waitFor(() => expect(fetchRequestQueries).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Replying does not restart approval/)).toBeTruthy();
  });

  it("reports a failed send and keeps the draft", async () => {
    await setup("EMPLOYEE", thread());
    vi.mocked(postQueryMessage).mockRejectedValue({ response: { data: { message: "Nope" } } });
    const box = screen.getByPlaceholderText("Answer your approver…") as HTMLTextAreaElement;
    await userEvent.type(box, "hello");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(errorConfirmation).toHaveBeenCalledWith("Nope"));
    expect(box.value).toBe("hello");
  });

  it("uploads attachments, lists them as removable chips and sends their paths", async () => {
    await setup("EMPLOYEE", thread());
    vi.mocked(uploadUserAsset).mockResolvedValue({ data: { path: "docs/new.png" } } as never);
    vi.mocked(postQueryMessage).mockResolvedValue({} as never);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["x"], "new.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(uploadUserAsset).toHaveBeenCalledWith(expect.any(FormData), "me", undefined, "reimbursement-docs"));
    const remove = await screen.findByRole("button", { name: "Remove attachment 1" });
    fireEvent.click(remove);
    expect(screen.queryByRole("button", { name: "Remove attachment 1" })).toBeNull();
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByRole("button", { name: "Remove attachment 1" });
    await userEvent.type(screen.getByPlaceholderText("Answer your approver…"), "see file");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(postQueryMessage).toHaveBeenCalledWith("q1", "see file", ["docs/new.png"]));
  });

  it("toasts when an upload fails", async () => {
    await setup("EMPLOYEE", thread());
    vi.mocked(uploadUserAsset).mockRejectedValue(new Error("x"));
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "a.png")] } });
    await waitFor(() => expect(errorConfirmation).toHaveBeenCalledWith("Could not upload the attachment"));
  });

  it("offers the employee Edit-the-expense only when the caller allows it", async () => {
    const onEditRequest = vi.fn();
    await setup("EMPLOYEE", thread(), { onEditRequest });
    fireEvent.click(screen.getByRole("button", { name: /Edit the expense instead/i }));
    expect(onEditRequest).toHaveBeenCalledTimes(1);
  });

  it("gives the approver Reply and Resolve, with no Attach, and resolves with the typed note", async () => {
    await setup("APPROVER", thread({ status: "ANSWERED" }));
    expect(screen.getByText("Awaiting approver")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Attach" })).toBeNull();
    expect(screen.queryByText(/Replying does not restart approval/)).toBeNull();
    vi.mocked(resolveQuery).mockResolvedValue({} as never);
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(resolveQuery).toHaveBeenCalledWith("q1", undefined));
    await userEvent.type(screen.getByPlaceholderText("Reply, or ask for something more…"), " ok ");
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(resolveQuery).toHaveBeenLastCalledWith("q1", "ok"));
  });

  it("shows read-only waiting states instead of a composer", async () => {
    await setup("APPROVER", thread({ status: "OPEN" }));
    expect(screen.getByText(/Awaiting the employee's response/)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
    cleanup();
    await setup("EMPLOYEE", thread({ status: "ANSWERED" }));
    expect(screen.getByText("Awaiting your approver's response.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
    cleanup();
    await setup("EMPLOYEE", thread({ status: "RESOLVED" }));
    expect(screen.getByText(/This query is resolved/)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
  });

  it("makes the approver type a question before reopening a resolved thread", async () => {
    await setup("APPROVER", thread({ status: "RESOLVED" }));
    vi.mocked(reopenQuery).mockResolvedValue({} as never);
    fireEvent.click(screen.getByRole("button", { name: /Reopen with this question/i }));
    expect(errorConfirmation).toHaveBeenCalledWith("Type the new question before reopening.");
    expect(reopenQuery).not.toHaveBeenCalled();
    await userEvent.type(screen.getByPlaceholderText("Type the new question to reopen this thread…"), "one more thing");
    fireEvent.click(screen.getByRole("button", { name: /Reopen with this question/i }));
    await waitFor(() => expect(reopenQuery).toHaveBeenCalledWith("q1", "one more thing"));
  });

  it("puts the focused thread first", async () => {
    await setup("EMPLOYEE", [thread({ id: "a", category: "First topic" }), thread({ id: "b", category: "Second topic" })], { focusQueryId: "b" });
    const second = screen.getByText("Second topic");
    const first = screen.getByText("First topic");
    expect(second.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("for a batch, loads batch threads only and tags them", async () => {
    vi.mocked(fetchBatchQueries).mockResolvedValue([thread({ scope: "BATCH", category: "About batch" }), thread({ id: "z", scope: "REQUEST", category: "About row" })] as never);
    vi.mocked(fetchBatchParticipantRole).mockResolvedValue("EMPLOYEE");
    render(<Provider store={store}><QueryConversationDialog batchId="b1" onClose={() => {}} /></Provider>);
    expect(await screen.findByText("About batch")).toBeTruthy();
    expect(screen.queryByText("About row")).toBeNull();
    expect(screen.getByText("Batch query")).toBeTruthy();
  });

  it("falls back to the empty state when loading fails, and closes from the dialog", async () => {
    vi.mocked(fetchRequestQueries).mockRejectedValue(new Error("x"));
    vi.mocked(fetchParticipantRole).mockResolvedValue("EMPLOYEE");
    const onClose = vi.fn();
    render(<Provider store={store}><QueryConversationDialog reimbursementId="r1" onClose={onClose} /></Provider>);
    expect(await screen.findByText(/No questions have been asked/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /^close$/i })[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe("Reboot shield", () => {
  it("every raw heading, paragraph, list, link and button carries data-slot", async () => {
    await setup("EMPLOYEE", thread());
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    vi.mocked(uploadUserAsset).mockResolvedValue({ data: { path: "docs/new.png" } } as never);
    fireEvent.change(input, { target: { files: [new File(["x"], "a.png")] } });
    await screen.findByRole("button", { name: "Remove attachment 1" });
    expect(bare(document.body).map((e) => e.outerHTML)).toEqual([]);
  });
});

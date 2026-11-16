// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const perms = vi.hoisted(() => ({ own: true, others: false, write: false, off: new Set<string>() }));

vi.mock("@utils/authAbac", () => ({
  hasPermission: (_r: string, p: string) => (p === "readOwn" ? perms.own : perms.others),
}));
vi.mock("@constants/statistics", () => ({
  permissionConstToUseWithHasPermission: { readOwn: "readOwn", readOthers: "readOthers" },
  resourceNameMapWithCamelCase: { reimbursement: "reimbursement" },
}));
vi.mock("@utils/can", () => ({
  canSection: () => perms.write,
  isTabTurnedOff: (_section: string, slug: string) => perms.off.has(slug),
}));
vi.mock("@services/employee", () => ({ fetchReimbursementPaymentQueueCount: async () => ({ count: 3 }) }));
vi.mock("@redux/slices/rolesAndPermissions", () => ({ fetchRolesAndPermissions: () => ({ type: "noop" }) }));
vi.mock("@hooks/useEventBus", () => ({ useEventBus: () => undefined }));
vi.mock("@metronic/layout/core", () => ({ PageTitle: () => null }));
vi.mock("./Reimbursement", async () => {
  const { SensitiveValue } = await import("@/ds/patterns/sensitive");
  return { default: () => <div>my-panel <SensitiveValue>1,000</SensitiveValue></div> };
});
vi.mock("./views/admin/AllEmployee", () => ({ default: () => <div>all-panel</div> }));
vi.mock("./views/admin/SearchEmployee", async () => {
  const { SensitiveValue } = await import("@/ds/patterns/sensitive");
  return { default: () => <div>search-panel <SensitiveValue>3,000</SensitiveValue></div> };
});
vi.mock("./views/admin/PaymentTab", async () => {
  const { SensitiveValue } = await import("@/ds/patterns/sensitive");
  return { default: () => <div>pay-panel <SensitiveValue>2,000</SensitiveValue></div> };
});
vi.mock("./views/admin/ReimbursementConfiguration", () => ({ default: () => <div>cfg-panel</div> }));

import Viewer from "./AdminAndEmployeeReimbursementViewer";

afterEach(() => { cleanup(); perms.off.clear(); });
beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
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

function mount(path: string) {
  const store = configureStore({ reducer: { authz: (s = {}) => s } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Viewer />
      </MemoryRouter>
    </Provider>,
  );
}

describe("reimbursement tab bar", () => {
  it("an employee with own-read only sees one tab, with the eye in the bar", () => {
    Object.assign(perms, { own: true, others: false, write: false });
    mount("/finance/reimbursements/my-reimbursements");
    expect(screen.getAllByRole("tab").map((t) => t.getAttribute("title") ?? t.textContent)).toHaveLength(1);
    expect(screen.getByRole("tab", { name: /My Reimbursements/i })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Payment/i })).toBeNull();
    const bar = document.querySelector('[data-slot="page-tabs-bar"]')!;
    expect(bar.querySelector('button[aria-pressed]')).toBeTruthy(); // the eye
  });

  it("a finance admin sees all five tabs; the eye is only on the eye tabs", () => {
    Object.assign(perms, { own: true, others: true, write: true });
    mount("/finance/reimbursements/payment");
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByText("pay-panel")).toBeTruthy();
    // Payment is not an eye tab: no eye in the bar.
    expect(document.querySelector('[data-slot="page-tabs-bar"] button[aria-pressed]')).toBeNull();
  });

  it("opens on Search Employee with the eye available", () => {
    Object.assign(perms, { own: true, others: true, write: false });
    mount("/finance/reimbursements/search-employee");
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByText("search-panel")).toBeTruthy();
    expect(document.querySelector('[data-slot="page-tabs-bar"] button[aria-pressed]')).toBeTruthy();
  });

  it("a tab turned off in Access is absent, and the selection falls back off it", () => {
    Object.assign(perms, { own: true, others: true, write: true });
    perms.off.add("payment");
    mount("/finance/reimbursements/payment");
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByRole("tab", { name: /Payment/i })).toBeNull();
    expect(screen.queryByText(/pay-panel/)).toBeNull();
    // Fell back to a tab that is open.
    expect(screen.getByRole("tab", { selected: true })).toBeTruthy();
  });

  it("figures are in clear on a tab with no eye, and the eye state survives a round trip", () => {
    Object.assign(perms, { own: true, others: true, write: true });
    mount("/finance/reimbursements/my-reimbursements");
    const panel = () => document.querySelector('[role="tabpanel"]') as HTMLElement;

    // Eye tab, hidden by default.
    expect(panel().textContent).toContain("Hidden");
    fireEvent.click(screen.getByRole("button", { name: "Show amounts" }));
    expect(panel().textContent).not.toContain("Hidden");

    // Payment has no eye: clear, and no toggle in the bar.
    fireEvent.click(screen.getByRole("tab", { name: /Payment/i }));
    expect(panel().textContent).toContain("2,000");
    expect(panel().textContent).not.toContain("Hidden");
    expect(document.querySelector('[data-slot="page-tabs-bar"] button[aria-pressed]')).toBeNull();

    // Back on an eye tab the choice is as it was left (shown), not reset to hidden.
    fireEvent.click(screen.getByRole("tab", { name: /Search Employee/i }));
    expect(panel().textContent).toContain("3,000");
    expect(panel().textContent).not.toContain("Hidden");
  });
});

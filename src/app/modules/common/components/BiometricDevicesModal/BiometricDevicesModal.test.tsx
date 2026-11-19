// @vitest-environment jsdom
const api = vi.hoisted(() => ({
  fetchDevicesByBranchId: vi.fn(),
  testDeviceById: vi.fn(),
  alertDialog: vi.fn(),
}));
vi.mock("@services/biometric", () => ({
  fetchDevicesByBranchId: api.fetchDevicesByBranchId,
  testDeviceById: api.testDeviceById,
  createDevice: vi.fn(), updateDeviceById: vi.fn(), deleteDeviceById: vi.fn(),
  toggleDeviceById: vi.fn(), syncDeviceById: vi.fn(), fetchDeviceSyncLogs: vi.fn(),
}));
vi.mock("@services/company", () => ({ fetchAllBranches: vi.fn(async () => ({ data: { branches: [] } })) }));
vi.mock("@hooks/useEventBus", () => ({ useEventBus: () => {} }));
vi.mock("@utils/can", () => ({ canDelete: () => false }));
vi.mock("@app/modules/common/components/ui/feedback", () => ({
  toast: vi.fn(), alertDialog: api.alertDialog, confirmDialog: vi.fn(async () => false),
}));

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { IBiometricDevice } from "@models/biometric";
import BiometricDevicesModal from "./index";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

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

const device = (over: Partial<IBiometricDevice>): IBiometricDevice => ({
  id: "d1", branchId: "b1", name: "Main Entrance", deviceIp: "192.168.1.10", devicePort: "88", serialNumber: "SN1",
  sourceDeviceName: null, username: "essl", password: "••••••", isActive: true, connectionMode: "BOTH",
  consecutiveFailures: 0, lastSyncedAt: null, lastSyncStatus: null, lastPushAt: null, lastPullAt: null,
  createdAt: "2026-11-01T00:00:00Z", ...over,
});

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

async function open(devices: IBiometricDevice[]) {
  api.fetchDevicesByBranchId.mockResolvedValue(devices);
  render(<BiometricDevicesModal show branchId="b1" branchName="Pune" onClose={() => {}} />);
  // The table only — jsdom applies no CSS, so the phone cards (hidden on a wide screen) are in the DOM too.
  const table = await screen.findByRole("table", { name: "Biometric devices in Pune" });
  await waitFor(() => expect(within(table).getByText(devices[0].name)).toBeTruthy());
  return table;
}

describe("BiometricDevicesModal", () => {
  it("labels each device's status, mode and push health", async () => {
    const table = await open([
      device({ id: "a", name: "Gate A", connectionMode: "PUSH", lastPushAt: minutesAgo(5) }),
      device({ id: "b", name: "Gate B", connectionMode: "PULL", isActive: false, lastSyncedAt: minutesAgo(30) }),
      device({ id: "c", name: "Gate C", connectionMode: "BOTH", consecutiveFailures: 2, lastPushAt: null, lastSyncedAt: minutesAgo(30) }),
      device({ id: "d", name: "Gate D", connectionMode: "BOTH", lastPushAt: minutesAgo(180) }),
    ]);
    const row = (name: string) => within(table).getByText(name).closest("tr")!;
    expect(within(row("Gate A")).getByText("Live")).toBeTruthy();
    expect(within(row("Gate A")).getByText("Active")).toBeTruthy();
    // A pull-only device is not expected to push: "not applicable", never a red "Never".
    expect(within(row("Gate B")).getByText("Inactive")).toBeTruthy();
    expect(within(row("Gate B")).queryByText("Never")).toBeNull();
    expect(within(row("Gate C")).getByText("2 Failures")).toBeTruthy();
    expect(within(row("Gate C")).getByText("Never")).toBeTruthy();
    expect(within(row("Gate C")).getByText("Push + Pull")).toBeTruthy();
    // Past the server's one-hour PUSH_STALE window.
    expect(within(row("Gate D")).getByText("Stale · 3 hours ago")).toBeTruthy();
  });

  it("offers Sync only to devices the server pulls from", async () => {
    const table = await open([
      device({ id: "a", name: "Push only", connectionMode: "PUSH" }),
      device({ id: "b", name: "Pull only", connectionMode: "PULL" }),
      device({ id: "c", name: "Both", connectionMode: "BOTH" }),
    ]);
    // The body only: the header has a "Sync" column whose sort button shares the name.
    const body = table.querySelector("tbody")!;
    expect(within(body).getAllByRole("button", { name: "Sync" })).toHaveLength(2);
    expect(within(within(table).getByText("Push only").closest("tr")!).queryByRole("button", { name: "Sync" })).toBeNull();
  });

  it("writes the Test result from the structured answer, one fact per line", async () => {
    api.testDeviceById.mockResolvedValue({ mode: "BOTH", connected: false, pullOk: false, pullReachable: true, pushHealthy: false, lastPushAt: null, message: "raw" });
    const table = await open([device({ id: "a", name: "Gate A" })]);
    fireEvent.click(within(table).getByRole("button", { name: "Test" }));
    await waitFor(() => expect(api.alertDialog).toHaveBeenCalled());
    const arg = api.alertDialog.mock.calls[0][0];
    expect(arg.title).toBe("Device Not Reachable");
    expect(arg.text).toContain("the sign-in was refused");
    expect(arg.text).toContain("Push: nothing received yet");
    expect(arg.text.split("\n\n")).toHaveLength(2);
  });
});

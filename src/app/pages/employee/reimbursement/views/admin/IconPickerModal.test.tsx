// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import IconPickerModal from "./IconPickerModal";

afterEach(cleanup);

beforeAll(() => {
  // jsdom has no ResizeObserver or matchMedia; the kit dialog (floating labels, motion) uses both.
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

/**
 * A reimbursement type's icon is STORED DATA: either a system icon name or an Iconify URL.
 * The selected-icon preview must draw the first as a Lucide svg (via the registry) and the
 * second as a plain <img>, never an svg.
 */
function renderPicker(currentIcon: Parameters<typeof IconPickerModal>[0]["currentIcon"]) {
  return render(
    <IconPickerModal show onHide={vi.fn()} onSelect={vi.fn()} currentIcon={currentIcon} />,
  );
}

/** The circle that holds the selected icon. */
function previewCircle() {
  return screen.getByTestId("selected-icon-preview");
}

describe("IconPickerModal selected-icon preview", () => {
  it("draws a stored system name as a Lucide svg at the preview size", () => {
    // "wallet" is a registered system name.
    renderPicker({ source: "system", name: "wallet", label: "Wallet" });
    const svg = previewCircle().querySelector("svg.lucide-wallet");
    expect(svg).not.toBeNull();
    expect(svg!.classList.contains("size-[23px]")).toBe(true);
  });

  it("draws a glyph on every system icon tile in every group", () => {
    // Each tile's name is stored on the reimbursement type when picked, so a tile the
    // registry cannot resolve is a category that saves with no icon at all.
    renderPicker(null);
    const blank: string[] = [];
    const groups = document.querySelectorAll<HTMLButtonElement>('[data-wt-control="chip"]');
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      fireEvent.click(group);
      for (const tile of document.querySelectorAll<HTMLButtonElement>('[data-wt-control="swatch"]')) {
        if (!tile.querySelector("svg.lucide")) blank.push(`${group.textContent}: ${tile.title}`);
      }
    }
    expect(blank).toEqual([]);
  });

  it("draws a stored Iconify URL as an <img> and no svg", () => {
    const url = "https://api.iconify.design/mdi/car.svg?color=%23181C32";
    renderPicker({ source: "iconify", url, label: "car" });
    const circle = previewCircle();
    const img = circle.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe(url);
    expect(circle.querySelector("svg")).toBeNull();
  });
});

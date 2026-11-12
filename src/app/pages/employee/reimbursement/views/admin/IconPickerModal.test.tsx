// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import IconPickerModal from "./IconPickerModal";

afterEach(cleanup);

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

/** The 44px circle that holds the selected icon, found from the "Selected Icon" caption. */
function previewCircle() {
  const caption = Array.from(document.body.querySelectorAll("div")).find(
    (d) => d.textContent === "Selected Icon",
  );
  const circle = caption?.parentElement?.previousElementSibling as HTMLElement | undefined;
  expect(circle).toBeTruthy();
  return circle as HTMLElement;
}

describe("IconPickerModal selected-icon preview", () => {
  it("draws a stored system name as a Lucide svg at the preview size", () => {
    // "wallet" is registered; legacy names the registry does not know (e.g. "car") draw nothing.
    renderPicker({ source: "system", name: "wallet", label: "Wallet" });
    const svg = previewCircle().querySelector("svg.lucide");
    expect(svg).not.toBeNull();
    expect(svg!.classList.contains("size-[23px]")).toBe(true);
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

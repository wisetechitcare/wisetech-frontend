// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Clipboard, ReceiptText } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { PageTabs, type PageTabItem } from "./page-tabs"

afterEach(cleanup)

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
      }),
    })
  }
})

const items: PageTabItem[] = [
  { value: "mine", label: "My Reimbursements", icon: ReceiptText, content: <p>Mine panel</p> },
  { value: "details", label: "Details", icon: Clipboard, content: <p>Details panel</p>, badge: 3 },
  { value: "hidden", label: "Hidden Tab", hidden: true, content: <p>Hidden panel</p> },
]

describe("PageTabs", () => {
  it("renders icon + label tabs, the first panel, and skips hidden tabs", () => {
    render(<PageTabs items={items} />)
    expect(screen.getAllByRole("tab")).toHaveLength(2)
    expect(screen.getByRole("tab", { name: /My Reimbursements/ }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getByText("Mine panel")).toBeTruthy()
    expect(screen.queryByRole("tab", { name: /Hidden Tab/ })).toBeNull()
  })

  it("keeps each tab named for assistive tech when the label is hidden on a phone", () => {
    render(<PageTabs items={items} />)
    // The label is sr-only below `sm`, never removed: the tab keeps its accessible name.
    const label = screen.getByText("My Reimbursements")
    expect(label.className).toContain("max-sm:sr-only")
    expect(screen.getByRole("tab", { name: /Details/ }).getAttribute("title")).toBe("Details")
  })

  it("announces a count badge in the tab name", () => {
    render(<PageTabs items={items} />)
    expect(screen.getByRole("tab", { name: /Details/ }).textContent).toContain("3")
  })

  it("is controlled: reports a change and shows the chosen panel", () => {
    const onValueChange = vi.fn()
    const { rerender } = render(<PageTabs items={items} value="mine" onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole("tab", { name: /Details/ }))
    expect(onValueChange).toHaveBeenCalledWith("details", expect.anything())
    rerender(<PageTabs items={items} value="details" onValueChange={onValueChange} />)
    expect(screen.getByRole("tab", { name: /Details/ }).getAttribute("aria-selected")).toBe("true")
  })

  it("renders the headerAction slot beside the tabs", () => {
    render(<PageTabs items={items} headerAction={<Button type="button" size="icon" aria-label="Eye">E</Button>} />)
    expect(screen.getByRole("button", { name: "Eye" })).toBeTruthy()
  })

  it("makes the bar sticky", () => {
    const { container } = render(<PageTabs items={items} />)
    expect(container.querySelector('[data-slot="page-tabs-bar"]')?.className).toContain("sticky")
  })
})

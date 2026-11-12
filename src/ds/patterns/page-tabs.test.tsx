// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Clipboard, ReceiptText } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { PageTabs, pickPhoneTabMode, type PageTabItem } from "./page-tabs"

afterEach(cleanup)

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
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
    // Unmeasured, the bar is in nav mode: the full name (first) is sr-only, an aria-hidden short name sits beside it.
    const label = screen.getAllByText("My Reimbursements")[0]
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

describe("PageTabs uncontrolled and hidden fallback", () => {
  it("changes tab on click when uncontrolled", () => {
    render(<PageTabs items={items} />)
    fireEvent.click(screen.getByRole("tab", { name: /Details/ }))
    expect(screen.getByRole("tab", { name: /Details/ }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getByText("Details panel")).toBeTruthy()
  })

  it("falls back to the first visible tab when value points at a hidden one, and reports it", () => {
    const onValueChange = vi.fn()
    render(<PageTabs items={items} value="hidden" onValueChange={onValueChange} />)
    expect(screen.getByRole("tab", { name: /My Reimbursements/ }).getAttribute("aria-selected")).toBe("true")
    expect(onValueChange).toHaveBeenCalledWith("mine")
  })

  it("scrolls to the top on change unless scrollOnChange is off", () => {
    const scrollTo = vi.fn()
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo
    const { unmount } = render(<PageTabs items={items} />)
    fireEvent.click(screen.getByRole("tab", { name: /Details/ }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    unmount()
    scrollTo.mockClear()
    render(<PageTabs items={items} scrollOnChange={false} />)
    fireEvent.click(screen.getByRole("tab", { name: /Details/ }))
    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe("pickPhoneTabMode", () => {
  // 5 tabs: gaps 16. row needs rowNeeded+16; nav 5*64+16=336; icons 5*36+16+92=288.
  it("assumes nav before the bar is measured", () => {
    expect(pickPhoneTabMode(0, 5, 100)).toBe("nav")
  })
  it("row when every name fits on one line", () => {
    expect(pickPhoneTabMode(416, 5, 400)).toBe("row")
    expect(pickPhoneTabMode(415, 5, 400)).toBe("nav")
  })
  it("nav down to 64px per tab", () => {
    expect(pickPhoneTabMode(336, 5, Infinity)).toBe("nav")
    expect(pickPhoneTabMode(335, 5, Infinity)).toBe("icons")
  })
  it("icons down to 36px per tab plus room for one name", () => {
    expect(pickPhoneTabMode(288, 5, Infinity)).toBe("icons")
    expect(pickPhoneTabMode(287, 5, Infinity)).toBe("bare")
  })
  it("a single tab at 360px reads as a row (no gaps)", () => {
    expect(pickPhoneTabMode(260, 1, 120)).toBe("row")
  })
})

describe("PageTabs phone naming", () => {
  const mockWidth = (w: number) => {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: w, height: 40, top: 0, left: 0, right: w, bottom: 40, x: 0, y: 0, toJSON: () => ({}) })
  }
  afterEach(() => vi.restoreAllMocks())

  it("nav mode when there is room for every tab at 64px", () => {
    mockWidth(300) // 3 tabs: nav needs 3*64+8=200; no canvas in jsdom, so row is never picked
    render(<PageTabs items={items.slice(0, 2).concat({ value: "c", label: "Third", content: null })} />)
    expect(document.querySelector('[data-slot="page-tabs-bar"]')?.getAttribute("data-phone-mode")).toBe("nav")
  })

  it("renders the icons mode with the selected tab named and the others sr-only", () => {
    mockWidth(250) // 4 tabs: nav needs 4*64+12=268 > 250 >= icons 4*36+12+92=248
    const four = [...items.slice(0, 2), { value: "c", label: "Third", content: null }, { value: "d", label: "Fourth", content: null }]
    render(<PageTabs items={four} />)
    expect(document.querySelector('[data-slot="page-tabs-bar"]')?.getAttribute("data-phone-mode")).toBe("icons")
    expect(screen.getByText("My Reimbursements").className).not.toContain("max-sm:sr-only")
    expect(screen.getByText("Details").className).toContain("max-sm:sr-only")
  })
})

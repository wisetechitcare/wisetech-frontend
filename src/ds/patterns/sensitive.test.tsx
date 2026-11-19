// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { SensitiveProvider, SensitiveToggle, SensitiveValue, useSensitive } from "./sensitive"

afterEach(cleanup)

beforeAll(() => {
  // jsdom has no ResizeObserver or matchMedia; the kit's motion primitives use both.
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

const toggle = () => screen.getByRole("button", { name: "Show amounts" })

function Probe() {
  const { visible, provided } = useSensitive()
  return <output data-testid="probe">{`${provided ? "provided" : "bare"}:${visible ? "shown" : "hidden"}`}</output>
}

describe("SensitiveProvider", () => {
  it("hides figures until the eye is pressed", () => {
    render(
      <SensitiveProvider>
        <SensitiveToggle />
        <SensitiveValue>₹1,000</SensitiveValue>
      </SensitiveProvider>,
    )
    expect(screen.getByText("Hidden")).toBeTruthy()
    expect(toggle().getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(toggle())
    expect(screen.queryByText("Hidden")).toBeNull()
    expect(toggle().getAttribute("aria-pressed")).toBe("true")
  })

  it("disabled shows every figure and keeps the toggle state", () => {
    const tree = (disabled: boolean) => (
      <SensitiveProvider disabled={disabled}>
        <SensitiveToggle />
        <SensitiveValue>₹1,000</SensitiveValue>
        <Probe />
      </SensitiveProvider>
    )
    const { rerender } = render(tree(false))
    expect(screen.getByText("Hidden")).toBeTruthy()

    rerender(tree(true))
    expect(screen.queryByText("Hidden")).toBeNull()
    expect(screen.getByTestId("probe").textContent).toBe("provided:shown")

    // Pressing the eye while disabled still records the choice...
    fireEvent.click(toggle())
    rerender(tree(false))
    // ...which is in force the moment the provider is enabled again (it was pressed -> revealed).
    expect(screen.queryByText("Hidden")).toBeNull()
    fireEvent.click(toggle())
    expect(screen.getByText("Hidden")).toBeTruthy()
  })

  it("a nested provider defers to the outer one", () => {
    render(
      <SensitiveProvider>
        <SensitiveToggle />
        <SensitiveProvider defaultVisible>
          <SensitiveValue>inner figure</SensitiveValue>
        </SensitiveProvider>
      </SensitiveProvider>,
    )
    // The inner provider asked to open revealed, but the outer one governs.
    expect(screen.getByText("Hidden")).toBeTruthy()
    fireEvent.click(toggle())
    expect(screen.getByText("inner figure")).toBeTruthy()
    expect(screen.queryByText("Hidden")).toBeNull()
  })

  it("an inner defaultVisible=false provider under a disabled outer shows figures, and hides once re-enabled", () => {
    const tree = (disabled: boolean) => (
      <SensitiveProvider disabled={disabled}>
        <SensitiveProvider defaultVisible={false}>
          <SensitiveValue>inner figure</SensitiveValue>
        </SensitiveProvider>
      </SensitiveProvider>
    )
    const { rerender } = render(tree(true))
    expect(screen.queryByText("Hidden")).toBeNull()
    expect(screen.getByText("inner figure")).toBeTruthy()
    rerender(tree(false))
    expect(screen.getByText("Hidden")).toBeTruthy()
  })
})

describe("useSensitive", () => {
  it("reports no provider as shown", () => {
    render(<Probe />)
    expect(screen.getByTestId("probe").textContent).toBe("bare:shown")
  })

  it("reports the current state and follows the eye", () => {
    render(
      <SensitiveProvider>
        <SensitiveToggle />
        <Probe />
      </SensitiveProvider>,
    )
    expect(screen.getByTestId("probe").textContent).toBe("provided:hidden")
    fireEvent.click(toggle())
    expect(screen.getByTestId("probe").textContent).toBe("provided:shown")
  })
})

describe("SensitiveToggle variant onPrimary", () => {
  it("renders an accessible pressed button with a label", () => {
    render(
      <SensitiveProvider>
        <SensitiveToggle variant="onPrimary" />
      </SensitiveProvider>,
    )
    const button = toggle()
    expect(button.getAttribute("aria-pressed")).toBe("false")
    // The visible label drops on a phone (sr-only there) but stays in the accessibility tree.
    expect(button.textContent).toContain("Show amounts")
    fireEvent.click(button)
    expect(button.getAttribute("aria-pressed")).toBe("true")
  })

  it("renders nothing without a provider", () => {
    const { container } = render(<SensitiveToggle variant="onPrimary" />)
    expect(container.innerHTML).toBe("")
  })
})

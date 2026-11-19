// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { useIsMobile } from "./use-mobile"

afterEach(cleanup)

function mockMatchMedia(matcher: (query: string) => boolean) {
  const seen: string[] = []
  window.matchMedia = ((query: string) => {
    seen.push(query)
    return { matches: matcher(query), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  }) as unknown as typeof window.matchMedia
  return seen
}

function Probe({ query }: { query?: string }) {
  const mobile = useIsMobile(query)
  return <span data-testid="v">{String(mobile)}</span>
}

describe("useIsMobile", () => {
  it("is correct on the FIRST render, with no effect pass needed", () => {
    mockMatchMedia(() => true)
    const first: string[] = []
    function Spy() {
      const m = useIsMobile()
      first.push(String(m))
      return null
    }
    render(<Spy />)
    expect(first[0]).toBe("true")
  })

  it("keeps the default phone breakpoint at under 768px", () => {
    const seen = mockMatchMedia(() => false)
    render(<Probe />)
    expect(seen).toContain("(max-width: 767px)")
  })

  it("honours a custom query", () => {
    const seen = mockMatchMedia((q) => q === "(max-width: 768px)")
    const { getByTestId } = render(<Probe query="(max-width: 768px)" />)
    expect(seen).toContain("(max-width: 768px)")
    expect(getByTestId("v").textContent).toBe("true")
  })
})

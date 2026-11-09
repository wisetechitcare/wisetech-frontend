// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DEMO_DATA } from "@app/modules/company-profile/fixtures"
import CompanyProfilePage from "./CompanyProfilePage"

// CRM → Company Profile on sample data. The organisation's logo is the one thing read from the app, so it is
// the one thing mocked here; toasts are captured to check the slide-limit message.
const toast = vi.hoisted(() => vi.fn())
vi.mock("@redux/store", () => ({ store: { getState: () => ({ appSettings: {} }), dispatch: () => {}, subscribe: () => () => {} } }))
vi.mock("@hooks/useRootOrgNames", () => ({ useHomeRootOrg: () => ({ id: "org-1", name: "WISETECH", logo: "https://cdn.example/org-logo.png" }) }))
vi.mock("@app/modules/common/components/ui", async (real) => ({ ...(await real<object>()), toast }))

afterEach(() => {
  cleanup()
  toast.mockClear()
})

const counter = () => screen.getByTestId("slide-counter")
const budget = () => screen.getByTestId("slide-budget")
const stage = () => screen.getByRole("region", { name: /^\d+ of \d+:/ })
const filmstrip = () => within(screen.getByRole("navigation", { name: "Slides" })).getAllByRole("button").map((b) => b.lastElementChild?.textContent)
const SERVICES = DEMO_DATA.services
const DECK = [
  "1. Cover",
  "2. About us",
  "3. Who we are",
  "4. Services we offer",
  "5. High-rise 1",
  "6. High-rise 2",
  "7. MOEF / CRZ",
  "8. Government",
  "9. International",
  "10. Heritage",
  "11. Green Building",
  "12. Our Clients 1",
  "13. Our Clients 2",
  "14. Our Clients 3",
  "15. Our Clients 4",
  "16. Our Clients 5",
]

describe("Company Profile page", () => {
  test("generates a section per project category and the client wall, and opens on the cover with the organisation's logo", () => {
    render(<CompanyProfilePage />)
    expect(filmstrip()).toEqual(DECK)
    expect(counter().textContent).toContain("1 / 16")
    expect(budget().textContent).toBe("16 of 20 slides selected")
    expect(stage().querySelector('img[src="https://cdn.example/org-logo.png"]')).not.toBeNull()
  })

  test("footers read “page of total” and follow hiding", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "2. About us" }))
    expect(within(stage()).getByTestId("slide-page").textContent).toBe("2 of 16")
    await user.click(screen.getByRole("button", { name: "Include Who we are", pressed: true }))
    expect(within(stage()).getByTestId("slide-page").textContent).toBe("2 of 15")
  })

  test("About us shows the milestone timeline, not statistics", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "2. About us" }))
    expect(within(stage()).getByText("Our journey")).toBeTruthy()
    expect(within(stage()).getAllByRole("listitem").map((li) => li.querySelector("p")?.textContent)).toEqual(DEMO_DATA.org.milestones.map((m) => String(m.year)))
  })

  test("project tiles carry the status badge; client plates carry their project count", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "5. High-rise 1" }))
    const badges = [...stage().querySelectorAll('[data-slot="badge"]')].map((b) => b.textContent)
    expect(badges.length).toBe(6)
    expect(new Set(badges)).toEqual(new Set(["Completed", "Ongoing"]))
    await user.click(screen.getByRole("button", { name: "12. Our Clients 1" }))
    const dmart = within(stage()).getByText("D Mart").closest("li")!
    expect(dmart.textContent).toContain("7 projects")
  })

  test("hides one High-rise slide without hiding the section; no slide has a delete button", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "Include High-rise 2", pressed: true }))
    expect(counter().textContent).toContain("1 / 15")
    expect(screen.getByText("11 projects · 2 slides, 1 hidden")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Include High-rise 2", pressed: false })).toBeTruthy()
    expect(screen.queryAllByRole("button", { name: /^(Remove|Delete) / })).toEqual([])
  })

  test("reorders High-rise's slides from the keyboard; the preview follows", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    const group = within(screen.getByRole("group", { name: "High-rise slides" }))
    group.getByRole("button", { name: /^Drag to reorder High-rise 2,/ }).focus()
    await user.keyboard("{ArrowUp}")
    await user.click(screen.getByRole("button", { name: "5. High-rise 1" }))
    expect(within(stage()).getAllByRole("listitem")).toHaveLength(4) // the 5-project slide is first now: hero + 4 tiles
  })

  test("reorders sections from the keyboard", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    screen.getByRole("button", { name: /^Drag to reorder Services we offer,/ }).focus()
    await user.keyboard("{ArrowUp}")
    expect(screen.getByRole("button", { name: "3. Services we offer" })).toBeTruthy()
  })

  test("edits services: reorder, drop one, save; the slide follows the selected order", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "Edit Services we offer" }))
    const order = within(await screen.findByRole("region", { name: "Selected order" }))
    order.getByRole("button", { name: new RegExp(`^Drag to reorder ${SERVICES[0].name},`) }).focus()
    await user.keyboard("{ArrowDown}")
    await user.click(order.getByRole("button", { name: `Remove ${SERVICES[7].name}` }))
    expect(screen.getByTestId("picker-summary").textContent).toContain("7 of 12 selected")
    await user.click(screen.getByRole("button", { name: /save section/i }))
    expect(await screen.findByText("7 services · CRM")).toBeTruthy()
    const tiles = within(screen.getByRole("region", { name: /Services we offer/ })).getAllByRole("listitem")
    expect(tiles.map((t) => t.textContent?.replace(/\d+ projects$/, ""))).toEqual([SERVICES[1], SERVICES[0], ...SERVICES.slice(2, 7)].map((s) => s.name))
  })

  test("moves a project to another slide: it leaves its old slide, and the preview follows on save", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "Edit High-rise" }))
    const slides = within(await screen.findByRole("region", { name: "Slides" }))
    const first = within(slides.getByRole("group", { name: "Slide 1" }))
    const name = first.getAllByRole("button", { name: /^Remove / })[0].getAttribute("aria-label")!.replace("Remove ", "")
    await user.selectOptions(first.getByRole("combobox", { name: `Move ${name} to` }), "1")
    expect(within(slides.getByRole("group", { name: "Slide 1" })).queryByText(name)).toBeNull()
    expect(within(slides.getByRole("group", { name: "Slide 2" })).getByText(name)).toBeTruthy()
    await user.click(screen.getByRole("button", { name: /save section/i }))
    await user.click(screen.getByRole("button", { name: "6. High-rise 2" }))
    expect(within(stage()).getByText(name)).toBeTruthy()
  })

  test("a project on another section cannot be picked twice", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "Edit MOEF / CRZ" }))
    const tile = (await screen.findAllByText("On High-rise"))[0].closest("button")!
    expect(tile.disabled).toBe(true)
  })

  /**
   * 90s, against the suite's 35s default. Measured, not guessed: this test runs in 3.3s alone and
   * exhausts 35s under full-suite load — a >10x contention factor, because it drives ~18 full
   * re-renders of the whole deck page in jsdom (the next heaviest test in this file is 1.1s, which
   * survives the same contention with room to spare, so it is the only one that needs this).
   *
   * Given to this ONE test rather than raised in vitest.config.ts, which has already been raised
   * twice for CPU contention: a global ceiling means every genuinely hung test anywhere in the
   * suite takes that much longer to report.
   */
  test("never shows more than 20 slides: the picker stops at the limit, and showing a 21st is refused", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    // Spread High-rise over 6 slides: 16 → 20.
    await user.click(screen.getByRole("button", { name: "Edit High-rise" }))
    for (let i = 0; i < 4; i++) {
      const row = within(within(await screen.findByRole("region", { name: "Slides" })).getByRole("group", { name: "Slide 1" }))
      await user.selectOptions(row.getAllByRole("combobox")[0], "new")
    }
    expect(screen.getByTestId("picker-summary").textContent).toBe("11 selected · 6 slides")
    await user.click(screen.getByRole("button", { name: /save section/i }))
    expect(budget().textContent).toBe("20 of 20 slides selected")
    // A 7th High-rise slide would pass the limit: the picker says so and will not save.
    await user.click(screen.getByRole("button", { name: "Edit High-rise" }))
    const row = within(within(await screen.findByRole("region", { name: "Slides" })).getByRole("group", { name: "Slide 1" }))
    await user.selectOptions(row.getAllByRole("combobox")[0], "new")
    expect(screen.getByTestId("picker-summary").textContent).toContain("only 6 left in the presentation")
    expect(screen.getByRole("button", { name: /save section/i })).toHaveProperty("disabled", true)
    await user.click(screen.getByRole("button", { name: /cancel/i }))
    // Hide Services (19) and give its place to a 7th High-rise slide (20): showing Services again is refused.
    await user.click(screen.getByRole("button", { name: "Include Services we offer", pressed: true }))
    expect(budget().textContent).toBe("19 of 20 slides selected")
    await user.click(screen.getByRole("button", { name: "Edit High-rise" }))
    const again = within(within(await screen.findByRole("region", { name: "Slides" })).getByRole("group", { name: "Slide 1" }))
    await user.selectOptions(again.getAllByRole("combobox")[0], "new")
    await user.click(screen.getByRole("button", { name: /save section/i }))
    expect(budget().textContent).toBe("20 of 20 slides selected")
    await user.click(screen.getByRole("button", { name: "Include Services we offer", pressed: false }))
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Slide limit reached" }))
    expect(budget().textContent).toBe("20 of 20 slides selected")
    expect(screen.getByRole("button", { name: "Include Services we offer", pressed: false })).toBeTruthy()
  }, 90_000)

  test("makes no network request: the deck runs on sample data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, "open")
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "Next slide" }))
    await user.click(screen.getByRole("button", { name: "Include Services we offer", pressed: true }))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
  })
})

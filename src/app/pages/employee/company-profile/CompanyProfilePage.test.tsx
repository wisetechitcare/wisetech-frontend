// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DEMO_DATA } from "@app/modules/company-profile/fixtures"
import CompanyProfilePage from "./CompanyProfilePage"

// CRM → Company Profile, Phase 1: the five slides on sample data. The organisation's logo is the one thing
// read from the app, so it is the one thing mocked here.
vi.mock("@redux/store", () => ({ store: { getState: () => ({ appSettings: {} }), dispatch: () => {}, subscribe: () => () => {} } }))
vi.mock("@hooks/useRootOrgNames", () => ({ useHomeRootOrg: () => ({ id: "org-1", name: "WISETECH", logo: "https://cdn.example/org-logo.png" }) }))

afterEach(cleanup)

const counter = () => screen.getByTestId("slide-counter")
const SERVICES = DEMO_DATA.services

describe("Company Profile page", () => {
  test("opens on the cover, with the organisation's logo, over a five-section, six-slide deck", () => {
    render(<CompanyProfilePage />)
    expect(counter().textContent).toContain("1 / 6")
    const stage = screen.getByRole("region", { name: /^1 of 6: Cover/ })
    expect(stage.querySelector('img[src="https://cdn.example/org-logo.png"]')).not.toBeNull()
    expect(within(screen.getByRole("navigation", { name: "Slides" })).getAllByRole("button").map((b) => b.lastElementChild?.textContent)).toEqual([
      "1. Cover",
      "2. About us",
      "3. Who we are",
      "4. Services we offer",
      "5. High-rise 1",
      "6. High-rise 2",
    ])
  })

  test("hides one High-rise slide without hiding the section, and collapses its slide list", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "Include High-rise 2", pressed: true }))
    expect(counter().textContent).toContain("1 / 5")
    expect(screen.getByText("10 projects · 2 slides, 1 hidden")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Include High-rise", pressed: true })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "High-rise slides", expanded: true }))
    expect(screen.queryByRole("group", { name: "High-rise slides" })).toBeNull()
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

  test("a project section needs at least 5 projects", async () => {
    const user = userEvent.setup()
    render(<CompanyProfilePage />)
    await user.click(screen.getByRole("button", { name: "Edit High-rise" }))
    const order = within(await screen.findByRole("region", { name: "Selected order" }))
    for (const b of order.getAllByRole("button", { name: /^Remove / }).slice(0, 6)) await user.click(b)
    expect(screen.getByTestId("picker-summary").textContent).toContain("4 selected · pick at least 5")
    expect(screen.getByRole("button", { name: /save section/i })).toHaveProperty("disabled", true)
  })

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

import { describe, expect, it } from "vitest"
import { autoPick, facetValues, spread, formatArea, paginateGroups, places, plus, repeatPartners, type ProfileProject } from "./profile"

const p = (id: string, x: Partial<ProfileProject>): ProfileProject => ({
  id,
  name: id,
  city: "Mumbai",
  country: "India",
  lat: 19,
  lng: 72,
  typology: "Residential",
  tags: [],
  cover: "c.jpg",
  ...x,
})
const projects = [
  p("a", { client: "DLH", areaSqft: 400000, tags: ["High-rise"] }),
  p("b", { client: "DLH", areaSqft: 900000, cover: null, tags: ["High-rise"], lat: 21 }),
  p("c", { client: "Crescent", areaSqft: 100000, typology: "Commercial", city: "Karbala", country: "Iraq", lat: 32, lng: 44 }),
  p("d", { client: "DLH", areaSqft: 250000, city: "Pune", lat: 18, lng: 73 }),
]

describe("company profile", () => {
  it("formats area in lakh sq ft above 1,00,000", () => {
    expect(formatArea(200000)).toBe("2 L sq ft")
    expect(formatArea(17000)).toBe("17,000 sq ft")
  })
  it("quotes totals as tidy round-downs", () => {
    expect([plus(712), plus(468), plus(38), plus(7)]).toEqual(["700+", "450+", "35+", "7+"])
  })
  it("auto-picks only projects with a Gallery cover, largest first", () => {
    expect(autoPick(projects, "typology", "Residential", 5)).toEqual(["a", "d"])
    expect(autoPick(projects, "tag", "High-rise", 5)).toEqual(["a"])
  })
  it("counts repeat partners and facet values", () => {
    expect(repeatPartners(projects, "client")).toEqual([{ name: "DLH", count: 3 }])
    expect(facetValues(projects, "typology")[0]).toEqual({ name: "Residential", count: 3 })
  })
  it("places India pins by city and world pins by country, at the mean coordinate", () => {
    expect(places(projects, "india")).toEqual([
      { id: "Mumbai", name: "Mumbai", lat: 20, lng: 72, count: 2 },
      { id: "Pune", name: "Pune", lat: 18, lng: 73, count: 1 },
    ])
    expect(places(projects, "world").map((x) => [x.name, x.count])).toEqual([["India", 3], ["Iraq", 1]])
    // A project without coordinates (not yet geocoded) gets no pin and does not skew its city's position.
    expect(places([...projects, p("e", { lat: null, lng: null })], "india")[0]).toMatchObject({ name: "Mumbai", lat: 20, count: 2 })
  })
  it("spreads project sections evenly over slides of at most 9, never below 5", () => {
    const sizes = (n: number) => spread(Array.from({ length: n }, (_, i) => i), 9).map((s) => s.length)
    expect([sizes(9), sizes(10), sizes(19), sizes(28)]).toEqual([[9], [5, 5], [7, 6, 6], [7, 7, 7, 7]])
    for (let n = 5; n <= 90; n++) expect(Math.min(...sizes(n))).toBeGreaterThanOrEqual(5)
  })
  it("shelves logo groups side by side and flows the rest onto new pages", () => {
    const g = (name: string, n: number) => ({ name, items: Array.from({ length: n }, (_, i) => i) })
    const shape = (pages: ReturnType<typeof paginateGroups<number>>) => pages.map((p) => p.map((shelf) => shelf.map((x) => `${x.name}${x.items.length}`)))
    expect(shape(paginateGroups([g("A", 8), g("B", 3), g("C", 3), g("D", 2), g("E", 1)], 6, 7))).toEqual([[["A8"], ["B3", "C3"], ["D2", "E1"]]])
    // A group taller than the room left is split across pages.
    expect(shape(paginateGroups([g("A", 20)], 6, 3))).toEqual([[["A12"]], [["A8"]]])
  })
})

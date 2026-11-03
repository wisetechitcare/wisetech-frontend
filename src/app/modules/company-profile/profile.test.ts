import { describe, expect, it } from "vitest"
import { autoPick, chunk, facetValues, formatArea, places, plus, repeatPartners, slideCount, type ProfileProject, type ProjectSection } from "./profile"

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
  })
  it("splits project sections into slides and counts them against the deck budget", () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([[1, 2, 3, 4, 5], [6, 7]])
    const s = { kind: "projects", enabled: true, projectIds: ["a", "b", "c", "d", "e", "f"], perSlide: 5 } as ProjectSection
    expect(slideCount(s)).toBe(2)
    expect(slideCount({ ...s, enabled: false })).toBe(0)
  })
})

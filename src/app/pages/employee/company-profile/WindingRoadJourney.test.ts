import { describe, expect, test } from "vitest"
import { ROAD_H, ROAD_W, roadGeometry } from "./WindingRoadJourney"

/** Every cubic segment of the path as [x0, y0, c1x, c1y, c2x, c2y, x, y]. */
function segments(d: string) {
  const nums = (s: string) => s.trim().split(/\s+/).map(Number)
  const [start, ...curves] = d.split(/[MC]/).filter(Boolean).map(nums)
  let prev = start
  return curves.map((c) => {
    const seg = [...prev, ...c]
    prev = c.slice(4)
    return seg
  })
}

describe("roadGeometry", () => {
  test.each([1, 2, 3, 4, 7, 12])("%i milestones: one marker each, centred on its label, alternating, on a smooth road", (n) => {
    const { d, nodes } = roadGeometry(n)
    expect(nodes).toHaveLength(n)
    nodes.forEach(([x, y], i) => {
      // The label spans columns i+1 and i+2 of n+1, so its centre is the line between them.
      expect(x).toBeCloseTo(((i + 1) * ROAD_W) / (n + 1), 2)
      expect(y).toBe(i % 2 ? ROAD_H - 1 : 1)
    })

    const segs = segments(d)
    expect(segs).toHaveLength(n + 1)
    expect(segs[0][0]).toBe(0)
    expect(segs.at(-1)![6]).toBeCloseTo(ROAD_W, 2)
    for (const [x0, y0, c1x, c1y, c2x, c2y, x, y] of segs) {
      // Horizontal tangent at both ends of every segment: each join continues in the same direction.
      expect(c1y).toBe(y0)
      expect(c2y).toBe(y)
      // Every segment the same width, so the curvature matches either side of a join too.
      expect(x - x0).toBeCloseTo(ROAD_W / (n + 1), 2)
      expect(c1x).toBeCloseTo((x0 + x) / 2, 2)
      expect(c2x).toBe(c1x)
    }
  })
})

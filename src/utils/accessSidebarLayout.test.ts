import { describe, expect, it } from "vitest";
import { ACCESS_AREAS, AccessArea } from "./accessAreas";
import { ACCESS_SIDEBAR_LAYOUT, layoutLeaves } from "./accessSidebarLayout";

const leaves = (as: AccessArea[]): string[] => as.flatMap((a) => (a.children?.length ? leaves(a.children) : [a.module]));

describe("access editor laid out like the sidebar", () => {
  it("lists every section exactly once — a missing one could never be ticked", () => {
    const shown = ACCESS_SIDEBAR_LAYOUT.flatMap((g) => g.items.flatMap(layoutLeaves));
    expect([...shown].sort()).toEqual(leaves(ACCESS_AREAS).sort());
  });
});

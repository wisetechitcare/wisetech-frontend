import { describe, expect, it } from "vitest"

import { BRANCHES, DEVICES, FIXTURE_NOW, ORGANIZATIONS, ORG_IDS } from "@/storybook/screens/organization/fixtures/organization"
import { BuiltinFieldId, DeviceHealth, OrgKind, OrgTreeRowType } from "@/storybook/screens/organization/types/organization"
import { formatDate, formatRelative } from "@/storybook/screens/organization/utils/format"
import {
  aprilToMarchContaining,
  buildOrgTree,
  deleteBlocker,
  deviceHealth,
  filterOrgTree,
  flattenOrgTree,
  isFiscalYearOver,
  missingRequiredFields,
  orgKind,
  orgPath,
  orgScope,
  orgStats,
} from "./organization"

const byId = (id: string) => ORGANIZATIONS.find((o) => o.id === id)!

describe("organization prototype utils", () => {
  it("rolls branch and employee counts up the hierarchy, matching the headline stats and the scope", () => {
    const [group] = buildOrgTree(ORGANIZATIONS, BRANCHES)
    expect(group.branches).toHaveLength(0)
    expect(group).toMatchObject({ childCount: 2, branchCount: 4, employeeCount: 35 })
    expect(orgScope(ORG_IDS.GROUP, ORGANIZATIONS, BRANCHES, DEVICES).branches).toHaveLength(group.branchCount)
    expect(orgStats(ORGANIZATIONS, BRANCHES)).toMatchObject({ rootOrgs: 2, subOrgs: 2, totalBranches: 6, totalEmployees: 43 })
  })

  it("search keeps only matching branches; the tree flattens to visible rows", () => {
    const tree = buildOrgTree(ORGANIZATIONS, BRANCHES)
    const [group] = filterOrgTree(tree, "vashi")
    expect(group.children.flatMap((c) => c.branches.map((b) => b.name))).toEqual(["Vashi Studio", "Vashi Office"])
    expect(filterOrgTree(tree, "zzz")).toEqual([])
    expect(flattenOrgTree(tree, new Set())).toHaveLength(2)
    const open = flattenOrgTree(tree, new Set([ORG_IDS.GROUP, ORG_IDS.MEP]))
    expect(open.map((r) => (r.type === OrgTreeRowType.ORGANIZATION ? r.node.id : r.branch.id))).toEqual([
      ORG_IDS.GROUP,
      ORG_IDS.ASSOCIATES,
      ORG_IDS.MEP,
      "br-mep-vashi",
      "br-jogeshwari",
      ORG_IDS.NORTHFIELD,
    ])
  })

  it("derives one device health: stale and failing both need attention", () => {
    expect(Object.fromEntries(DEVICES.map((d) => [d.id, deviceHealth(d, FIXTURE_NOW)]))).toEqual({
      "dev-main": DeviceHealth.STALE,
      "dev-reception": DeviceHealth.HEALTHY,
      "dev-gate": DeviceHealth.FAILING,
      "dev-backoffice": DeviceHealth.INACTIVE,
    })
  })

  it("flags an ended fiscal year, missing required fields and blocked deletes", () => {
    const group = byId(ORG_IDS.GROUP)
    expect(isFiscalYearOver(group.fiscalYear, FIXTURE_NOW)).toBe(true)
    expect(isFiscalYearOver(byId(ORG_IDS.MEP).fiscalYear, FIXTURE_NOW)).toBe(false)
    expect(missingRequiredFields(group).map((f) => f.id)).toEqual([
      BuiltinFieldId.SUPER_ADMIN_EMAIL,
      BuiltinFieldId.ADDRESS,
      BuiltinFieldId.GST_NUMBER,
      BuiltinFieldId.PAN_NO,
    ])
    expect(missingRequiredFields(byId(ORG_IDS.MEP))).toEqual([])
    expect(deleteBlocker(group, ORGANIZATIONS, BRANCHES)).toMatch(/2 sub-organizations/)
    expect(orgPath(ORGANIZATIONS, ORG_IDS.MEP).map((o) => o.id)).toEqual([ORG_IDS.GROUP, ORG_IDS.MEP])
    expect([orgKind(null, true), orgKind(ORG_IDS.GROUP, false), orgKind(null, false)]).toEqual([OrgKind.GROUP, OrgKind.SUB_ORGANIZATION, OrgKind.ORGANIZATION])
  })

  it("formats dates and finds the April – March fiscal year", () => {
    expect(formatRelative("2026-10-20T09:12:00+05:30", FIXTURE_NOW)).toBe("29 days ago")
    expect(formatRelative(null, FIXTURE_NOW)).toBe("Never")
    expect(formatDate("2026-03-31")).toBe("2026.03.31")
    expect(aprilToMarchContaining(new Date(2026, 1, 10))).toEqual({ start: "2025-04-01", end: "2026-03-31" })
    expect(aprilToMarchContaining(new Date(2026, 10, 18))).toEqual({ start: "2026-04-01", end: "2027-03-31" })
  })
})

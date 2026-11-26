import type { LucideIcon } from "lucide-react"

import type { IFormField, IOrgNode, IOrgStats } from "@/models/company"
import type { IBiometricDevice } from "@/models/biometric"
import { BACKFILL_MODES, BUILTIN_SECTION_ICON, CUSTOM_SECTION_ICON, STALE_AFTER_HOURS } from "@/storybook/screens/organization/constants/organization"
import {
  BuiltinFieldId,
  BuiltinSectionId,
  DeviceHealth,
  OrgKind,
  OrgTreeRowType,
  SyncStatus,
  type Branch,
  type FiscalYear,
  type Organization,
  type OrgScope,
  type OrgTreeRow,
} from "@/storybook/screens/organization/types/organization"
import { formatDate, plural } from "@/storybook/screens/organization/utils/format"

const HOUR_MS = 3_600_000
const FISCAL_YEAR_START_MONTH = 3

export const sumEmployees = (branches: Branch[]) => branches.reduce((sum, b) => sum + b.employeeCount, 0)

export function buildOrgTree(orgs: Organization[], branches: Branch[], parentId: string | null = null): IOrgNode[] {
  return orgs
    .filter((org) => org.parentId === parentId)
    .map((org) => {
      const children = buildOrgTree(orgs, branches, org.id)
      const own = branches.filter((b) => b.companyId === org.id)
      return {
        id: org.id,
        name: org.name,
        logo: org.logo,
        businessType: org.values[BuiltinFieldId.BUSINESS_TYPE],
        parentOrganizationId: org.parentId,
        address: org.values[BuiltinFieldId.ADDRESS],
        employeeCount: sumEmployees(own) + children.reduce((sum, c) => sum + c.employeeCount, 0),
        branchCount: own.length + children.reduce((sum, c) => sum + c.branchCount, 0),
        childCount: children.length + children.reduce((sum, c) => sum + c.childCount, 0),
        branches: own,
        children,
      }
    })
}

/** Keeps organizations whose name matches (with everything under them) and, elsewhere, only the matching branches. */
export function filterOrgTree(nodes: IOrgNode[], query: string): IOrgNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes
  return nodes.flatMap((node) => {
    if (node.name.toLowerCase().includes(q)) return [node]
    const branches = node.branches.filter((b) => b.name.toLowerCase().includes(q) || (b.address ?? "").toLowerCase().includes(q))
    const children = filterOrgTree(node.children, q)
    return branches.length || children.length ? [{ ...node, branches, children }] : []
  })
}

/** The rows a tree shows: each organization, then — while expanded — its branches and its sub-organizations. */
export function flattenOrgTree(nodes: IOrgNode[], expanded: ReadonlySet<string>, depth = 0): OrgTreeRow[] {
  return nodes.flatMap((node) => {
    const expandable = node.children.length > 0 || node.branches.length > 0
    const row: OrgTreeRow = { type: OrgTreeRowType.ORGANIZATION, node, depth, expandable }
    if (!expandable || !expanded.has(node.id)) return [row]
    return [
      row,
      ...node.branches.map((branch): OrgTreeRow => ({ type: OrgTreeRowType.BRANCH, branch, depth: depth + 1 })),
      ...flattenOrgTree(node.children, expanded, depth + 1),
    ]
  })
}

export const orgKind = (parentId: string | null | undefined, hasChildren: boolean) =>
  parentId ? OrgKind.SUB_ORGANIZATION : hasChildren ? OrgKind.GROUP : OrgKind.ORGANIZATION

export function orgStats(orgs: Organization[], branches: Branch[]): IOrgStats {
  const rootOrgs = orgs.filter((o) => !o.parentId).length
  return {
    totalOrgs: orgs.length,
    rootOrgs,
    subOrgs: orgs.length - rootOrgs,
    totalBranches: branches.length,
    totalEmployees: sumEmployees(branches),
  }
}

/** Root first, the organization itself last. */
export function orgPath(orgs: Organization[], id: string | null): Organization[] {
  const org = orgs.find((o) => o.id === id)
  return org ? [...orgPath(orgs, org.parentId), org] : []
}

export const orgPathLabel = (orgs: Organization[], id: string) => orgPath(orgs, id).map((o) => o.name).join(" › ")

/** The organization and every sub-organization under it. */
export function descendantIds(orgs: Organization[], id: string): string[] {
  return [id, ...orgs.filter((o) => o.parentId === id).flatMap((o) => descendantIds(orgs, o.id))]
}

export function orgScope(orgId: string, orgs: Organization[], branches: Branch[], devices: IBiometricDevice[]): OrgScope {
  const orgIds = descendantIds(orgs, orgId)
  const scopedBranches = branches.filter((b) => orgIds.includes(b.companyId))
  return {
    orgIds,
    branches: scopedBranches,
    devices: devices.filter((d) => scopedBranches.some((b) => b.id === d.branchId)),
  }
}

export function deleteBlocker(org: Organization, orgs: Organization[], branches: Branch[]): string | null {
  const subOrgs = orgs.filter((o) => o.parentId === org.id).length
  const ownBranches = branches.filter((b) => b.companyId === org.id).length
  if (!subOrgs && !ownBranches) return null
  const parts = [subOrgs && plural(subOrgs, "sub-organization"), ownBranches && plural(ownBranches, "branch", "branches")].filter(Boolean)
  return `${org.name} still has ${parts.join(" and ")}. Move or remove them first.`
}

export function deviceHealth(device: IBiometricDevice, now: Date): DeviceHealth {
  if (!device.isActive) return DeviceHealth.INACTIVE
  if (device.consecutiveFailures > 0 || device.lastSyncStatus === SyncStatus.FAILED) return DeviceHealth.FAILING
  if (!device.lastSyncedAt || now.getTime() - new Date(device.lastSyncedAt).getTime() > STALE_AFTER_HOURS * HOUR_MS) {
    return DeviceHealth.STALE
  }
  return DeviceHealth.HEALTHY
}

export const canBackfill = (device: IBiometricDevice) => BACKFILL_MODES.some((mode) => mode === device.connectionMode)

export const needsAttention = (health: DeviceHealth) => health === DeviceHealth.STALE || health === DeviceHealth.FAILING

export const countNeedingAttention = (devices: IBiometricDevice[], now: Date) =>
  devices.filter((d) => needsAttention(deviceHealth(d, now))).length

export const attentionLabel = (count: number) => `${plural(count, "device")} ${count === 1 ? "needs" : "need"} attention`

export const isFiscalYearOver = (fiscalYear: FiscalYear, now: Date) => new Date(`${fiscalYear.end}T23:59:59`) < now

/** April – March, the Indian fiscal year that contains this day. */
export function aprilToMarchContaining(day: Date): FiscalYear {
  const year = day.getMonth() >= FISCAL_YEAR_START_MONTH ? day.getFullYear() : day.getFullYear() - 1
  return { start: `${year}-04-01`, end: `${year + 1}-03-31` }
}

export const formatRange = (range: FiscalYear) => `${formatDate(range.start)} – ${formatDate(range.end)}`

export function fieldValue(org: Organization, fieldId: string): string {
  if (fieldId === BuiltinFieldId.NAME) return org.name
  if (fieldId === BuiltinFieldId.FISCAL_YEAR) return formatRange(org.fiscalYear)
  return org.values[fieldId]?.trim() ?? ""
}

export function missingRequiredFields(org: Organization): IFormField[] {
  return org.sections.flatMap((s) => s.fields).filter((f) => f.required && !f.hidden && !fieldValue(org, f.id))
}

export const sectionIcon = (sectionId: string): LucideIcon =>
  BUILTIN_SECTION_ICON[sectionId as BuiltinSectionId] ?? CUSTOM_SECTION_ICON

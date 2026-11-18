import { createContext, useContext, useMemo, useState } from "react"

import type { IBiometricDevice, IBiometricSyncLog } from "@/models/biometric"
import { MANUAL_SYNC_RECORDS } from "@/ds/prototypes/constants/organization/organization"
import { BRANCHES, DEVICES, FIXTURE_NOW, ORGANIZATIONS, SYNC_LOGS, TOWNS } from "@/ds/prototypes/fixtures/organization/organization"
import {
  SyncStatus,
  SyncTrigger,
  type Branch,
  type Organization,
  type OrganizationData,
  type OrganizationStore,
  type Town,
} from "@/ds/prototypes/types/organization/organization"

export const ORGANIZATION_STORE_CONTEXT = createContext<OrganizationStore | null>(null)

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

/** In-memory stand-in for the organization services: every change is UI-only and resets on reload. */
export function useOrganizationStoreState(initial?: Partial<OrganizationData>): OrganizationStore {
  const [orgs, setOrgs] = useState<Organization[]>(initial?.orgs ?? ORGANIZATIONS)
  const [branches, setBranches] = useState<Branch[]>(initial?.branches ?? BRANCHES)
  const [devices, setDevices] = useState<IBiometricDevice[]>(initial?.devices ?? DEVICES)
  const [syncLogs, setSyncLogs] = useState<IBiometricSyncLog[]>(initial?.syncLogs ?? SYNC_LOGS)
  const [towns, setTowns] = useState<Town[]>(initial?.towns ?? TOWNS)

  return useMemo<OrganizationStore>(() => {
    const now = FIXTURE_NOW
    return {
      orgs,
      branches,
      devices,
      syncLogs,
      towns,
      now,
      saveOrg: (org) => setOrgs((list) => upsert(list, org)),
      deleteOrg: (id) => setOrgs((list) => list.filter((o) => o.id !== id)),
      saveSections: (orgId, sections) => setOrgs((list) => list.map((o) => (o.id === orgId ? { ...o, sections } : o))),
      saveBranch: (branch) => setBranches((list) => upsert(list, branch)),
      deleteBranch: (id) => {
        setBranches((list) => list.filter((b) => b.id !== id))
        setDevices((list) => list.filter((d) => d.branchId !== id))
      },
      promoteBranch: (id) => {
        const branch = branches.find((b) => b.id === id)
        const parent = orgs.find((o) => o.id === branch?.companyId)
        if (!branch || !parent) return undefined
        const subOrg: Organization = { ...structuredClone(parent), id: crypto.randomUUID(), name: branch.name, parentId: parent.id, values: {} }
        setOrgs((list) => [...list, subOrg])
        setBranches((list) => list.map((b) => (b.id === id ? { ...b, companyId: subOrg.id } : b)))
        return subOrg
      },
      saveDevice: (device) => setDevices((list) => upsert(list, device)),
      deleteDevice: (id) => setDevices((list) => list.filter((d) => d.id !== id)),
      toggleDevice: (id) => setDevices((list) => list.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d))),
      syncDevice: (id) => {
        const at = now.toISOString()
        setDevices((list) =>
          list.map((d) => (d.id === id ? { ...d, lastSyncedAt: at, lastSyncStatus: SyncStatus.SUCCESS, consecutiveFailures: 0 } : d)),
        )
        setSyncLogs((list) => [
          {
            id: crypto.randomUUID(),
            deviceId: id,
            triggeredBy: SyncTrigger.MANUAL,
            startedAt: at,
            completedAt: at,
            recordCount: MANUAL_SYNC_RECORDS,
            status: SyncStatus.SUCCESS,
            errorMessage: null,
          },
          ...list,
        ])
      },
      addTown: (name) => {
        const town = { id: crypto.randomUUID(), name }
        setTowns((list) => [...list, town])
        return town
      },
      renameTown: (id, name) => {
        const old = towns.find((t) => t.id === id)?.name
        setTowns((list) => list.map((t) => (t.id === id ? { ...t, name } : t)))
        setBranches((list) => list.map((b) => (b.town === old ? { ...b, town: name } : b)))
      },
      deleteTown: (id) => setTowns((list) => list.filter((t) => t.id !== id)),
    }
  }, [orgs, branches, devices, syncLogs, towns])
}

export function useOrganizationStore(): OrganizationStore {
  const store = useContext(ORGANIZATION_STORE_CONTEXT)
  if (!store) throw new Error("useOrganizationStore must be used inside OrganizationStoreProvider")
  return store
}

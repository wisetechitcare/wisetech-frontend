import { useMemo, useState } from "react"
import { CalendarRange, CircleCheck, Fingerprint, History, MoreHorizontal, Pencil, PlugZap, Plus, Power, RefreshCw, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/ds/patterns/confirm-dialog"
import { DataTable, SortableHeader, type ColumnDef } from "@/ds/patterns/data-table"
import { EmptyState } from "@/ds/patterns/empty-state"
import { StatCard } from "@/ds/patterns/stat-card"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ds/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select"
import { BackfillDialog } from "./BackfillDialog"
import { DeviceFormDialog } from "./DeviceFormDialog"
import { DeviceHistorySheet } from "./DeviceHistorySheet"

import type { IBiometricDevice } from "@/models/biometric"
import { useOrganizationStore } from "@/storybook/screens/organization/hooks"
import {
  ALL_BRANCHES,
  CONNECTION_MODE_LABEL,
  DEVICE_HEALTH_META,
  DEVICE_HEALTH_ORDER,
  MANUAL_SYNC_RECORDS,
} from "@/storybook/screens/organization/constants/organization"
import { DeviceHealth, DeviceTableColumn, type OrgScope } from "@/storybook/screens/organization/types/organization"
import { formatDate, formatRelative } from "@/storybook/screens/organization/utils/format"
import { canBackfill, countNeedingAttention, deviceHealth } from "@/storybook/screens/organization/utils/organization"

const TEST_DELAY_MS = 900
const TABLE_MIN_WIDTH = 880

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

interface DeviceEditTarget {
  device?: IBiometricDevice
}

interface DevicesTabProps {
  scope: OrgScope
  branchFilter: string
  onBranchFilterChange: (branchId: string) => void
}

/** Every biometric device across the organization's branches, in one table with one health rule. */
export function DevicesTab({ scope, branchFilter, onBranchFilterChange }: DevicesTabProps) {
  const { now, syncDevice, toggleDevice, deleteDevice } = useOrganizationStore()
  const [editing, setEditing] = useState<DeviceEditTarget | null>(null)
  const [historyOf, setHistoryOf] = useState<IBiometricDevice | null>(null)
  const [backfillOf, setBackfillOf] = useState<IBiometricDevice | null>(null)
  const [deleting, setDeleting] = useState<IBiometricDevice | null>(null)

  const rows = branchFilter === ALL_BRANCHES ? scope.devices : scope.devices.filter((d) => d.branchId === branchFilter)
  const attention = countNeedingAttention(scope.devices, now)
  const healthy = scope.devices.filter((d) => deviceHealth(d, now) === DeviceHealth.HEALTHY).length
  const lastSync = scope.devices.map((d) => d.lastSyncedAt).filter((v): v is string => !!v).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1) ?? null
  const branchItems = [{ value: ALL_BRANCHES, label: "All branches" }, ...scope.branches.map((b) => ({ value: b.id, label: b.name }))]

  const columns = useMemo<ColumnDef<IBiometricDevice, unknown>[]>(() => {
    const healthOf = (d: IBiometricDevice) => deviceHealth(d, now)
    const branchName = (id: string) => scope.branches.find((b) => b.id === id)?.name ?? "—"
    const test = (d: IBiometricDevice) =>
      toast.promise(
        wait(TEST_DELAY_MS).then(() => {
          if (healthOf(d) === DeviceHealth.FAILING) throw new Error(d.deviceIp)
        }),
        {
          loading: `Testing ${d.name}…`,
          success: `${d.name} is reachable.`,
          error: `${d.name} did not respond on ${d.deviceIp}:${d.devicePort}.`,
        },
      )
    const sync = (d: IBiometricDevice) => {
      syncDevice(d.id)
      toast.success(`${d.name} synced — ${MANUAL_SYNC_RECORDS} punches imported.`)
    }
    const toggle = (d: IBiometricDevice) => {
      toggleDevice(d.id)
      toast.success(`${d.name} ${d.isActive ? "deactivated" : "activated"}.`)
    }

    return [
      {
        accessorKey: "name",
        meta: { label: "Device" },
        enableHiding: false,
        header: ({ column }) => <SortableHeader column={column} title="Device" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="tabular truncate text-xs text-muted-foreground">{row.original.serialNumber}</p>
          </div>
        ),
      },
      {
        id: DeviceTableColumn.BRANCH,
        accessorFn: (d) => branchName(d.branchId),
        meta: { label: "Branch" },
        header: ({ column }) => <SortableHeader column={column} title="Branch" />,
      },
      {
        id: DeviceTableColumn.ADDRESS,
        accessorFn: (d) => `${d.deviceIp}:${d.devicePort}`,
        meta: { label: "IP : Port" },
        header: "IP : Port",
        cell: ({ getValue }) => <span className="tabular">{String(getValue())}</span>,
      },
      {
        accessorKey: "connectionMode",
        meta: { label: "Mode" },
        header: "Mode",
        cell: ({ row }) => <Badge variant="neutral">{CONNECTION_MODE_LABEL[row.original.connectionMode]}</Badge>,
      },
      {
        id: DeviceTableColumn.HEALTH,
        accessorFn: (d) => DEVICE_HEALTH_ORDER.indexOf(healthOf(d)),
        meta: { label: "Health" },
        header: ({ column }) => <SortableHeader column={column} title="Health" />,
        cell: ({ row }) => {
          const health = healthOf(row.original)
          const meta = DEVICE_HEALTH_META[health]
          return (
            <Badge variant={meta.variant} dot>
              {health === DeviceHealth.FAILING ? `${meta.label} · ${row.original.consecutiveFailures}×` : meta.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: "lastSyncedAt",
        meta: { label: "Last sync" },
        header: ({ column }) => <SortableHeader column={column} title="Last sync" />,
        cell: ({ row }) => (
          <span title={row.original.lastSyncedAt ? formatDate(row.original.lastSyncedAt) : undefined}>{formatRelative(row.original.lastSyncedAt, now)}</span>
        ),
      },
      {
        id: DeviceTableColumn.ACTIONS,
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const d = row.original
          return (
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => test(d)} disabled={!d.isActive}>
                <PlugZap data-icon="inline-start" aria-hidden /> Test
              </Button>
              <Button size="sm" variant="ghost" onClick={() => sync(d)} disabled={!d.isActive}>
                <RefreshCw data-icon="inline-start" aria-hidden /> Sync
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`More actions for ${d.name}`} />}>
                  <MoreHorizontal aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setHistoryOf(d)}>
                    <History aria-hidden /> Sync history
                  </DropdownMenuItem>
                  {canBackfill(d) && (
                    <DropdownMenuItem onClick={() => setBackfillOf(d)}>
                      <CalendarRange aria-hidden /> Backfill past dates
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setEditing({ device: d })}>
                    <Pencil aria-hidden /> Edit device
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggle(d)}>
                    <Power aria-hidden /> {d.isActive ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(d)}>
                    <Trash2 aria-hidden /> Delete device
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]
  }, [scope.branches, now, syncDevice, toggleDevice])

  return (
    <div className="space-y-5 pt-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard size="sm" label="Devices" value={scope.devices.length} tone="brand" icon={<Fingerprint aria-hidden />} />
        <StatCard size="sm" label="Healthy" value={healthy} tone="success" icon={<CircleCheck aria-hidden />} />
        <StatCard
          size="sm"
          label="Need attention"
          value={attention}
          hint={attention ? "Failing or not syncing for a day" : "Nothing to fix"}
          tone={attention ? "warning" : "success"}
          icon={<TriangleAlert aria-hidden />}
        />
        <StatCard size="sm" label="Last sync" value={formatRelative(lastSync, now)} tone="info" icon={<RefreshCw aria-hidden />} />
      </div>

      <DataTable<IBiometricDevice>
        caption="Biometric devices"
        columns={columns}
        data={rows}
        getRowId={(d) => d.id}
        searchPlaceholder="Search device, serial or IP"
        initialSorting={[{ id: DeviceTableColumn.HEALTH, desc: false }]}
        minWidth={TABLE_MIN_WIDTH}
        filters={
          <Select items={branchItems} value={branchFilter} onValueChange={(v) => v && onBranchFilterChange(v as string)}>
            <SelectTrigger className="w-48" aria-label="Filter by branch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branchItems.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        toolbar={
          <Button onClick={() => setEditing({})} disabled={!scope.branches.length}>
            <Plus data-icon="inline-start" aria-hidden /> Add device
          </Button>
        }
        empty={
          <EmptyState
            icon={<Fingerprint />}
            title="No devices yet"
            description={scope.branches.length ? "Connect a biometric device so punches flow into attendance." : "Add a branch first; devices belong to a branch."}
          />
        }
      />

      {editing && (
        <DeviceFormDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          device={editing.device}
          branches={scope.branches}
          branchId={branchFilter === ALL_BRANCHES ? undefined : branchFilter}
        />
      )}
      <DeviceHistorySheet device={historyOf} onOpenChange={(open) => !open && setHistoryOf(null)} />
      {backfillOf && <BackfillDialog device={backfillOf} onOpenChange={(open) => !open && setBackfillOf(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        variant="delete"
        title={`Delete ${deleting?.name}?`}
        description="Punches already imported stay. New punches from this device stop arriving."
        confirmLabel="Delete device"
        onConfirm={() => {
          if (!deleting) return
          deleteDevice(deleting.id)
          toast.success(`${deleting.name} deleted.`)
        }}
      />
    </div>
  )
}

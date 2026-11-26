import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip'
import { EmptyState } from '@/ds/patterns/empty-state'
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table'
import { listPlatformTenants, type PlatformTenant } from '@services/platformTenants'
import { formatDate } from '@utils/dateFormats'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'
import { PlatformTenantCreateWizard } from './PlatformTenantCreateWizard'

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
}

function packsLabel(packs: unknown): string {
  if (!packs || typeof packs !== 'object') return 'All (legacy)'
  const p = packs as Record<string, boolean>
  const on = ['workforce', 'pay', 'psa', 'talent'].filter((k) => p[k])
  return on.length ? `Core + ${on.join(', ')}` : 'Core only'
}

export default function PlatformTenantsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = usePlatformSession()
  const isAdmin = user?.platformRole === 'ADMIN'
  const [rows, setRows] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      setRows(await listPlatformTenants())
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const st = location.state as { openCreateTenant?: boolean; createdRootOrgId?: string; resumed?: boolean } | null
    if (st?.openCreateTenant && isAdmin) {
      setCreateOpen(true)
      navigate('.', { replace: true, state: {} })
    }
    if (st?.createdRootOrgId) {
      toast.success(st.resumed ? 'Tenant provisioning resumed.' : 'Tenant created.')
      void refresh()
      navigate('.', { replace: true, state: {} })
    }
  }, [location.state, isAdmin, navigate, refresh])

  const columns = useMemo<ColumnDef<PlatformTenant>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { label: 'Tenant' },
        header: 'Tenant',
        size: 320,
        minSize: 200,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{row.original.name}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.ownerContactEmail || '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        meta: { label: 'Status', wrap: false },
        header: 'Status',
        size: 120,
        minSize: 110,
        cell: ({ row }) =>
          row.original.status === 'SUSPENDED' ? (
            <Badge variant="warning" dot>
              Suspended
            </Badge>
          ) : (
            <Badge variant="success" dot>
              Active
            </Badge>
          ),
      },
      {
        id: 'packs',
        meta: { label: 'Packs', wrap: false },
        header: 'Packs',
        size: 280,
        minSize: 180,
        cell: ({ row }) => {
          const label = packsLabel(row.original.packs)
          return (
            <Tooltip>
              <TooltipTrigger
                render={<Badge variant="neutral" tabIndex={0} className="max-w-full cursor-help truncate" />}
              >
                {label}
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        accessorKey: 'branchCount',
        meta: { label: 'Branches', wrap: false, exportType: 'number' },
        header: 'Branches',
        size: 104,
        minSize: 96,
        cell: ({ getValue }) => (
          <span className="block text-right tabular">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: 'employeeCount',
        meta: { label: 'People', wrap: false, exportType: 'number' },
        header: 'People',
        size: 104,
        minSize: 96,
        cell: ({ getValue }) => (
          <span className="block text-right tabular">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        meta: { label: 'Created', wrap: false },
        header: 'Created',
        size: 124,
        minSize: 118,
        cell: ({ getValue }) => (
          <span className="block text-right tabular text-muted-foreground">
            {formatDate(String(getValue()))}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <PlatformShell
      title="Tenants"
      description="Root organizations (customer tenants). Sub-orgs stay inside each tenant's own console."
      actions={
        isAdmin ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden /> Create Tenant
          </Button>
        ) : null
      }
    >
      {error ? (
        <EmptyState
          variant="error"
          icon={<Building2 aria-hidden />}
          title="Could Not Load Tenants"
          description={error}
          action={
            <Button size="sm" variant="outline" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {!error && !loading && rows.length === 0 ? (
        <EmptyState
          icon={<Building2 aria-hidden />}
          title="No Tenants Yet"
          description="No root organizations found. If WISETECH already exists in the app, restart the API and refresh — it should appear here as a customer tenant."
          action={
            isAdmin ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden /> Create Tenant
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!error && (loading || rows.length > 0) ? (
        <DataTable
          caption="Customer Tenants"
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search tenants"
          rowLabel={(r) => `Open ${r.name}`}
          onRowClick={(r) => navigate(`/platform/tenants/${r.id}`)}
          onRetry={() => void refresh()}
        />
      ) : null}

      {isAdmin ? (
        <PlatformTenantCreateWizard
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => {
            void refresh()
          }}
        />
      ) : null}
    </PlatformShell>
  )
}

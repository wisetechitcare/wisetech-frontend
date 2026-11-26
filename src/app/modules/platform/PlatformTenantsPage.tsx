import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { EmptyState } from '@/ds/patterns/empty-state'
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table'
import { listPlatformTenants, type PlatformTenant } from '@services/platformTenants'
import { formatDate } from '@utils/dateFormats'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'

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
  const { user } = usePlatformSession()
  const isAdmin = user?.platformRole === 'ADMIN'
  const [rows, setRows] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const columns = useMemo<ColumnDef<PlatformTenant>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { label: 'Tenant' },
        header: 'Tenant',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{row.original.name}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.ownerContactEmail || '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        meta: { label: 'Status' },
        header: 'Status',
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
        meta: { label: 'Packs' },
        header: 'Packs',
        cell: ({ row }) => <Badge variant="neutral">{packsLabel(row.original.packs)}</Badge>,
      },
      {
        accessorKey: 'branchCount',
        meta: { label: 'Branches' },
        header: 'Branches',
        cell: ({ getValue }) => <span className="tabular">{String(getValue())}</span>,
      },
      {
        accessorKey: 'employeeCount',
        meta: { label: 'People' },
        header: 'People',
        cell: ({ getValue }) => <span className="tabular">{String(getValue())}</span>,
      },
      {
        accessorKey: 'createdAt',
        meta: { label: 'Created' },
        header: 'Created',
        cell: ({ getValue }) => (
          <span className="tabular text-muted-foreground">{formatDate(String(getValue()))}</span>
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
          <Button render={<Link to="/platform/tenants/new" />}>
            <Plus aria-hidden /> Create Tenant
          </Button>
        ) : null
      }
    >
      {error ? (
        <Alert variant="danger">
          <AlertTitle>Could Not Load Tenants</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon={<Building2 aria-hidden />}
          title="No Tenants Yet"
          description="No root organizations found. If WISETECH already exists in the app, restart the API and refresh — it should appear here as a customer tenant."
          action={
            isAdmin ? (
              <Button size="sm" render={<Link to="/platform/tenants/new" />}>
                <Plus aria-hidden /> Create Tenant
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          caption="Customer Tenants"
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search tenants"
          rowLabel={(r) => `Open ${r.name}`}
          onRowClick={(r) => navigate(`/platform/tenants/${r.id}`)}
        />
      )}
    </PlatformShell>
  )
}

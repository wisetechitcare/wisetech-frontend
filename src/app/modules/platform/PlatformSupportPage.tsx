import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Headset, Plus, ShieldAlert } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { Checkbox } from '@/ds/ui/checkbox'
import { Label } from '@/ds/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ds/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import { EmptyState } from '@/ds/patterns/empty-state'
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table'
import { ConfirmDialog } from '@/ds/patterns/confirm-dialog'
import { listPlatformTenants, type PlatformTenant } from '@services/platformTenants'
import {
  activatePlatformSupportSession,
  createPlatformSupportSession,
  endPlatformSupportSession,
  listPlatformSupportSessions,
  listSupportViewEmployees,
  startSupportViewAs,
  type PlatformSupportSession,
  type SupportViewEmployee,
} from '@services/platformSupport'
import { PlatformShell } from './PlatformShell'

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  ACTIVE: 'success',
  REJECTED: 'danger',
  ENDED: 'neutral',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function PlatformSupportPage() {
  const [rows, setRows] = useState<PlatformSupportSession[]>([])
  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [rootOrganizationId, setRootOrganizationId] = useState('')
  const [reason, setReason] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [breakGlass, setBreakGlass] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [activateTarget, setActivateTarget] = useState<PlatformSupportSession | null>(null)
  const [activateCode, setActivateCode] = useState('')
  const [activateBusy, setActivateBusy] = useState(false)

  const [viewAsTarget, setViewAsTarget] = useState<PlatformSupportSession | null>(null)
  const [employees, setEmployees] = useState<SupportViewEmployee[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [viewAsBusy, setViewAsBusy] = useState(false)

  const [endTarget, setEndTarget] = useState<PlatformSupportSession | null>(null)

  const tenantName = useMemo(() => {
    const map = new Map(tenants.map((t) => [t.id, t.name]))
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [tenants])

  const tenantItems = useMemo(
    () => tenants.map((t) => ({ value: t.id, label: t.name })),
    [tenants],
  )

  const employeeItems = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.name}${e.email ? ` · ${e.email}` : ''}` })),
    [employees],
  )

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [sessions, tenantRows] = await Promise.all([
        listPlatformSupportSessions(),
        listPlatformTenants(),
      ])
      setRows(sessions)
      setTenants(tenantRows)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateBusy(true)
    try {
      await createPlatformSupportSession({
        rootOrganizationId,
        reason: reason.trim(),
        durationMinutes,
        breakGlass,
        totpCode: breakGlass ? totpCode.trim() : undefined,
      })
      toast.success(breakGlass ? 'Break-glass session started' : 'Support request submitted')
      setCreateOpen(false)
      setReason('')
      setTotpCode('')
      setBreakGlass(false)
      await refresh()
    } catch (err) {
      setCreateError(errMessage(err))
    } finally {
      setCreateBusy(false)
    }
  }

  async function onActivate() {
    if (!activateTarget) return
    setActivateBusy(true)
    try {
      await activatePlatformSupportSession(activateTarget.id, activateCode.trim())
      toast.success('Session activated')
      setActivateTarget(null)
      setActivateCode('')
      await refresh()
    } catch (err) {
      toast.error(errMessage(err))
      throw err
    } finally {
      setActivateBusy(false)
    }
  }

  async function openViewAs(session: PlatformSupportSession) {
    setViewAsTarget(session)
    setEmployeeId('')
    setViewAsBusy(true)
    try {
      setEmployees(await listSupportViewEmployees(session.id))
    } catch (err) {
      toast.error(errMessage(err))
      setViewAsTarget(null)
    } finally {
      setViewAsBusy(false)
    }
  }

  async function onViewAs() {
    if (!viewAsTarget || !employeeId) return
    setViewAsBusy(true)
    try {
      const { enterPath } = await startSupportViewAs(viewAsTarget.id, employeeId)
      const { bootstrapSupportViewIfNeeded } = await import('./bootstrapSupportView')
      await bootstrapSupportViewIfNeeded()
      toast.success('Opening tenant app as selected person')
      window.location.assign(enterPath || '/dashboard')
    } catch (err) {
      toast.error(errMessage(err))
    } finally {
      setViewAsBusy(false)
    }
  }

  const columns = useMemo<ColumnDef<PlatformSupportSession>[]>(
    () => [
      {
        id: 'tenant',
        meta: { label: 'Tenant' },
        header: 'Tenant',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">
              {tenantName(row.original.rootOrganizationId)}
            </div>
            <div className="truncate text-xs text-muted-foreground">{row.original.reason}</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        meta: { label: 'Status' },
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Badge variant={STATUS_VARIANT[row.original.status] ?? 'neutral'} dot>
              {row.original.status}
            </Badge>
            {row.original.breakGlass ? (
              <Badge variant="danger" dot>
                Break-glass
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'durationMinutes',
        meta: { label: 'Duration' },
        header: 'Duration',
        cell: ({ getValue }) => <span className="tabular">{String(getValue())} min</span>,
      },
      {
        accessorKey: 'expiresAt',
        meta: { label: 'Expires' },
        header: 'Expires',
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">{formatWhen(row.original.expiresAt)}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        meta: { label: 'Created' },
        header: 'Created',
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">{formatWhen(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        header: 'Actions',
        cell: ({ row }) => {
          const s = row.original
          return (
            <div className="flex flex-wrap gap-1">
              {s.status === 'APPROVED' ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setActivateTarget(s)}>
                  Activate
                </Button>
              ) : null}
              {s.status === 'ACTIVE' ? (
                <>
                  <Button type="button" size="sm" onClick={() => void openViewAs(s)}>
                    View As
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => setEndTarget(s)}>
                    End
                  </Button>
                </>
              ) : null}
              {s.status === 'PENDING' ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setEndTarget(s)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    [tenantName],
  )

  return (
    <PlatformShell
      title="Support"
      description="Request or break-glass into a tenant (read-only). Tenant Admins approve normal requests."
      actions={
        <Button
          type="button"
          onClick={() => {
            setCreateOpen(true)
            setCreateError(null)
            setRootOrganizationId(tenants[0]?.id ?? '')
          }}
        >
          <Plus aria-hidden /> New Session
        </Button>
      }
    >
      {error ? (
        <Alert variant="danger">
          <AlertTitle>Could Not Load Sessions</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon={<Headset aria-hidden />}
          title="No Support Sessions"
          description="Request access to a tenant. Admins approve, then you activate with MFA and view as an employee."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden /> New Session
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Support Sessions"
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search sessions"
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Support Session</DialogTitle>
            <DialogDescription>
              Normal requests need tenant Admin approval (max 4h). Break-glass starts now (max 1h) and alerts Admins.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={onCreate} noValidate>
            {createError ? (
              <Alert variant="danger">
                <AlertTitle>Could Not Create</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            ) : null}
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel id="support-tenant-label">Tenant</FieldLabel>
                <Select
                  items={tenantItems}
                  value={rootOrganizationId}
                  onValueChange={(v) => setRootOrganizationId(String(v ?? ''))}
                >
                  <SelectTrigger className="w-full" aria-labelledby="support-tenant-label">
                    <SelectValue placeholder="Choose tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantItems.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="support-reason">Reason</FieldLabel>
                <Textarea
                  id="support-reason"
                  required
                  minLength={10}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="What are you investigating?"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="support-duration">Duration (minutes)</FieldLabel>
                <Input
                  id="support-duration"
                  type="number"
                  min={15}
                  max={breakGlass ? 60 : 240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 15)}
                />
              </Field>
              <Label className="flex items-start gap-3 font-normal">
                <Checkbox
                  checked={breakGlass}
                  onCheckedChange={(v) => {
                    const on = v === true
                    setBreakGlass(on)
                    if (on && durationMinutes > 60) setDurationMinutes(60)
                  }}
                />
                <span>
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <ShieldAlert className="size-4" aria-hidden /> Break-glass
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Starts immediately after MFA. Max 1 hour. Tenant Admins are alerted.
                  </span>
                </span>
              </Label>
              {breakGlass ? (
                <Field>
                  <FieldLabel htmlFor="support-totp">Authenticator Code</FieldLabel>
                  <Input
                    id="support-totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    required
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                  />
                </Field>
              ) : null}
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={createBusy} />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={createBusy || !rootOrganizationId}>
                {createBusy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
                {breakGlass ? 'Start Break-Glass' : 'Request Access'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(activateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setActivateTarget(null)
            setActivateCode('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate Session</DialogTitle>
            <DialogDescription>Enter a fresh authenticator code to start the approved session.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="activate-totp">Authenticator Code</FieldLabel>
            <Input
              id="activate-totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={activateCode}
              onChange={(e) => setActivateCode(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={activateBusy} />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              disabled={activateBusy || activateCode.trim().length !== 6}
              onClick={() => void onActivate()}
            >
              {activateBusy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewAsTarget)}
        onOpenChange={(open) => {
          if (!open) setViewAsTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>View As</DialogTitle>
            <DialogDescription>
              Opens the tenant app read-only as the selected person. Non-GET APIs are refused.
            </DialogDescription>
          </DialogHeader>
          {viewAsBusy && employees.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" aria-hidden /> Loading people…
            </div>
          ) : (
            <Field>
              <FieldLabel id="view-as-emp-label">Employee</FieldLabel>
              <Select items={employeeItems} value={employeeId} onValueChange={(v) => setEmployeeId(String(v ?? ''))}>
                <SelectTrigger className="w-full" aria-labelledby="view-as-emp-label">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeeItems.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={viewAsBusy} />}>
              Cancel
            </DialogClose>
            <Button type="button" disabled={viewAsBusy || !employeeId} onClick={() => void onViewAs()}>
              {viewAsBusy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
              Enter Tenant App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(endTarget)}
        onOpenChange={(open) => {
          if (!open) setEndTarget(null)
        }}
        variant="warning"
        danger
        title="End support session?"
        description="View-as access stops immediately. You can request again later."
        confirmLabel="End session"
        onConfirm={async () => {
          if (!endTarget) return
          await endPlatformSupportSession(endTarget.id)
          toast.success('Session ended')
          setEndTarget(null)
          await refresh()
        }}
      />
    </PlatformShell>
  )
}

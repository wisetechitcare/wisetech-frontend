import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Headset, MoreHorizontal, Plus, ShieldAlert } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { NumberField } from '@/ds/ui/number-field'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { Checkbox } from '@/ds/ui/checkbox'
import { Label } from '@/ds/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ds/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip'
import { EmptyState } from '@/ds/patterns/empty-state'
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table'
import { ConfirmDialog } from '@/ds/patterns/confirm-dialog'
import { FormDialog } from '@/ds/patterns/form-dialog'
import { formatDateTime } from '@utils/dateFormats'
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
import { fetchPlatformPolicy, type PlatformSettingsPolicy } from '@services/platformSettings'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'
import { tenantAppHref } from './platformHost'
import { platformApiError } from './platformApiError'
import { bootstrapSupportViewIfNeeded } from './bootstrapSupportView'

const FALLBACK_POLICY: PlatformSettingsPolicy = {
  operatorMfaRequired: true,
  supportNormalMaxMinutes: 240,
  supportBreakGlassMaxMinutes: 60,
  supportMinMinutes: 15,
  supportReasonMinLength: 10,
  packWritesPlatformAdminOnly: true,
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

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  ENDED: 'Ended',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

function formatWhen(iso: string | null): string {
  return formatDateTime(iso)
}

export default function PlatformSupportPage() {
  const { user } = usePlatformSession()
  const canRequestWrite = user?.platformRole === 'ADMIN' || user?.platformRole === 'DEVELOPER'

  const [rows, setRows] = useState<PlatformSupportSession[]>([])
  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [policy, setPolicy] = useState<PlatformSettingsPolicy>(FALLBACK_POLICY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [rootOrganizationId, setRootOrganizationId] = useState('')
  const [reason, setReason] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [breakGlass, setBreakGlass] = useState(false)
  const [readWrite, setReadWrite] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const durationMax = breakGlass ? policy.supportBreakGlassMaxMinutes : policy.supportNormalMaxMinutes
  const durationMin = policy.supportMinMinutes ?? 15
  const reasonMin = policy.supportReasonMinLength ?? 10

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
      const [sessions, tenantRows, policyRow] = await Promise.all([
        listPlatformSupportSessions(),
        listPlatformTenants(),
        fetchPlatformPolicy().catch(() => FALLBACK_POLICY),
      ])
      setRows(sessions)
      setTenants(tenantRows)
      setPolicy(policyRow)
      setDurationMinutes((d) => {
        const max = policyRow.supportNormalMaxMinutes
        const min = policyRow.supportMinMinutes ?? 15
        return Math.min(max, Math.max(min, d))
      })
    } catch (err) {
      setError(platformApiError(err))
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
        accessMode: canRequestWrite && readWrite ? 'READ_WRITE' : 'READ',
        totpCode: breakGlass ? totpCode.trim() : undefined,
      })
      toast.success(breakGlass ? 'Break-glass session started' : 'Support request submitted')
      setCreateOpen(false)
      setReason('')
      setTotpCode('')
      setBreakGlass(false)
      setReadWrite(false)
      await refresh()
    } catch (err) {
      setCreateError(platformApiError(err))
    } finally {
      setCreateBusy(false)
    }
  }

  async function onActivate(e: FormEvent) {
    e.preventDefault()
    if (!activateTarget) return
    setActivateBusy(true)
    try {
      await activatePlatformSupportSession(activateTarget.id, activateCode.trim())
      toast.success('Session activated')
      setActivateTarget(null)
      setActivateCode('')
      await refresh()
    } catch (err) {
      toast.error(platformApiError(err))
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
      toast.error(platformApiError(err))
      setViewAsTarget(null)
    } finally {
      setViewAsBusy(false)
    }
  }

  async function onViewAs(e: FormEvent) {
    e.preventDefault()
    if (!viewAsTarget || !employeeId) return
    setViewAsBusy(true)
    try {
      const { enterPath } = await startSupportViewAs(viewAsTarget.id, employeeId)
      await bootstrapSupportViewIfNeeded()
      toast.success('Opening tenant app as selected person')
      const target =
        enterPath && /^https?:\/\//i.test(enterPath) ? enterPath : tenantAppHref(enterPath || '/dashboard')
      window.location.assign(target)
    } catch (err) {
      toast.error(platformApiError(err))
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
        size: 260,
        minSize: 180,
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
        meta: { label: 'Status', wrap: false },
        header: 'Status',
        size: 220,
        minSize: 180,
        cell: ({ row }) => (
          <div className="flex flex-nowrap items-center gap-1">
            <Badge variant={STATUS_VARIANT[row.original.status] ?? 'neutral'} dot>
              {STATUS_LABEL[row.original.status] ?? row.original.status}
            </Badge>
            {row.original.breakGlass ? (
              <Badge variant="danger" dot>
                Break-glass
              </Badge>
            ) : null}
            {row.original.accessMode === 'READ_WRITE' ? (
              <Badge variant="warning" dot>
                Read-write
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'durationMinutes',
        meta: { label: 'Duration', wrap: false, exportType: 'number' },
        header: 'Duration',
        size: 100,
        minSize: 96,
        cell: ({ getValue }) => `${String(getValue())} min`,
      },
      {
        accessorKey: 'expiresAt',
        meta: { label: 'Expires', wrap: false },
        header: 'Expires',
        size: 176,
        minSize: 168,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatWhen(row.original.expiresAt)}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        meta: { label: 'Created', wrap: false },
        header: 'Created',
        size: 176,
        minSize: 168,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatWhen(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        meta: { wrap: false, pin: 'end' },
        header: 'Actions',
        size: 64,
        minSize: 56,
        cell: ({ row }) => {
          const s = row.original
          const hasActions =
            s.status === 'APPROVED' || s.status === 'ACTIVE' || s.status === 'PENDING'
          if (!hasActions) return null
          const label = `Actions for ${tenantName(s.rootOrganizationId)}`
          return (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label={label} />}
                    />
                  }
                >
                  <MoreHorizontal aria-hidden />
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {s.status === 'APPROVED' ? (
                  <DropdownMenuItem onClick={() => setActivateTarget(s)}>Activate</DropdownMenuItem>
                ) : null}
                {s.status === 'ACTIVE' ? (
                  <>
                    <DropdownMenuItem onClick={() => void openViewAs(s)}>View As</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setEndTarget(s)}>
                      End Session
                    </DropdownMenuItem>
                  </>
                ) : null}
                {s.status === 'PENDING' ? (
                  <DropdownMenuItem onClick={() => setEndTarget(s)}>Cancel Request</DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [tenantName],
  )

  const openCreate = () => {
    setCreateOpen(true)
    setCreateError(null)
    setRootOrganizationId(tenants[0]?.id ?? '')
  }

  return (
    <PlatformShell
      title="Support"
      description="Request or break-glass into a tenant. Default is read-only; ADMIN/DEVELOPER can request read-write."
      actions={
        <Button type="button" onClick={openCreate}>
          <Plus aria-hidden /> New Session
        </Button>
      }
    >
      {error ? (
        <EmptyState
          variant="error"
          icon={<Headset aria-hidden />}
          title="Could Not Load Sessions"
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
          icon={<Headset aria-hidden />}
          title="No Support Sessions"
          description="Request access to a tenant. Admins approve, then you activate with MFA and view as an employee."
        />
      ) : null}

      {!error && (loading || rows.length > 0) ? (
        <DataTable
          caption="Support Sessions"
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search sessions"
          onRetry={() => void refresh()}
        />
      ) : null}

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Support Session"
        description={`Normal requests need tenant Admin approval (max ${policy.supportNormalMaxMinutes} min). Break-glass starts now (max ${policy.supportBreakGlassMaxMinutes} min) and alerts Admins.`}
        icon={<Headset aria-hidden />}
        tone="brand"
        formId="support-create-form"
        submitLabel={breakGlass ? 'Start Break-Glass' : 'Request Access'}
        submitVariant={breakGlass ? 'destructive' : 'default'}
        submitting={createBusy}
        submitDisabled={!rootOrganizationId || reason.trim().length < reasonMin}
        dirty={Boolean(rootOrganizationId || reason || totpCode)}
      >
        <form id="support-create-form" className="grid gap-4 p-6" onSubmit={onCreate} noValidate>
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
                minLength={reasonMin}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`At least ${reasonMin} characters`}
              />
            </Field>
            <NumberField
              label="Duration (minutes)"
              value={durationMinutes}
              minValue={durationMin}
              maxValue={durationMax}
              onChange={(v) => setDurationMinutes(v ?? durationMin)}
              description={`Between ${durationMin} and ${durationMax} (from Settings policy)`}
            />
            <Label className="flex items-start gap-3 font-normal">
              <Checkbox
                checked={breakGlass}
                onCheckedChange={(v) => {
                  const on = v === true
                  setBreakGlass(on)
                  const max = on ? policy.supportBreakGlassMaxMinutes : policy.supportNormalMaxMinutes
                  if (durationMinutes > max) setDurationMinutes(max)
                }}
              />
              <span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <ShieldAlert className="size-4" aria-hidden /> Break-glass
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Starts immediately after MFA. Max {policy.supportBreakGlassMaxMinutes} minutes. Tenant Admins are
                  alerted.
                </span>
              </span>
            </Label>
            {canRequestWrite ? (
              <Label className="flex items-start gap-3 font-normal">
                <Checkbox checked={readWrite} onCheckedChange={(v) => setReadWrite(v === true)} />
                <span>
                  <span className="font-medium text-foreground">Read-write (S5)</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Allows non-GET APIs. Passwords, MFA, roles, PIN areas, and approvals stay blocked.
                  </span>
                </span>
              </Label>
            ) : null}
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
        </form>
      </FormDialog>

      <FormDialog
        open={Boolean(activateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setActivateTarget(null)
            setActivateCode('')
          }
        }}
        title="Activate Session"
        description="Enter a fresh authenticator code to start the approved session."
        icon={<Headset aria-hidden />}
        formId="support-activate-form"
        submitLabel="Activate"
        submitting={activateBusy}
        submitDisabled={activateCode.trim().length !== 6}
        dirty={Boolean(activateCode)}
      >
        <form id="support-activate-form" className="grid gap-4 p-6" onSubmit={onActivate} noValidate>
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
        </form>
      </FormDialog>

      <FormDialog
        open={Boolean(viewAsTarget)}
        onOpenChange={(open) => {
          if (!open) setViewAsTarget(null)
        }}
        title="View As"
        description="Opens the tenant app as the selected person. Access mode follows the session (READ or READ_WRITE)."
        icon={<Headset aria-hidden />}
        formId="support-view-as-form"
        submitLabel="Enter Tenant App"
        submitting={viewAsBusy}
        submitDisabled={!employeeId || (viewAsBusy && employees.length === 0)}
        dirty={Boolean(employeeId)}
      >
        <form id="support-view-as-form" className="grid gap-4 p-6" onSubmit={onViewAs} noValidate>
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
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(endTarget)}
        onOpenChange={(open) => {
          if (!open) setEndTarget(null)
        }}
        variant="warning"
        danger
        title={endTarget?.status === 'PENDING' ? 'Cancel this request?' : 'End support session?'}
        description={
          endTarget?.status === 'PENDING'
            ? 'The pending request is cancelled. You can create a new one later.'
            : 'View-as access stops immediately. You can request again later.'
        }
        confirmLabel={endTarget?.status === 'PENDING' ? 'Cancel request' : 'End session'}
        onConfirm={async () => {
          if (!endTarget) return
          await endPlatformSupportSession(endTarget.id)
          toast.success(endTarget.status === 'PENDING' ? 'Request cancelled' : 'Session ended')
          setEndTarget(null)
          await refresh()
        }}
      />
    </PlatformShell>
  )
}
